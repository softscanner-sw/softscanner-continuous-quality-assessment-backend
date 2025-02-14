import { ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { MetricsComputer } from "../core/metrics/metrics-computation";
import { Metric, MetricHistory } from "../core/metrics/metrics-core";
import { TelemetryCollector, TelemetryDataSource, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
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

    // Keeps track of the historical data for each metric (used for generating trends and history-based analysis)
    private metricsHistory: { [key: string]: MetricHistory } = {};

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
     * Computes metrics using telemetry data collected from a specified source (e.g., a database or file).
     * The service listens for telemetry updates and triggers metric computation when new data is available.
     * @param collector - A `TelemetryCollector` instance to collect telemetry data
     * @param appInstrumentationMetadata - Metadata about the application being instrumented
     * @param selectedMetrics - List of metrics to compute
     * @returns A Promise that resolves with the computed metrics
     */
    async computeMetrics(collector: TelemetryCollector, appInstrumentationMetadata: ApplicationInstrumentationMetadata, selectedMetrics: Metric[]): Promise<Metric[]> {
        if (!this.progressTracker) {
            throw new Error('Progress tracker not set in MetricsService.');
        }

        console.log('Metrics service: Metrics to compute:', selectedMetrics.map(metric => metric.name));

        // Ensure that there are metrics to compute
        if (selectedMetrics.length === 0) {
            throw new Error('Metrics service: No metrics found for the selected goals.');
        }

        return new Promise((resolve, reject) => {
            // Listen for the event when telemetry data is flushed (i.e., new telemetry data is available)
            collector.on('dataFlushed', async (storageEndpoints: TelemetryStorageEndpoint[]) => {
                console.log('Metrics service: New telemetry data flushed, triggering metric computation...');
                this.progressTracker.notifyProgress('Metrics service: New telemetry data flushed, triggering metric computation...');

                try {
                    // Iterate over all storage endpoints to compute metrics from each source
                    for (const storageEndpoint of storageEndpoints) {
                        const telemetryDataSource = this.createTelemetryDataSource(storageEndpoint);
                        const metricsComputer = new MetricsComputer(selectedMetrics, telemetryDataSource);

                        // Subscribe to the 'metricsComputed' event to receive the computed metrics
                        metricsComputer.on('metricsComputed', (computedMetrics: Metric[]) => {
                            // Add timestamp to each metric and update the history
                            const timestamp = new Date().toISOString();
                            computedMetrics.map(metric => {
                                if (!this.metricsHistory[metric.acronym]) {
                                    this.metricsHistory[metric.acronym] = [];
                                }

                                this.metricsHistory[metric.acronym].push({ timestamp, value: metric.value || 0 });
                                metric['_history'] = this.metricsHistory[metric.acronym];  // Attach history to metric
                            });

                            // Notify listeners that new metrics are available
                            this.notifyMetricsUpdated(computedMetrics);
                            resolve(computedMetrics);
                        });

                        // Trigger metric computation using the telemetry data source
                        await metricsComputer.onTelemetryUpdate(storageEndpoint, appInstrumentationMetadata);
                        this.progressTracker.notifyProgress('Metrics service: Metrics computation complete.');
                    }

                } catch (error) {
                    reject(error);
                }
            });
        });
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
        console.log('Metrics service: New metrics available, notifying listeners...');
        this.progressTracker.notifyProgress('Metrics service: New metrics available, notifying listeners...');
        this.metricsUpdateListeners.forEach(listener => listener(metrics));
    }
}