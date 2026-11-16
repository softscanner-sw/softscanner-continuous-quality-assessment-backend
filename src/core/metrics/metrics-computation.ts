import { EventEmitter } from "stream";
import { ApplicationInstrumentationMetadata } from "../instrumentation/instrumentation-core";
import { TelemetryDataSource, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../telemetry/telemetry";
import { Metric } from "./metrics-core";

/**
 * MetricsComputer class handles metric computations based on telemetry data.
 * It listens for telemetry data updates and recalculates metrics accordingly.
 */
/**
 * Raised when metrics cannot be computed (telemetry read failure, non-finite value).
 */
export class MetricComputationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MetricComputationError';
    }
}

/**
 * Result of one metric computation.
 */
export interface MetricsComputationResult {
    metrics: Metric[];
    telemetryCount: number;
}

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
     * Handles new telemetry data flushes: computes the metrics (awaited) and only then notifies listeners,
     * so that listeners always receive the values computed from the telemetry of this flush.
     * @param storageEndpoint - The telemetry storage endpoint containing the telemetry data.
     * @param appInstrumentationMetadata - Metadata related to the application and its instrumentation bundle.
     * @returns The computed metrics and the number of telemetry items they were computed from.
     * @throws MetricComputationError if the telemetry cannot be read or a metric value is not finite.
     */
    async onTelemetryUpdate(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<MetricsComputationResult> {
        console.log(`Metrics Computer: Processing telemetry data at ${storageEndpoint.uri}`);

        // Compute metrics based on telemetry data (awaited: no listener sees values of a previous flush)
        const result = await this.computeMetrics(storageEndpoint, appInstrumentationMetadata);

        // Notify listeners of new metric data
        this.emit('metricsComputed', this.metrics);
        return result;
    }

    /**
     * Computes the values of the metrics using telemetry data from the specified storage endpoint.
     * All metrics (and, recursively, their child metrics) are reset, then recomputed over the telemetry of the bundle.
     * @param storageEndpoint - The telemetry storage endpoint.
     * @param appInstrumentationMetadata - Metadata related to the application and its instrumentation bundle.
     * @returns The computed metrics and the number of telemetry items read.
     * @throws MetricComputationError if the telemetry cannot be read or a computed value is not a finite number.
     */
    async computeMetrics(storageEndpoint: TelemetryStorageEndpoint, appInstrumentationMetadata: ApplicationInstrumentationMetadata): Promise<MetricsComputationResult> {
        try {
            // Connect to the telemetry data source (e.g., database)
            await this.dataSource.connect();

            // Retrieve telemetry data from data source (read failures propagate; they are not an empty telemetry set)
            const telemetryData = await this.getTelemetryData(storageEndpoint, appInstrumentationMetadata);
            if (!Array.isArray(telemetryData)) {
                throw new MetricComputationError(`Metrics Computer: telemetry could not be read from ${storageEndpoint.uri}`);
            }

            // Reset the values of all metrics (and their children) before recomputing
            this.metrics.forEach(metric => metric.resetValue());

            // Compute the new values for each metric using the telemetry data
            this.metrics.forEach(metric => {
                metric.computeValue(telemetryData);
                console.log(`Metrics Computer: Metric "${metric.name}" computed with value: ${metric.value}`);
                if (typeof metric.value !== 'number' || !Number.isFinite(metric.value)) {
                    // A non-finite value is a computation error, never a valid score input
                    throw new MetricComputationError(`Metrics Computer: metric ${metric.acronym} computed a non-finite value (${metric.value})`);
                }
            });

            return { metrics: this.metrics, telemetryCount: telemetryData.length };
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

    /**
     * Returns the number of unique values for a given attribute key
     * from the telemetry data.
     * @param telemetryData - Array of telemetry data objects.
     * @param attributeKey - The key to extract (e.g., "app.user.id").
     * @returns The count of unique values.
     */
    static uniqueCount(telemetryData: any[], attributeKey: string): number {
        // Initializes the set of unique values
        const set = new Set<string>();

        // Populates the set
        telemetryData.forEach(data => {
            const value = data.attributes[attributeKey];
            if (value) {
                set.add(value);
            }
        });

        // returns the size of the set of values
        return set.size;
    }
}