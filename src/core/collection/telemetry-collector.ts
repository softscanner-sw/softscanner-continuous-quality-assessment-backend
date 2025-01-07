import { TelemetryStorageStrategy } from '../strategies/telemetry-storage';

/**
 * Defines possible formats for telemetry data.
 */
export type TelemetryDataFormat = 'CSV' | 'JSON' | 'XML';

/**
 * Enumerates the types of storage endpoints available for telemetry data.
 */
export enum TelemetryStorageEndpointType {
    FILE, // Store telemetry data in files.
    DATABASE, // Store telemetry data in a database.
}

/**
 * Defines the structure of a telemetry storage endpoint.
 */
export interface TelemetryStorageEndpoint {
    type: TelemetryStorageEndpointType, // The type of the endpoint.
    name: string, // A human-readable name for the endpoint.
    uri: string // The URI of the endpoint (e.g., file path or database connection string).
}

/**
 * Configuration for telemetry storage strategy.
 */
export interface TelemetryStorageStrategyConfig {
    storageEndpoint: TelemetryStorageEndpoint, // The concerned storage endpoint.
    dataFormat?: TelemetryDataFormat, // The format of the telemetry data.
}

/**
 * Configuration for telemetry collectors.
 */
export interface TelemetryCollectorConfig {
    storageEndpoints?: TelemetryStorageEndpoint[], // Endpoints where collected telemetry data should be stored.
    dataFormat?: TelemetryDataFormat // The format of the telemetry data.
    authentication?: { // Optional authentication config for accessing the storage endpoints.
        method: 'Bearer' | 'Basic' | 'APIKey';
        credentials: string | { apiKey: string; secret: string; };
    };
    batchSize?: number; // The number of telemetry data items to process in a single batch.
    flushInterval?: number; // The interval (in milliseconds) at which to flush data to storage.
    retryPolicy?: { // Policy for retrying failed storage attempts.
        maxRetries?: number; // The maximum number of retry attempts.
        initialDelay?: number; // The initial delay (in milliseconds) before retrying.
        backoffFactor?: number; // The factor by which the delay increases after each retry.
    };
}

/**
 * Abstract base class for telemetry collectors.
 */
export abstract class TelemetryCollector {
    protected telemetryData: any[] = []; // Generic container for the collected telemetry data
    protected _telemetryStorageStrategy?: TelemetryStorageStrategy; // The strategy used for storing the collected telemetry data.

    constructor(protected _config: TelemetryCollectorConfig) {}

    get config() : TelemetryCollectorConfig{
        return this._config || {};
    }

    set config(config: TelemetryCollectorConfig){
        this._config = config;
    }

    get telemetryStorageStrategy(): TelemetryStorageStrategy | undefined{
        return this._telemetryStorageStrategy;
    }

    set telemetryStorageStrategy(strategy: TelemetryStorageStrategy){
        this._telemetryStorageStrategy = strategy;
    }

    /**
     * Collects telemetry data.
     * Implementations should specify what collected telemetry data to collect
     * and how to store it in the `telemetryData` array.
     */
    abstract collectTelemetry(data: any): void;

    /**
     * Stores collected telemetry data in configured storage endpoints.
     * Implementations delegate the storage of metrics to the appropriate telemetry storage
     * strategies, based on the provided `TelemetryCollectorConfig`.
     */
    abstract storeMetrics(): Promise<void>;

    /**
     * Flushes telemetry data at regular intervals or based on certain conditions.
     * Can be overridden by subclasses to provide specific flushing logic.
     */
    async flushData(): Promise<void> {
        // By default, simply call storeMetrics() and clear the telemetryData array.
		try {
			await this.storeMetrics();
			this.telemetryData = [];
		} catch (error){
			console.log(`Error during telemetry data flushing from telemetry collector: ${error}`)
		}
    }

    /**
     * Handles retries for data storage based on the retry policy defined in the config.
     * @param attempt Function representing the storage/data flushing attempt that may fail and need retrying.
     */
    protected async handleRetry(attempt: () => Promise<void>): Promise<void> {
        const { maxRetries = 3, initialDelay = 1000, backoffFactor = 2 } = this._config.retryPolicy || {};
        let retries = 0;
        let delay = initialDelay;

        while (retries < maxRetries) {
            try {
                await attempt();
                return; // Success, exit the retry loop
            } catch (error) {
                retries++;
                console.error(`Attempt ${retries} failed, retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= backoffFactor;
            }
        }

        console.error("All retry attempts failed.");
    }
}