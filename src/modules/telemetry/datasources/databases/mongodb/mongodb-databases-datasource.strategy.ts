import { Collection, Db, MongoClient } from 'mongodb';
import path from 'path';
import { AbstractInstrumentationBundle } from '../../../../../core/instrumentation/instrumentation-core';
import { DatabaseTelemetryDataSource } from '../databases-datasource.strategy';
import { Assessment } from '../../../../../core/assessment/assessment-core';

export class MongoDBTelemetryDataSource extends DatabaseTelemetryDataSource {
    private client!: MongoClient;
    private db!: Db;
    private collection!: Collection;

    protected async createConnection(): Promise<void> {
        this.client = new MongoClient(this.config.storageEndpoint.uri);
        await this.client.connect();
        this.db = this.client.db(this.config.storageEndpoint.name);
        this.collection = this.db.collection('instrumentedApplications');
        console.log(`MongoDB Telemetry DataSource: Connected to MongoDB at ${this.config.storageEndpoint.uri}`);
    }

    protected async closeConnection(): Promise<void> {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB Telemetry DataSource: Disconnected from MongoDB.');
        }
    }

    private async getApplicationDocument(normalizedAppName: string) {
        let appDoc = await this.collection.findOne({ normalizedAppName });
        if (!appDoc) {
            // Create the document for the application if it doesn't exist
            await this.collection.insertOne({ normalizedAppName, bundles: [] });
            appDoc = await this.collection.findOne({ normalizedAppName });
        }
        return appDoc;
    }

    async read(filter: any = {}): Promise<any | any[]> {
        let telemetryData: any[] = [];
        if (filter) {
            const bundleName = path.basename(filter.appInstrumentationMetadata.bundleName);
            const normalizedAppName = AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(bundleName);

            try {
                const appDoc = await this.getApplicationDocument(normalizedAppName);

                // console.log(`MongoDB Telemetry Data Source: Read Application Document: ${JSON.stringify(appDoc, null, 2)}`);

                // Check if the bundle already exists
                const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);
                if (existingBundle) {
                    // console.log(`MongoDB Telemetry Data Source: Read Application Bundle Document: ${JSON.stringify(existingBundle, null, 2)}}`);
                    let telemetryData = existingBundle.telemetryData;

                    console.log(`MongoDB Telemetry DataSource: Read telemetry data in MongoDB for bundle ${bundleName}.`);
                    // console.log(`MongoDB Telemetry Data Source: Read telemetry data: ${telemetryData}`);
                    return telemetryData;
                }
            } catch (error) {
                console.error("MongoDB Telemetry DataSource: Failed to read telemetry data:", error);
            }
        }

        return telemetryData;
    }

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

    async storeAll(data: any[]): Promise<void> {
        if (!data.length || data.length <= 0) return;

        const normalizedAppName: string = data[0].attributes['app.metadata.normalizedName'];
        const bundleName: string = data[0].attributes['app.metadata.instrumentationBundleName'];

        try {
            const appDoc = await this.getApplicationDocument(normalizedAppName);

            // Check if the bundle already exists
            const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);

            if (existingBundle) {
                // Append multiple telemetry data items to the existing bundle
                await this.collection.updateOne(
                    { normalizedAppName, "bundles.name": bundleName },
                    { $push: { "bundles.$.telemetryData": { $each: data } } as any }
                );
            }

            else {
                // Create a new bundle with multiple telemetry data items
                await this.collection.updateOne(
                    { normalizedAppName },
                    {
                        $addToSet: {
                            bundles: {
                                name: bundleName,
                                telemetryData: data
                            }
                        }
                    }
                );
            }

            console.log(`MongoDB Telemetry DataSource: Stored multiple telemetry data items in MongoDB for bundle ${bundleName}.`);

        } catch (error) {
            console.error("MongoDB Telemetry DataSource: Failed to store multiple telemetry data items in MongoDB:", error);
        }
    }

    async storeAssessments(assessments: Assessment[], filter?: any): Promise<void> {
        if (filter && filter.appInstrumentationMetadata) {
            const assessmentDocs = assessments.map(assessment => ({
                goal: {
                    name: assessment.goal.name,
                    description: assessment.goal.description,
                    weight: assessment.goal.weight,
                    metrics: assessment.goal.metrics.map(metric => ({
                        name: metric.name,
                        acronym: metric.acronym,
                        description: metric.description,
                        unit: metric.unit
                    })),
                },
                globalScore: assessment.globalScore,
                timestamp: assessment.timestamp,
                details: assessment.assessments
            }));

            const bundleName = path.basename(filter.appInstrumentationMetadata.bundleName);
            const normalizedAppName = AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(bundleName);

            try {

                const appDoc = await this.getApplicationDocument(normalizedAppName);

                // Check if the bundle already exists
                const existingBundle = appDoc!.bundles.find((bundle: any) => bundle.name === bundleName);

                if (existingBundle) {
                    // Append multiple telemetry data items to the existing bundle
                    await this.collection.updateOne(
                        { normalizedAppName, "bundles.name": bundleName },
                        { $push: { "bundles.$.assessments": { $each: assessmentDocs } } as any }
                    );

                    console.log(`MongoDB Telemetry DataSource: New assessments stored for bundle ${bundleName}`);
                }

            } catch (error) {
                console.error("MongoDB Telemetry DataSource: Failed to store assessments in MongoDB:", error);
            }
        }
    }
}
