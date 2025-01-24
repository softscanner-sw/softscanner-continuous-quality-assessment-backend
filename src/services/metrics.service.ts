import { DatabaseTelemetryDataReader, FileTelemetryDataReader, MetricsComputer } from "../core/computation/metrics-computation";
import { Metric } from "../core/metrics/metrics-core";
import { TelemetryCollector, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { ProgressTracker } from "./progress-tracker.service";
import { QualityModelService } from "./quality-model.service";

/**
 * Service to handle the telemetry collection and storage process.
 */
export class MetricsService {
    private metricsUpdateListeners: ((metrics: Metric[]) => void)[] = [];
    private progressTracker: ProgressTracker = new ProgressTracker();
    private metricsHistory: { [key: string]: { timestamp: string; value: number }[] } = {};

    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    async computeMetrics(collector: TelemetryCollector, selectedGoals: string[]) {
        // Extract the required metrics from SSQMM based on the selected goals
        const modelService = new QualityModelService();
        const metrics = modelService.extractRequiredMetrics(modelService.ssqmm.goals, selectedGoals);

        console.log('Metrics service: Metrics to compute:', metrics.map(metric => metric.name));

        // Check if metrics are available
        if (metrics.length === 0) {
            throw new Error('Metrics service: No metrics found for the selected goals.');
        }

        // Listen for telemetry flushes and trigger metric computation
        collector.on('dataFlushed', async (storageEndpoints: TelemetryStorageEndpoint[]) => {
            console.log('Metrics service: New telemetry data flushed, triggering metric computation...');
            this.progressTracker.notifyProgress('Metrics service: New telemetry data flushed, triggering metric computation...');

            for (const storageEndpoint of storageEndpoints) {
                const telemetryReader =
                    storageEndpoint.type === TelemetryStorageEndpointType.FILE
                        ? new FileTelemetryDataReader(storageEndpoint.uri)
                        : new DatabaseTelemetryDataReader(storageEndpoint.uri);

                const metricsComputer = new MetricsComputer(metrics, telemetryReader);

                // Listen for metrics updates and notify subscribers
                metricsComputer.on('metricsComputed', (computedMetrics: Metric[]) => {
                    // Add timestamps to the metrics for history tracking
                    const timestamp = new Date().toISOString();
                    const enrichedMetrics = computedMetrics.map(metric => {
                        if (!this.metricsHistory[metric.acronym]) {
                            this.metricsHistory[metric.acronym] = [];
                        }

                        this.metricsHistory[metric.acronym].push({ timestamp, value: metric.value || 0 });

                        return {
                            name: metric.name,
                            acronym: metric.acronym,
                            value: metric.value,
                            unit: metric.unit,
                            history: this.metricsHistory[metric.acronym]  // Injecting history separately
                        };
                    });

                    this.notifyMetricsUpdated(enrichedMetrics);
                });

                // Now process the telemetry file and trigger metric computation
                await metricsComputer.onTelemetryUpdate(storageEndpoint.uri);
                this.progressTracker.notifyProgress('Metrics service: Metrics computation complete.');
            }
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