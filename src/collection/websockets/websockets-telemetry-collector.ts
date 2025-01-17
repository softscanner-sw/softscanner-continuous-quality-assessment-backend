import { WebSocketServer } from "ws";
import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../../core/collection/telemetry-collector";
import { TelemetryFileStorageStrategy } from "../../core/strategies/telemetry-storage";

import * as path from "path";

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
                } catch (error){
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
    async storeMetrics(): Promise<void> {
        // If storage endpoints are already configured
        if (this._config && this._config.storageEndpoints && this._config.storageEndpoints.length > 0){
            // Storing metrics for every file storage endpoint
            const fileStorageEndpoints = this._config.storageEndpoints.filter(storageEndpoint => 
            storageEndpoint.type == TelemetryStorageEndpointType.FILE);

            fileStorageEndpoints.forEach(async fileStorageEndpoint => {
                this._telemetryStorageStrategy = new TelemetryFileStorageStrategy(fileStorageEndpoint, {
                    storageEndpoint: fileStorageEndpoint,
                    dataFormat: this._config.dataFormat
                });
    
                await this._telemetryStorageStrategy.storeAll(this.telemetryData);
            });
        }

        // Storage endpoints aren't already set, then store telemetry into files by default based on application metadata
        else {
            const telemetryDataObject = this.telemetryData[0]; // any telemetry trace object
            const applicationNormalizedName = telemetryDataObject.attributes["app.metadata.normalizedName"];
            const telemetryFileName = telemetryDataObject.attributes["app.metadata.instrumentationBundleName"].replace('.bundle.js', '.jsonl');
            const fileStorageEndpoint: TelemetryStorageEndpoint = {
                type: TelemetryStorageEndpointType.FILE,
                name: applicationNormalizedName,
                uri: path.join(applicationNormalizedName, telemetryFileName)
            };
            
            if (!this._config.storageEndpoints)
                this._config.storageEndpoints = [];
            this._config.storageEndpoints.push(fileStorageEndpoint);

            this._telemetryStorageStrategy = new TelemetryFileStorageStrategy(fileStorageEndpoint, {
                storageEndpoint: fileStorageEndpoint,
                dataFormat: this._config.dataFormat
            });

            await this._telemetryStorageStrategy.storeAll(this.telemetryData);
        }

        // Optionally, add logic here to store metrics for other types of storage endpoints if necessary.
    }
}