import fs from "fs";
import path from "path";
import { ApplicationMetadata } from "../core/application/application-metadata";
import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { WebSocketTelemetryCollector } from "../modules/telemetry/collectors/websockets/websockets-telemetry.collector";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/**
 * Service to handle the telemetry collection and storage process.
 */
export class TelemetryService implements IProgressTrackable {
    private progressTracker!: ProgressTracker;

    constructor() { }

    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    /**
     * Triggers the instrumentation process.
     * It starts with extracting metrics from the selected goals and based on application metadata
     * to generate and inject instrumentation agents.
     * @param appMetadata The metadata of the application being instrumented.
     * @param selectedGoals The selected quality goals.
     * @returns the instrumentation bundle file name
     */
    async setupTelemetryCollector(appMetadata: ApplicationMetadata, bundleName: string): Promise<TelemetryCollector> {
        // Generate configuration file for the telemetry collector
        console.log('Telemetry service: Generating configuration file for telemetry collector...');
        this.progressTracker.notifyProgress('Telemetry service: Generating configuration file for telemetry collector...');
        const collectorConfig = this.generateTelemetryCollectorConfiguration(appMetadata, bundleName);

        // Set up telemetry collector
        const collector = new WebSocketTelemetryCollector(collectorConfig, collectorConfig.port);
        console.log(`Telemetry service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);
        this.progressTracker.notifyProgress(`Telemetry service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);

        return collector;
    }

    private generateTelemetryCollectorConfiguration(appMetadata: ApplicationMetadata, bundleName: string) {
        const projectRootPath = path.resolve(__dirname, '../../'); // this project's root folder path
        const storageFilesRootFolder: string = path.join(projectRootPath, 'assets', 'files');
        const normalizedAppName = appMetadata.generateNormalizedApplicationName('-');
        const telemetryFileName = path.basename(bundleName).replace('.bundle.js', '.jsonl');
        const appStorageFolderPath = path.join(storageFilesRootFolder, normalizedAppName);

        // Ensure the folder structure exists
        if (!fs.existsSync(appStorageFolderPath)) {
            fs.mkdirSync(appStorageFolderPath, { recursive: true });
            console.log(`Telemetry service: Created folder for telemetry data: ${appStorageFolderPath}`);
        }

        const uri = path.join(appStorageFolderPath, telemetryFileName);
        console.log(`TelemetryService: Generated URI for storage endpoint: ${uri}`);


        // console.log(`Telemetry service: Normalized App Name: ${normalizedAppName}`);
        // console.log(`Telemetry service: Configured storage endpoint name: ${telemetryFileName}`);
        // console.log(`Telemetry service: Configured storage endpoint uri: ${uri}`);

        const config: TelemetryCollectorConfig = {
            port: 8081,
            storageEndpoints: [
                {
                    type: TelemetryStorageEndpointType.FILE,
                    name: telemetryFileName,
                    uri: uri,
                },
            ],
            dataFormat: "JSON",
        };

        return config;
    }
}