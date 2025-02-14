import { EventEmitter } from "stream";
import { Assessment } from "../assessment/assessment-core";

/**
 * An enum representing the types of telemetry that can be collected.
 */
export enum TelemetryType {
    TRACING = 'tracing', // For tracing events within the application.
    LOGGING = 'logging', // For collecting log data.
    METRICS = 'metrics', // For collecting application metrics.
}

/**
 * An enum representing various user interaction events that can be monitored and traced.
 * These events correspond to standard browser events like clicks, keyboard inputs, and mouse actions.
 */
export enum UserInteractionEvent {
    ABORT, ANIMATION_CANCEL, ANIMATION_END, ANIMATION_ITERATION, ANIMATION_START, AUX_CLICK,
    BLUR,
    CAN_PLAY, CAN_PLAY_THROUGH, CHANGE, CLICK, CLOSE, CONTEXT_MENU, COPY, CUE_CHANGE, CUT,
    DBL_CLICK, DRAG, DRAG_END, DRAG_ENTER, DRAG_LEAVE, DRAG_OVER, DRAG_START, DROP, DURATION_CHANGE,
    EMPTIED, ENDED, ERROR,
    FOCUS, FOCUS_IN, FOCUS_OUT, FULLSCREEN_CHANGE, FULLSCREEN_ERROR,
    GOT_POINTER_CAPTURE,
    INPUT, INVALID,
    KEY_DOWN, KEY_PRESS, KEY_UP,
    LOAD, LOADED_DATA, LOADED_METADATA, LOAD_START, LOST_POINTER_CAPTURE,
    MOUSE_DOWN, MOUSE_ENTER, MOUSE_LEAVE, MOUSE_MOVE, MOUSE_OUT, MOUSE_OVER, MOUSE_UP,
    PASTE, PAUSE, PLAY, PLAYING, POINTER_CANCEL, POINTER_DOWN, POINTER_ENTER, POINTER_LEAVE,
    POINTER_MOVE, POINTER_OUT, POINTER_OVER, POINTER_UP, PROGRESS,
    RATE_CHANGE, RESET, RESIZE,
    SCROLL, SECURITY_POLICY_VIOLATION,
    SEEKED, SEEKING, SELECT, SELECTION_CHANGE, SELECT_START, STALLED, SUBMIT, SUSPEND,
    TIME_UPDATE, TOGGLE, TOUCH_CANCEL, TOUCH_END, TOUCH_MOVE, TOUCH_START, TRANSITION_CANCEL,
    TRANSITION_END, TRANSITION_RUN, TRANSITION_START,
    VOLUME_CHANGE,
    WAITING, WHEEL
}

export namespace UserInteractionEvent {
    /**
     * Returns an array of all possible user interaction events.
     * @returns array of all possible user interaction events.
     */
    export function getAllEvents(): UserInteractionEvent[] {
        return [
            UserInteractionEvent.ABORT,
            UserInteractionEvent.ANIMATION_CANCEL,
            UserInteractionEvent.ANIMATION_END,
            UserInteractionEvent.ANIMATION_ITERATION,
            UserInteractionEvent.ANIMATION_START,
            UserInteractionEvent.AUX_CLICK,
            UserInteractionEvent.BLUR,
            UserInteractionEvent.CAN_PLAY,
            UserInteractionEvent.CAN_PLAY_THROUGH,
            UserInteractionEvent.CHANGE,
            UserInteractionEvent.CLICK,
            UserInteractionEvent.CLOSE,
            UserInteractionEvent.CONTEXT_MENU,
            UserInteractionEvent.COPY,
            UserInteractionEvent.CUE_CHANGE,
            UserInteractionEvent.CUT,
            UserInteractionEvent.DBL_CLICK,
            UserInteractionEvent.DRAG,
            UserInteractionEvent.DRAG_END,
            UserInteractionEvent.DRAG_ENTER,
            UserInteractionEvent.DRAG_LEAVE,
            UserInteractionEvent.DRAG_OVER,
            UserInteractionEvent.DRAG_START,
            UserInteractionEvent.DROP,
            UserInteractionEvent.DURATION_CHANGE,
            UserInteractionEvent.EMPTIED,
            UserInteractionEvent.ENDED,
            UserInteractionEvent.ERROR,
            UserInteractionEvent.FOCUS,
            UserInteractionEvent.FOCUS_IN,
            UserInteractionEvent.FOCUS_OUT,
            UserInteractionEvent.FULLSCREEN_CHANGE,
            UserInteractionEvent.FULLSCREEN_ERROR,
            UserInteractionEvent.GOT_POINTER_CAPTURE,
            UserInteractionEvent.INPUT,
            UserInteractionEvent.INVALID,
            UserInteractionEvent.KEY_DOWN,
            UserInteractionEvent.KEY_PRESS,
            UserInteractionEvent.KEY_UP,
            UserInteractionEvent.LOAD,
            UserInteractionEvent.LOADED_DATA,
            UserInteractionEvent.LOADED_METADATA,
            UserInteractionEvent.LOAD_START,
            UserInteractionEvent.LOST_POINTER_CAPTURE,
            UserInteractionEvent.MOUSE_DOWN,
            UserInteractionEvent.MOUSE_ENTER,
            UserInteractionEvent.MOUSE_LEAVE,
            UserInteractionEvent.MOUSE_MOVE,
            UserInteractionEvent.MOUSE_OUT,
            UserInteractionEvent.MOUSE_OVER,
            UserInteractionEvent.MOUSE_UP,
            UserInteractionEvent.PASTE,
            UserInteractionEvent.PAUSE,
            UserInteractionEvent.PLAY,
            UserInteractionEvent.PLAYING,
            UserInteractionEvent.POINTER_CANCEL,
            UserInteractionEvent.POINTER_DOWN,
            UserInteractionEvent.POINTER_ENTER,
            UserInteractionEvent.POINTER_LEAVE,
            UserInteractionEvent.POINTER_MOVE,
            UserInteractionEvent.POINTER_OUT,
            UserInteractionEvent.POINTER_OVER,
            UserInteractionEvent.POINTER_UP,
            UserInteractionEvent.PROGRESS,
            UserInteractionEvent.RATE_CHANGE,
            UserInteractionEvent.RESET,
            UserInteractionEvent.RESIZE,
            UserInteractionEvent.SCROLL,
            UserInteractionEvent.SECURITY_POLICY_VIOLATION,
            UserInteractionEvent.SEEKED,
            UserInteractionEvent.SEEKING,
            UserInteractionEvent.SELECT,
            UserInteractionEvent.SELECTION_CHANGE,
            UserInteractionEvent.SELECT_START,
            UserInteractionEvent.STALLED,
            UserInteractionEvent.SUBMIT,
            UserInteractionEvent.SUSPEND,
            UserInteractionEvent.TIME_UPDATE,
            UserInteractionEvent.TOGGLE,
            UserInteractionEvent.TOUCH_CANCEL,
            UserInteractionEvent.TOUCH_END,
            UserInteractionEvent.TOUCH_MOVE,
            UserInteractionEvent.TOUCH_START,
            UserInteractionEvent.TRANSITION_CANCEL,
            UserInteractionEvent.TRANSITION_END,
            UserInteractionEvent.TRANSITION_RUN,
            UserInteractionEvent.TRANSITION_START,
            UserInteractionEvent.VOLUME_CHANGE,
            UserInteractionEvent.WAITING,
            UserInteractionEvent.WHEEL
        ];
    }

    /**
     * Returns an array of primary user interaction events (e.g., CHANGE, CLICK, SELECT, SUBMIT).
     * @returns an array of primary user interaction events (e.g., CHANGE, CLICK, SELECT, SUBMIT).
     */
    export function getMainEvents(): UserInteractionEvent[] {
        return [
            UserInteractionEvent.CHANGE,
            UserInteractionEvent.CLICK,
            UserInteractionEvent.SELECT,
            UserInteractionEvent.SUBMIT
        ];
    }
}

/**
 * An interface defining the configuration for telemetry collection.
 * It specifies the types of telemetry to collect and optionally
 * allows selecting specific user interaction events to monitor.
 */
export interface TelemetryConfig {
    telemetryTypes: TelemetryType[]; // An array of TelemetryType indicating the types of telemetry to collect.
    userInteractionEvents?: UserInteractionEvent[]; // Optional array of UserInteractionEvent to monitor.
}

/**
 * An enum specifying possible destinations for exporting telemetry data
 */
export enum TelemetryExportDestinationType {
    CONSOLE = 'console', // Exports telemetry to the console.
    LOCAL_COLLECTOR = 'collector.local', // Exports to a local telemetry collector.
    REMOTE_COLLECTOR = 'collector.remote', // Exports to a remote telemetry collector.
}

/**
 * An enum specifying protocols for exporting telemetry data
 */
export enum TelemetryExportProtocol {
    OTLP = 'OTLP', // OpenTelemetry Protocol for telemetry data export.
    WEB_SOCKETS = 'WebSockets', // WebSocket protocol for real-time telemetry export.
}

/**
 * An interface representing the configuration for telemetry export destinations.
 */
export interface TelemetryExportDestination {
    type: TelemetryExportDestinationType, // The type of export destination (TelemetryExportDestinationType).
    protocol?: TelemetryExportProtocol, // The protocol to use for exporting (TelemetryExportProtocol).
    url?: string, // The URL of the destination.
    port?: number // The port number of the destination.
}

/**
 * An enum specifying possible data formats for telemetry data
 */
export type TelemetryDataFormat = 'CSV' | 'JSON' | 'XML';

/**
 * An enum specifying storage types for telemetry data
 */
export enum TelemetryStorageEndpointType {
    FILE, // Store telemetry data in files.
    DATABASE, // Store telemetry data in a database.
}

/**
 * An interface defining a storage endpoint for telemetry data.
 */
export interface TelemetryStorageEndpoint {
    type: TelemetryStorageEndpointType, // The type of storage endpoint (TelemetryStorageEndpointType).
    name: string, // A human-readable name for the endpoint.
    uri: string // The URI of the endpoint (e.g., file path or database connection string).
}

/**
 * An abstract base class for telemetry data sources.
 * Defines the operations required for connecting, reading, and storing telemetry data.
 */
export abstract class TelemetryDataSource {

    /**
     * Initializes the telemetry data source with a specific data source configuration.
     * @param {TelemetryDataSourceConfig } config - The configuration for the telemetry data source.
     */
    constructor(
        public config: TelemetryDataSourceConfig) { }


    /**
     * Establishes a connection to the data source.
     */
    abstract connect(): Promise<void>;

    /**
     * Disconnects from the data source.
     */
    abstract disconnect(): Promise<void>;

    /**
     * Reads telemetry data with an optional filter.
     * @param filter any filter to apply on the telemetry to read
     */
    abstract read(filter?: any): Promise<any | any[]>;

    /**
     * Stores a single data item.
     * @param {any} data - The data to store.
     */
    abstract store(data: any): Promise<void>;

    /**
     * Stores multiple data items.
     * @param {any[]} data - The array of data items to store.
     */
    abstract storeAll(data: any[]): Promise<void>;

    /**
     * Stores assessment results in the data source
     * @param assessments The obtained assessment results
     * @param filter any filter to apply on the assessments to store
     */
    abstract storeAssessments(assessments: Assessment[], filter?: any): Promise<void>;
}

/**
 * An interface defining the configuration for telemetry data sources.
 */
export interface TelemetryDataSourceConfig {
    storageEndpoint: TelemetryStorageEndpoint, // The target storage endpoint.
    dataFormat?: TelemetryDataFormat, // The format of the telemetry data.
}

/**
 * An interface for configuring telemetry collectors.
 */
export interface TelemetryCollectorConfig {
    storageEndpoints?: TelemetryStorageEndpoint[], // The storage endpoints for collected telemetry data
    dataFormat?: TelemetryDataFormat // The data format (CSV, JSON, XML)
    port?: number; // The server port for the telemetry collector
    authentication?: { // Optional authentication config for accessing the storage endpoints.
        method: 'Bearer' | 'Basic' | 'APIKey';
        credentials: string | { apiKey: string; secret: string; };
    };
    batchSize?: number; // Number of telemetry data items to process in a batch.
    flushInterval?: number; // Interval (in ms) for flushing data to storage.
    retryPolicy?: { // Configuration for retrying failed storage attempts
        maxRetries?: number; // The maximum number of retry attempts.
        initialDelay?: number; // The initial delay (in milliseconds) before retrying.
        backoffFactor?: number; // The factor by which the delay increases after each retry.
    };
}

/**
 * An abstract base class for telemetry collectors, responsible for
 * collecting, processing, and storing telemetry data.
 */
export abstract class TelemetryCollector {
    protected telemetryData: any[] = []; // Generic container for the collected telemetry data
    protected _telemetryDataSource?: TelemetryDataSource; // The data source for reading/storing telemetry data.
    private eventEmitter = new EventEmitter(); // Used to notify listeners upon flushing new data to telemetry backends

    constructor(protected _config: TelemetryCollectorConfig) { }

    /**
     * Gets the telemetry collector configuration
     */
    get config(): TelemetryCollectorConfig {
        return this._config || {};
    }

    /**
     * Sets the telemetry collector configuration
     */
    set config(config: TelemetryCollectorConfig) {
        this._config = config;
    }

    /**
     * Gets the telemetry collector data source
     */
    get telemetryDataSource(): TelemetryDataSource | undefined {
        return this._telemetryDataSource;
    }

    /**
     * Sets the telemetry collector data source
     */
    set telemetryDataSource(telemetryDataSource: TelemetryDataSource) {
        this._telemetryDataSource = telemetryDataSource;
    }

    /* Event handling methods */

    /**
     * Registers a listener for the `dataFlushed` event.
     * @param event The `dataFlushed` event
     * @param listener the listener for the dataFlushed event
     */
    on(event: 'dataFlushed', listener: (endpoints: TelemetryStorageEndpoint[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Emits a `dataFlushed` event with the provided data.
     * @param event The `dataFlushed` event
     * @param data The emitted data
     */
    emit(event: 'dataFlushed', data: any): void {
        this.eventEmitter.emit(event, data);
    }

    /**
     * Abstract method to collect telemetry data
     */
    abstract collectTelemetry(data: any): void;

    /**
     * Abstract method to store telemetry data in configured storage endpoints
     */
    abstract storeTelemetry(): Promise<void>;

    /**
     * Stores assessments along with telemetry data in configured storage endpoints
     * @param assessments The assessments to store
     * @param filter Optional filter to apply upon storing the assessments
     */
    abstract storeAssessments(assessments: Assessment[], filter?: any): Promise<void>;

    /**
     * Flushes telemetry data at regular intervals or based on certain conditions.
     * Can be overridden by subclasses to provide specific flushing logic.
     */
    async flushData(): Promise<void> {
        // By default, simply call storeMetrics() and clear the telemetryData array.
        try {
            await this.storeTelemetry();
            this.emit('dataFlushed', this._config.storageEndpoints); // Notify listeners
            this.telemetryData = [];
        } catch (error) {
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