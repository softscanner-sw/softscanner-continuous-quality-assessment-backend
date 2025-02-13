import fs from "fs";
import path from "path";
import { ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { TelemetryCollector, TelemetryCollectorConfig, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
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
    async setupTelemetryCollector(appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<TelemetryCollector> {
        // Generate configuration file for the telemetry collector
        console.log('Telemetry service: Generating configuration file for telemetry collector...');
        this.progressTracker.notifyProgress('Telemetry service: Generating configuration file for telemetry collector...');
        const collectorConfig = this.generateTelemetryCollectorConfiguration(appInstrumentationMetadata, TelemetryStorageEndpointType.DATABASE);

        // Set up telemetry collector
        const collector = new WebSocketTelemetryCollector(collectorConfig, collectorConfig.port);
        console.log(`Telemetry service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);
        this.progressTracker.notifyProgress(`Telemetry service: Telemetry collector server is running on ws://localhost:${collectorConfig.port}`);

        return collector;
    }

    private generateTelemetryCollectorConfiguration(appInstrumentationMetadata: ApplicationInstrumentationMetadata, storageType: TelemetryStorageEndpointType): TelemetryCollectorConfig {
        let storageEndpoint: TelemetryStorageEndpoint;

        if (storageType === TelemetryStorageEndpointType.DATABASE) { // DATABASE
            storageEndpoint = {
                type: TelemetryStorageEndpointType.DATABASE,
                name: 'continuous-quality-assessment-web-telemetry-mongodb',
                uri: "mongodb://localhost:27017"
            };
        }

        else { // FILE
            const { appMetadata, bundleName } = appInstrumentationMetadata;
            const normalizedAppName = appMetadata.generateNormalizedApplicationName('-');
            const projectRootPath = path.resolve(__dirname, '../../'); // this project's root folder path
            const storageFilesRootFolder: string = path.join(projectRootPath, 'assets', 'files');
            const appStorageFolderPath = path.join(storageFilesRootFolder, normalizedAppName);
            const telemetryFileName = path.basename(bundleName).replace('.bundle.js', '.json');

            // Ensure the folder structure exists
            if (!fs.existsSync(appStorageFolderPath)) {
                fs.mkdirSync(appStorageFolderPath, { recursive: true });
                console.log(`Telemetry service: Created folder for telemetry data: ${appStorageFolderPath}`);
            }

            const uri = path.join(appStorageFolderPath, telemetryFileName);

            // console.log(`TelemetryService: Generated URI for storage endpoint: ${uri}`);

            storageEndpoint = {
                type: TelemetryStorageEndpointType.FILE,
                name: telemetryFileName,
                uri: uri
            }

        }

        console.log(`TelemetryService: Configured storage endpoint: ${JSON.stringify(storageEndpoint)}`);

        return {
            port: 8081,
            storageEndpoints: [storageEndpoint],
            dataFormat: "JSON"
        }
    }
}