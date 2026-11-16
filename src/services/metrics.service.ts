import { ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { MetricsComputationResult, MetricsComputer } from "../core/metrics/metrics-computation";
import { Metric, MetricHistory } from "../core/metrics/metrics-core";
import { TelemetryDataSource, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { MongoDBTelemetryDataSource } from "../modules/telemetry/datasources/databases/mongodb/mongodb-databases-datasource.strategy";
import { FileTelemetryDataSource } from "../modules/telemetry/datasources/filesystems/filesystems-datasource.strategy";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/**
 * Service for handling the collection, storage, and computation of telemetry-based metrics.
 * This service integrates with telemetry collectors and various data sources (e.g., databases and files)
 * to compute metrics and notify subscribers when new metrics are available.
 */
export class MetricsService implements IProgressTrackable {
    // List of functions to call when new metrics are computed
    private metricsUpdateListeners: ((metrics: Metric[]) => void)[] = [];

    // Progress tracker to track and notify about progress updates during metric computation
    private progressTracker!: ProgressTracker;

    // Keeps track of the historical raw values of each metric of this assessment (used by the dashboard for trends).
    // The history is per service instance, i.e. per assessment; normalization benchmarks are kept separately (BenchmarkStore).
    private metricsHistory: { [key: string]: MetricHistory } = {};

    /**
     * @param dataSourceFactory - Optional factory of telemetry data sources (defaults to file/MongoDB data sources).
     */
    constructor(private dataSourceFactory?: (storageEndpoint: TelemetryStorageEndpoint) => TelemetryDataSource) { }

    /**
     * Sets the progress tracker for the service. 
     * The progress tracker is used to notify clients about the current status of telemetry and metric processing.
     * @param progressTracker - An instance of `ProgressTracker`
     */
    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    /**
     * Creates an appropriate telemetry data source (database or file-based) based on the storage endpoint configuration.
     * @param storageEndpoint - Configuration object specifying the type and URI of the telemetry storage
     * @returns A `TelemetryDataSource` instance for interacting with telemetry data
     */
    private createTelemetryDataSource(storageEndpoint: TelemetryStorageEndpoint): TelemetryDataSource {
        if (this.dataSourceFactory) return this.dataSourceFactory(storageEndpoint);
        switch (storageEndpoint.type) {
            case TelemetryStorageEndpointType.FILE:
                // File-based telemetry storage
                return new FileTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });

            case TelemetryStorageEndpointType.DATABASE:
                if (storageEndpoint.uri.includes("mongo")) {
                    // MongoDB-based telemetry storage
                    return new MongoDBTelemetryDataSource({ storageEndpoint, dataFormat: 'JSON' });
                }
                else throw new Error(`MetricsService: Unsupported database type for ${storageEndpoint.uri}`);

            default:
                throw new Error(`MetricsService: Unsupported storage type ${storageEndpoint.type}`);
        }
    }

    /**
     * Computes the selected metrics for one assessment cycle from the telemetry of the application's bundle.
     * The computation is awaited; the metric history entries are stamped with the cycle timestamp.
     * @param storageEndpoint - Telemetry storage endpoint to read from
     * @param appInstrumentationMetadata - Metadata about the application being instrumented
     * @param selectedMetrics - List of metrics to compute
     * @param timestamp - Timestamp of the assessment cycle
     * @returns The computed metrics and the number of telemetry items read
     * @throws if there is no metric, the telemetry cannot be read, or a value is not finite
     */
    async computeCycle(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata, selectedMetrics: Metric[], timestamp: string): Promise<MetricsComputationResult> {
        if (!this.progressTracker) {
            throw new Error('Progress tracker not set in MetricsService.');
        }
        if (selectedMetrics.length === 0) {
            throw new Error('Metrics Service: No metrics found for the selected goals.');
        }

        console.log('Metrics Service: New telemetry data flushed, triggering metric computation...');
        this.progressTracker.notifyProgress('Metrics Service: New telemetry data flushed, triggering metric computation...');

        const metricsComputer = new MetricsComputer(selectedMetrics, this.createTelemetryDataSource(storageEndpoint));
        const result = await metricsComputer.onTelemetryUpdate(storageEndpoint, appInstrumentationMetadata);

        // Update the history of raw values with the cycle timestamp
        result.metrics.forEach(metric => {
            if (!this.metricsHistory[metric.acronym]) {
                this.metricsHistory[metric.acronym] = [];
            }
            this.metricsHistory[metric.acronym].push({ timestamp, value: metric.value });
            metric['_history'] = this.metricsHistory[metric.acronym];  // Attach history to metric
        });

        this.progressTracker.notifyProgress('Metrics Service: Metrics computation complete.');
        this.notifyMetricsUpdated(result.metrics);
        return result;
    }

    /**
     * Registers a listener that will be notified when new metrics are computed.
     * @param listener - A callback function to handle the updated metrics
     */
    onMetricsUpdated(listener: (metrics: any[]) => void): void {
        this.metricsUpdateListeners.push(listener);
    }

    /**
     * Notifies all registered listeners about newly computed metrics.
     * @param metrics - The list of newly computed metrics
     */
    private notifyMetricsUpdated(metrics: any[]): void {
        console.log('Metrics Service: New metrics available, notifying listeners...');
        this.progressTracker.notifyProgress('Metrics Service: New metrics available, notifying listeners...');
        this.metricsUpdateListeners.forEach(listener => listener(metrics));
    }
}