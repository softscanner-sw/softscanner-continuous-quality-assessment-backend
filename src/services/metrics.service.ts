import { DatabaseTelemetryDataReader, FileTelemetryDataReader, MetricsComputer } from "../core/computation/metrics-computation";
import { Metric, MetricHistory } from "../core/metrics/metrics-core";
import { TelemetryCollector, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/**
 * Service to handle the telemetry collection and storage process.
 */
export class MetricsService implements IProgressTrackable{
    private metricsUpdateListeners: ((metrics: Metric[]) => void)[] = [];
    private progressTracker!: ProgressTracker;
    private metricsHistory: { [key: string]: MetricHistory } = {};

    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    async computeMetrics(collector: TelemetryCollector, selectedMetrics: Metric[]): Promise<Metric[]> {
        if (!this.progressTracker) {
            throw new Error('Progress tracker not set in MetricsService.');
        }
        
        console.log('Metrics service: Metrics to compute:', selectedMetrics.map(metric => metric.name));

        // Check if metrics are available
        if (selectedMetrics.length === 0) {
            throw new Error('Metrics service: No metrics found for the selected goals.');
        }

        return new Promise((resolve, reject) => {
            // Listen for telemetry flushes and trigger metric computation
            collector.on('dataFlushed', async (storageEndpoints: TelemetryStorageEndpoint[]) => {
                console.log('Metrics service: New telemetry data flushed, triggering metric computation...');
                this.progressTracker.notifyProgress('Metrics service: New telemetry data flushed, triggering metric computation...');

                try {
                    for (const storageEndpoint of storageEndpoints) {
                        const telemetryReader =
                            storageEndpoint.type === TelemetryStorageEndpointType.FILE
                                ? new FileTelemetryDataReader(storageEndpoint.uri)
                                : new DatabaseTelemetryDataReader(storageEndpoint.uri);

                        const metricsComputer = new MetricsComputer(selectedMetrics, telemetryReader);

                        // Listen for metrics updates and notify subscribers
                        metricsComputer.on('metricsComputed', (computedMetrics: Metric[]) => {
                            // Add timestamps to the metrics for history tracking
                            const timestamp = new Date().toISOString();
                            computedMetrics.map(metric => {
                                if (!this.metricsHistory[metric.acronym]) {
                                    this.metricsHistory[metric.acronym] = [];
                                }

                                this.metricsHistory[metric.acronym].push({ timestamp, value: metric.value || 0 });
                                metric['_history'] = this.metricsHistory[metric.acronym];  // Attach history to metric
                            });

                            this.notifyMetricsUpdated(computedMetrics);
                            resolve(computedMetrics);
                        });

                        // Now process the telemetry file and trigger metric computation
                        await metricsComputer.onTelemetryUpdate(storageEndpoint.uri);
                        this.progressTracker.notifyProgress('Metrics service: Metrics computation complete.');
                    }

                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    onMetricsUpdated(listener: (metrics: any[]) => void): void {
        this.metricsUpdateListeners.push(listener);
    }

    private notifyMetricsUpdated(metrics: any[]): void {
        console.log('Metrics service: New metrics available, notifying listeners...');
        this.progressTracker.notifyProgress('Metrics service: New metrics available, notifying listeners...');
        this.metricsUpdateListeners.forEach(listener => listener(metrics));
    }
}