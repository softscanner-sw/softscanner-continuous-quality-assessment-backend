import { EventEmitter } from "stream";
import { ApplicationInstrumentationMetadata } from "../instrumentation/instrumentation-core";
import { TelemetryDataSource, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../telemetry/telemetry";
import { Metric } from "./metrics-core";

export class MetricsComputer {
    private eventEmitter = new EventEmitter(); // Used to notify listeners upon computing new metric values

    constructor(private metrics: Metric[], private dataSource: TelemetryDataSource) { }

    // Event handling methods
    on(event: 'metricsComputed', listener: (metrics: Metric[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    emit(event: 'metricsComputed', metrics: Metric[]): void {
        this.eventEmitter.emit(event, metrics);
    }

    /**
     * Handles new telemetry data flushes.
     */
    async onTelemetryUpdate(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<void> {
        console.log(`MetricsComputer: Processing telemetry data at ${storageEndpoint.uri}`);
        this.computeMetrics(storageEndpoint, appInstrumentationMetadata); // Compute Metrics
        this.emit('metricsComputed', this.metrics); // Notify listeners of new metric data
    }

    async computeMetrics(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<void> {
        try {
            await this.dataSource.connect(); // Ensure connection (for database data sources)

            // Read telemetry data from data source
            const telemetryData = await this.getTelemetryData(storageEndpoint, appInstrumentationMetadata);

            // console.log(`MetricsComputer: Retrieved Telemetry Data: ${telemetryData}`);

            /* Compute metrics using the telemetry data */
            // Reset metric values before recalculating
            this.metrics.forEach(metric => metric.resetValue());

            // Recompute metrics
            this.metrics.forEach(metric => {
                metric.computeValue(telemetryData);
                console.log(`MetricsComputer: Metric "${metric.name}" computed with value: ${metric.value}`);
            });
        } finally {
            await this.dataSource.disconnect(); // Properly close the connection (for datbase data sources)
        }
    }

    private async getTelemetryData(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata) {
        let telemetryData;

        if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) { // for databases
            if (storageEndpoint.uri.includes('mongo')) {
                telemetryData = await this.dataSource.read({ appInstrumentationMetadata });
            }
        } else{
            const data = await this.dataSource.read(); // for files
            telemetryData = data.telemetryData;
        }

        return telemetryData;
    }
}