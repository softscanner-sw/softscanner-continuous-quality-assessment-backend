import { TelemetryCollector, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../collection/telemetry-collector";
import { DatabaseTelemetryDataReader, FileTelemetryDataReader, MetricsComputer } from "../computation/metrics-computation";
import { QualityModelService } from "../model/model-service";
import { ProgressTracker } from "../util/util-core";
import { Metric } from "./metrics-core";

/**
 * Service to handle the telemetry collection and storage process.
 */
export class MetricsService {
    private metricsUpdateListeners: ((metrics: Metric[]) => void)[] = [];
    private progressTracker: ProgressTracker = new ProgressTracker();

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
                    this.notifyMetricsUpdated(computedMetrics);
                });

                // Now process the telemetry file and trigger metric computation
                await metricsComputer.onTelemetryUpdate(storageEndpoint.uri);

                this.progressTracker.notifyProgress('Metrics service: Metrics computation complete.');
            }
        });
    }

    onMetricsUpdated(listener: (metrics: Metric[]) => void): void {
        this.metricsUpdateListeners.push(listener);
    }

    private notifyMetricsUpdated(metrics: Metric[]): void {
        console.log('Metrics service: New metrics available, notifying listeners...');
        this.progressTracker.notifyProgress('Metrics service: New metrics available, notifying listeners...');
        this.metricsUpdateListeners.forEach(listener => listener(metrics));
    }
}