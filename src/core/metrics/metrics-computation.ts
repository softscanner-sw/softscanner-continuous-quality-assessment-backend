import { EventEmitter } from "stream";
import { ApplicationInstrumentationMetadata } from "../instrumentation/instrumentation-core";
import { TelemetryDataSource, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../telemetry/telemetry";
import { Metric } from "./metrics-core";

/**
 * MetricsComputer class handles metric computations based on telemetry data.
 * It listens for telemetry data updates and recalculates metrics accordingly.
 */
export class MetricsComputer {
    private eventEmitter = new EventEmitter(); // Used to notify listeners upon computing new metric values

    /**
     * Constructs a new MetricsComputer instance.
     * @param metrics - Array of Metric objects to be computed.
     * @param dataSource - Telemetry data source for retrieving telemetry data.
     */
    constructor(private metrics: Metric[], private dataSource: TelemetryDataSource) { }

    /* Event handling methods */

    /**
     * Registers a listener for the `metricsComputed` event.
     * @param event - The event `metricsComputed`.
     * @param listener - The callback function to execute when the event is emitted.
     */
    on(event: 'metricsComputed', listener: (metrics: Metric[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Emits the `metricsComputed` event with the specified metrics.
     * @param event - The event `metricsComputed`.
     * @param metrics - The array of metrics that were computed.
     */
    emit(event: 'metricsComputed', metrics: Metric[]): void {
        this.eventEmitter.emit(event, metrics);
    }

    /**
     * Handles new telemetry data flushes, triggering metric computation and notifying listeners.
     * @param storageEndpoint - The telemetry storage endpoint containing the telemetry data.
     * @param appInstrumentationMetadata - Metadata related to the application and its instrumentation bundle.
     */
    async onTelemetryUpdate(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<void> {
        console.log(`Metrics Computer: Processing telemetry data at ${storageEndpoint.uri}`);

        // Compute metrics based on telemetry data
        this.computeMetrics(storageEndpoint, appInstrumentationMetadata);

        // Notify listeners of new metric data
        this.emit('metricsComputed', this.metrics);
    }

    /**
     * Computes the values of the metrics using telemetry data from the specified storage endpoint.
     * @param storageEndpoint - The telemetry storage endpoint.
     * @param appInstrumentationMetadata - Metadata related to the application and its instrumentation bundle.
     */
    async computeMetrics(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<void> {
        try {
            // Connect to the telemetry data source (e.g., database)
            await this.dataSource.connect();

            // Retrieve telemetry data from data source
            const telemetryData = await this.getTelemetryData(storageEndpoint, appInstrumentationMetadata);

            // Reset the values of all metrics before recomputing
            this.metrics.forEach(metric => metric.resetValue());

            // Compute the new values for each metric using the telemetry data
            this.metrics.forEach(metric => {
                metric.computeValue(telemetryData);
                console.log(`Metrics Computer: Metric "${metric.name}" computed with value: ${metric.value}`);
            });
        } finally {
            // Disconnect from the telemetry data source to ensure proper resource cleanup
            await this.dataSource.disconnect();
        }
    }

    /**
     * Retrieves telemetry data from the specified storage endpoint.
     * @param storageEndpoint - The telemetry storage endpoint.
     * @param appInstrumentationMetadata - Metadata related to the application and its instrumentation bundle.
     * @returns The retrieved telemetry data.
     */
    private async getTelemetryData(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata) {
        let telemetryData;

        if (storageEndpoint.type === TelemetryStorageEndpointType.DATABASE) {
            // Handle database-specific data retrieval (e.g., MongoDB)
            if (storageEndpoint.uri.includes('mongo')) {
                telemetryData = await this.dataSource.read({ appInstrumentationMetadata });
            }
        } else {
            // Handle file-based telemetry data retrieval
            const data = await this.dataSource.read();
            telemetryData = data.telemetryData;
        }

        return telemetryData;
    }
}