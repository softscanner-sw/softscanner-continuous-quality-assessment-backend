import fs from "fs";
import path from "path";
import { ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { WebSocketTelemetryCollector } from "../modules/telemetry/collectors/websockets/websockets-telemetry.collector";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/**
 * Service responsible for managing the telemetry collection process
 * This service handles the configuration and setup of telemetry collectors and manages 
 * the storage of telemetry data in either database or file storage.
 */
export class TelemetryService implements IProgressTrackable {
    // Progress tracker to track and notify about progress updates during telemetry collector setup
    private progressTracker!: ProgressTracker;

    constructor() { }

    /**
     * Sets the progress tracker for monitoring the progress of telemetry collection processes.
     * @param progressTracker - The progress tracker instance to be set.
     */
    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    /**
     * Sets up the telemetry collector for the application by generating a configuration file
     * and initializing a WebSocket-based telemetry collector.
     * @param appInstrumentationMetadata - Metadata about the application being instrumented.
     * @returns A promise that resolves to an instance of the configured `TelemetryCollector`.
     */
    async setupTelemetryCollector(appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<TelemetryCollector> {
        // Notify the progress tracker about generating the telemetry collector configuration
        console.log('Telemetry Service: Generating configuration file for telemetry collector...');
        this.progressTracker.notifyProgress('Telemetry service: Generating configuration file for telemetry collector...');

        // Generate the configuration for the telemetry collector
        const collectorConfig = this.generateTelemetryCollectorConfiguration(appInstrumentationMetadata, TelemetryStorageEndpointType.FILE);

        // Set up and start the WebSocket telemetry collector using the generated configuration
        const collector = new WebSocketTelemetryCollector(collectorConfig, collectorConfig.port);
        console.log(`Telemetry Service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);
        this.progressTracker.notifyProgress(`Telemetry service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);

        return collector;
    }

    /**
     * Generates a configuration for the telemetry collector, specifying where and how
     * the telemetry data should be stored.
     * @param appInstrumentationMetadata - Metadata about the application being instrumented.
     * @param storageType - The type of storage for telemetry data (DATABASE or FILE).
     * @returns A `TelemetryCollectorConfig` object with the generated configuration.
     */
    private generateTelemetryCollectorConfiguration(appInstrumentationMetadata: ApplicationInstrumentationMetadata, storageType: TelemetryStorageEndpointType): TelemetryCollectorConfig {
        let storageEndpoint: TelemetryStorageEndpoint;

        // Configure the storage endpoint based on the specified storage type
        if (storageType === TelemetryStorageEndpointType.DATABASE) { // DATABASE
            // Use a MongoDB endpoint for telemetry storage
            storageEndpoint = {
                type: TelemetryStorageEndpointType.DATABASE,
                name: 'continuous-quality-assessment-web-telemetry-mongodb',
                uri: "mongodb://localhost:27017"
            };
        }

        else { // Use file-based storage
            const { appMetadata, bundleName } = appInstrumentationMetadata;
            const normalizedAppName = appMetadata.generateNormalizedApplicationName('-');
            const projectRootPath = path.resolve(__dirname, '../../'); // Get the project root folder path
            const storageFilesRootFolder: string = path.join(projectRootPath, 'assets', 'files').replace(/\\/g, '/'); // Path to store telemetry files
            const appStorageFolderPath = path.join(storageFilesRootFolder, normalizedAppName).replace(/\\/g, '/');
            const telemetryFileName = path.basename(bundleName).replace('.bundle.js', '.json').replace(/\\/g, '/');

            // Ensure the folder structure for storing telemetry data exists
            if (!fs.existsSync(appStorageFolderPath)) {
                fs.mkdirSync(appStorageFolderPath, { recursive: true });
                console.log(`Telemetry Service: Created folder for telemetry data: ${appStorageFolderPath}`);
            }

            const uri = path.join(appStorageFolderPath, telemetryFileName); // Full path to the telemetry file

            storageEndpoint = {
                type: TelemetryStorageEndpointType.FILE,
                name: telemetryFileName,
                uri: uri
            }

        }

        console.log(`Telemetry Service: Configured storage endpoint: ${JSON.stringify(storageEndpoint, null, 2)}`);

        // Return the telemetry collector configuration with the specified storage endpoint and port
        return {
            port: 8081,                  // The port on which the telemetry collector will run
            storageEndpoints: [storageEndpoint], // List of configured storage endpoints
            dataFormat: "JSON",          // Format of the telemetry data (JSON)
            flushInterval: 3000          // Telemetry data will be flushed periodically every 3 seconds
        };
    }
}