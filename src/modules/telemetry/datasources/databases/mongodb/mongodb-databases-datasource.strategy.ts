import { Collection, Db, MongoClient } from 'mongodb';
import path from 'path';
import { Assessment } from '../../../../../core/assessment/assessment-core';
import { AbstractInstrumentationBundle } from '../../../../../core/instrumentation/instrumentation-core';
import { DatabaseTelemetryDataSource } from '../databases-datasource.strategy';

/**
 * MongoDB-based telemetry data source.
 * Handles telemetry data storage and retrieval using MongoDB.
 */
export class MongoDBTelemetryDataSource extends DatabaseTelemetryDataSource {
    private client!: MongoClient;
    private db!: Db;
    private collection!: Collection;

    /**
     * Creates a connection to the database using a MongoDB client and initializes the root collection.
     * The database's metadata is provided in the storage endpoint, encapsulated in the data source's configuration.
     */
    protected async createConnection(): Promise<void> {
        this.client = new MongoClient(this.config.storageEndpoint.uri);
        await this.client.connect();
        this.db = this.client.db(this.config.storageEndpoint.name);
        this.collection = this.db.collection('instrumentedApplications');
        console.log(`MongoDB Telemetry DataSource: Connected to MongoDB at ${this.config.storageEndpoint.uri}`);
    }

    /**
     * Closes the connection to the MongoDB database.
     */
    protected async closeConnection(): Promise<void> {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB Telemetry DataSource: Disconnected from MongoDB.');
        }
    }

    /**
     * Retrieves the document corresponding to a specific application by its normalized name.
     * If the document does not exist, it creates a new one.
     * @param normalizedAppName - The normalized name of the target application.
     * @returns The MongoDB document corresponding to the target application's normalized name.
     */
    private async getApplicationDocument(normalizedAppName: string) {
        let appDoc = await this.collection.findOne({ normalizedAppName });
        if (!appDoc) {
            // Create the document for the application if it doesn't exist
            await this.collection.insertOne({ normalizedAppName, bundles: [] });
            appDoc = await this.collection.findOne({ normalizedAppName });
        }
        return appDoc;
    }

    /**
     * Reads telemetry data associated with a specific application and its instrumentation bundle.
     * @param filter - Metadata about the application and its instrumentation bundle.
     * @returns An array of telemetry data associated with the target application's bundle.
     */
    async read(filter: any = {}): Promise<any | any[]> {
        let telemetryData: any[] = [];
        if (filter) {
            const bundleName = path.basename(filter.appInstrumentationMetadata.bundleName);
            const normalizedAppName = AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(bundleName);

            // Read failures propagate: a failed read is not an empty telemetry set
            const appDoc = await this.getApplicationDocument(normalizedAppName);

            // Check if the bundle already exists (a bundle without stored telemetry yields an empty set)
            const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);
            if (existingBundle) {
                console.log(`MongoDB Telemetry DataSource: Read telemetry data in MongoDB for bundle ${bundleName}.`);
                return existingBundle.telemetryData ?? [];
            }
        }

        return telemetryData;
    }

    /**
     * Stores a single telemetry data item in the database.
     * If the instrumentation bundle already exists, it appends the new data; otherwise, it creates a new bundle.
     * @param data - The telemetry data to store.
     */
    async store(data: any): Promise<void> {
        const normalizedAppName: string = data.attributes['app.metadata.normalizedName'];
        const bundleName: string = data.attributes['app.metadata.instrumentationBundleName'];

        try {
            const appDoc = await this.getApplicationDocument(normalizedAppName);

            // Check if the bundle already exists
            const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);
            if (existingBundle) {
                // Append telemetry data to the existing bundle
                await this.collection.updateOne(
                    { normalizedAppName, "bundles.name": bundleName },
                    { $push: { "bundles.$.telemetryData": data } }
                );
            }
            else {
                // Create a new bundle with the telemetry data
                await this.collection.updateOne(
                    { normalizedAppName },
                    {
                        $addToSet: {
                            bundles: {
                                name: bundleName,
                                telemetryData: [data]
                            }
                        }
                    }
                );
            }

            console.log(`MongoDB Telemetry DataSource: Stored telemetry data in MongoDB for bundle ${bundleName}.`);

        } catch (error) {
            console.error("MongoDB Telemetry DataSource: Failed to store telemetry data item in MongoDB:", error);
        }

        await this.collection.insertOne(data);
    }

    /**
     * Stores multiple telemetry data items in the database.
     * Items are grouped by application and instrumentation bundle (from their own attributes), so that a batch
     * containing telemetry of several applications or bundles is filed correctly. Storage errors propagate.
     * @param data - An array of telemetry data to store.
     */
    async storeAll(data: any[]): Promise<void> {
        if (!data.length || data.length <= 0) return;

        const groups = new Map<string, { normalizedAppName: string, bundleName: string, items: any[] }>();
        for (const item of data) {
            const normalizedAppName: string = item?.attributes?.['app.metadata.normalizedName'];
            const bundleName: string = item?.attributes?.['app.metadata.instrumentationBundleName'];
            const key = JSON.stringify([normalizedAppName, bundleName]);
            if (!groups.has(key)) groups.set(key, { normalizedAppName, bundleName, items: [] });
            groups.get(key)!.items.push(item);
        }

        for (const { normalizedAppName, bundleName, items } of groups.values()) {
            const appDoc = await this.getApplicationDocument(normalizedAppName);

            // Check if the bundle already exists
            const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);

            if (existingBundle) {
                // Append multiple telemetry data items to the existing bundle
                await this.collection.updateOne(
                    { normalizedAppName, "bundles.name": bundleName },
                    { $push: { "bundles.$.telemetryData": { $each: items } } as any }
                );
            }
            else {
                // Create a new bundle with multiple telemetry data items
                await this.collection.updateOne(
                    { normalizedAppName },
                    { $addToSet: { bundles: { name: bundleName, telemetryData: items } } }
                );
            }
            console.log(`MongoDB Telemetry DataSource: Stored ${items.length} telemetry data items in MongoDB for bundle ${bundleName}.`);
        }
    }

    /**
     * Stores quality assessments in the database for a specific instrumentation bundle.
     * @param assessments - An array of assessment objects to store.
     * @param filter - Metadata about the application and its instrumentation bundle.
     */
    async storeAssessments(assessments: Assessment[], filter?: any): Promise<void> {
        if (filter && filter.appInstrumentationMetadata) {
            const assessmentDocs = assessments.map(assessment => ({
                goal: {
                    name: assessment.goal.name,
                    description: assessment.goal.description,
                    weight: assessment.goal.weight,
                    metrics: Array.from(assessment.goal.metrics).map(metric => ({
                        name: metric.name,
                        acronym: metric.acronym,
                        description: metric.description,
                        unit: metric.unit
                    })),
                },
                globalScore: assessment.globalScore,
                timestamp: assessment.timestamp,
                status: assessment.status,
                cycle: assessment.cycle,
                bundle: path.basename(filter.appInstrumentationMetadata.bundleName),
                telemetryCount: assessment.telemetryCount,
                normalization: assessment.normalization,
                details: assessment.assessments
            }));

            const bundleName = path.basename(filter.appInstrumentationMetadata.bundleName);
            const normalizedAppName = AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(bundleName);

            // Storage errors propagate to the assessment cycle (which then reports a failed cycle)
            const appDoc = await this.getApplicationDocument(normalizedAppName);

            // Check if the bundle already exists
            const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);
            if (!existingBundle) {
                throw new Error(`MongoDB Telemetry DataSource: no telemetry bundle ${bundleName} to store assessments in`);
            }

            // Append the assessment records of the cycle to the bundle
            await this.collection.updateOne(
                { normalizedAppName, "bundles.name": bundleName },
                { $push: { "bundles.$.assessments": { $each: assessmentDocs } } as any }
            );
            console.log(`MongoDB Telemetry DataSource: New assessments stored for bundle ${bundleName}`);
        }
    }
}
