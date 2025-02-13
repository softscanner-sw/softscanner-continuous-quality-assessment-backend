import { WebSocketServer } from "ws";

import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpointType } from "../../../../core/telemetry/telemetry";
import { MongoDBTelemetryDataSource } from "../../datasources/databases/mongodb/mongodb-databases-datasource.strategy";
import { FileTelemetryDataSource } from "../../datasources/filesystems/filesystems-datasource.strategy";
import { Assessment } from "../../../../core/assessment/assessment-core";

/**
 * Telemetry collector that uses WebSockets for real-time telemetry data collection.
 */
export class WebSocketTelemetryCollector extends TelemetryCollector {
    private wss: WebSocketServer;

    /**
     * Initializes the WebSocket telemetry collector with specific configurations and port.
     * @param {TelemetryCollectorConfig} config - The configuration for the telemetry collector.
     * @param {number} port - The port number on which the WebSocket server will listen.
     */
    constructor(
        config: TelemetryCollectorConfig,
        protected port: number = 8081) {
        super(config);
        this.wss = new WebSocketServer({ port });
        this.setupWebSocketServer();
    }

    /**
     * Sets up the WebSocket server to handle incoming connections, messages, and errors.
     */
    private setupWebSocketServer(): void {
        this.wss.on('connection', ws => {
            console.log('Collector: Client connected');

            ws.on('message', async message => {
                await this.collectTelemetry(message);
            });

            ws.on('close', async () => {
                console.log('Collector: Client disconnected');
                try {
                    await this.handleRetry(() => this.flushData());  // Flush on client disconnect
                    console.log('Collector: Telemetry data flushed and stored.');
                } catch (error) {
                    console.error('Collector: Failed to flush and store telemetry data:', error);
                }
            });

            ws.on('error', error => {
                console.error(`Collector: WebSocket error: ${error}`);
            });
        });

        console.log(`Collector: WebSocket server started on ws://localhost:${this.port}`);
    }

    /**
     * Collects telemetry data from WebSocket messages.
     * @param {any} data - The telemetry data received from a WebSocket
     */
    async collectTelemetry(data: any): Promise<void> {
        // Data is a JSON string representing an array of telemetry data objects
        try {
            const telemetryObjects: any[] = JSON.parse(data);
            telemetryObjects.forEach((telemetryObject) => {
                // console.log(`Trace: ${JSON.stringify(telemetryObject)}`);
                this.telemetryData.push(telemetryObject);
            });
        } catch (error) {
            console.error('Collector: Error processing telemetry data:', error);
        }
    }

    /**
     * Stores the collected telemetry data using the configured storage strategies.
     * This implementation filters for file storage endpoints and uses the TelemetryFileStorageStrategy
     * to store telemetry data into files.
     * It can be extended to support other types of storage endpoints.
     */
    async storeTelemetry(): Promise<void> {
        if (this._config && this._config.storageEndpoints) {
            for (const storageEndpoint of this._config.storageEndpoints) {
                let dataSource;

                if (storageEndpoint.type === TelemetryStorageEndpointType.FILE)
                    dataSource = new FileTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                else if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) {
                    if (storageEndpoint.uri.includes('mongo')) {
                        dataSource = new MongoDBTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                    }
                }

                if (dataSource) {
                    await dataSource.connect();
                    await dataSource.storeAll(this.telemetryData);
                    await dataSource.disconnect();
                }
            }
        }
    }

    async storeAssessments(assessments: Assessment[], filter?: any): Promise<void> {
        if (this._config && this._config.storageEndpoints && filter) {
            const appInstrumentationMetadata = filter.appInstrumentationMetadata;
            for (const storageEndpoint of this._config.storageEndpoints) {
                let dataSource;

                if (storageEndpoint.type === TelemetryStorageEndpointType.FILE)
                    dataSource = new FileTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                else if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) {
                    if (storageEndpoint.uri.includes('mongo')) {
                        dataSource = new MongoDBTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                    }
                }

                if (dataSource) {
                    await dataSource.connect();
                    await dataSource.storeAssessments(assessments, { appInstrumentationMetadata });
                    await dataSource.disconnect();
                }
            }
        }
    }
}