import { WebSocketServer } from "ws";

import { Assessment } from "../../../../core/assessment/assessment-core";
import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpointType } from "../../../../core/telemetry/telemetry";
import { MongoDBTelemetryDataSource } from "../../datasources/databases/mongodb/mongodb-databases-datasource.strategy";
import { FileTelemetryDataSource } from "../../datasources/filesystems/filesystems-datasource.strategy";

/**
 * Telemetry collector that uses WebSockets for real-time telemetry data collection and storage.
 */
export class WebSocketTelemetryCollector extends TelemetryCollector {
    private wss: WebSocketServer; // WebSocket server instance

    /**
     * Initializes the WebSocket telemetry collector with specific configurations and port.
     * @param {TelemetryCollectorConfig} config - Configuration object for the telemetry collector.
     * @param {number} port - The port number on which the WebSocket server listens (default: 8081).
     */
    constructor(
        config: TelemetryCollectorConfig,
        protected port: number = 8081) {
        super(config);  // Call the parent class constructor
        this.wss = new WebSocketServer({ port }); // Create a new WebSocket server on the specified port
        this.setupWebSocketServer(); // Setup event listeners for the WebSocket server
    }

    /**
     * Sets up the WebSocket server to handle incoming client connections, messages, and errors.
     */
    private setupWebSocketServer(): void {
        // Event triggered when a new client connects
        this.wss.on('connection', ws => {
            console.log('Collector: Client connected');

            // Event triggered when a message is received from a client
            ws.on('message', async message => {
                await this.collectTelemetry(message); // Collect telemetry data from the message
            });

            // Event triggered when the client disconnects
            ws.on('close', async () => {
                console.log('Collector: Client disconnected');
                try {
                    // Attempt to flush and store the collected telemetry data on client disconnect
                    await this.handleRetry(() => this.flushData());
                    console.log('Collector: Telemetry data flushed and stored.');
                } catch (error) {
                    console.error('Collector: Failed to flush and store telemetry data:', error);
                }
            });

            // Event triggered when an error occurs in the WebSocket connection
            ws.on('error', error => {
                console.error(`Collector: WebSocket error: ${error}`);
            });
        });

        console.log(`Collector: WebSocket server started on ws://localhost:${this.port}`);
    }

    /**
     * Collects telemetry data from incoming WebSocket messages.
     * @param {any} data - The telemetry data received from a WebSocket message, typically in JSON format.
     */
    async collectTelemetry(data: any): Promise<void> {
        try {
            // Parse the JSON string to extract telemetry objects
            const telemetryObjects: any[] = JSON.parse(data);
            telemetryObjects.forEach((telemetryObject) => {
                // console.log(`Trace: ${JSON.stringify(telemetryObject)}`);
                this.telemetryData.push(telemetryObject); // Add each telemetry object to the internal storage
            });
        } catch (error) {
            console.error('Collector: Error processing telemetry data:', error);
        }
    }

    /**
     * Stores the collected telemetry data using the configured storage strategies.
     * Supports both file-based and database-based storage.
     */
    async storeTelemetry(): Promise<void> {
        if (this._config && this._config.storageEndpoints) {
            for (const storageEndpoint of this._config.storageEndpoints) {
                let dataSource;

                // Choose the appropriate data source based on the storage endpoint type
                if (storageEndpoint.type === TelemetryStorageEndpointType.FILE)
                    dataSource = new FileTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                else if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) {
                    if (storageEndpoint.uri.includes('mongo')) {
                        dataSource = new MongoDBTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                    }
                }

                // Store telemetry data if a valid data source is found
                if (dataSource) {
                    await dataSource.connect();
                    await dataSource.storeAll(this.telemetryData);
                    await dataSource.disconnect();
                }
            }
        }
    }

    /**
     * Stores the assessment results using the configured storage strategies.
     * Supports filtering by application instrumentation metadata.
     * @param {Assessment[]} assessments - The list of assessment results to store.
     * @param {any} filter - Optional filter criteria for storing assessments (e.g., application metadata).
     */
    async storeAssessments(assessments: Assessment[], filter?: any): Promise<void> {
        if (this._config && this._config.storageEndpoints && filter) {
            const appInstrumentationMetadata = filter.appInstrumentationMetadata;
            for (const storageEndpoint of this._config.storageEndpoints) {
                let dataSource;

                // Choose the appropriate data source based on the storage endpoint type
                if (storageEndpoint.type === TelemetryStorageEndpointType.FILE)
                    dataSource = new FileTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                else if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) {
                    if (storageEndpoint.uri.includes('mongo')) {
                        dataSource = new MongoDBTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                    }
                }

                // Store assessments if a valid data source is found
                if (dataSource) {
                    await dataSource.connect();
                    await dataSource.storeAssessments(assessments, { appInstrumentationMetadata });
                    await dataSource.disconnect();
                }
            }
        }
    }
}