import { EventEmitter } from "stream";
import { Assessment } from "../assessment/assessment-core";

/**
 * Enumerates the types of telemetry that can be collected.
 */
export enum TelemetryType {
    TRACING = 'tracing',
    LOGGING = 'logging',
    METRICS = 'metrics',
}

/**
 * Enumerates possible user interaction events that can be monitored and traced.
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
 * Configuration interface for telemetry collection.
 * It allows specifying which types of telemetry to collect, and optionally, which user interaction events to monitor.
 */
export interface TelemetryConfig {
    telemetryTypes: TelemetryType[];
    userInteractionEvents?: UserInteractionEvent[]; // Optional, only if user interaction events are to be monitored
}

/**
 * Enumerates the types of destinations where telemetry data can be exported.
 */
export enum TelemetryExportDestinationType {
    CONSOLE = 'console',
    LOCAL_COLLECTOR = 'collector.local',
    REMOTE_COLLECTOR = 'collector.remote',
}

/**
 * Enumerates the protocols that can be used for exporting telemetry data
 */
export enum TelemetryExportProtocol {
    OTLP = 'OTLP', // OpenTelemetry Protocol for telemetry data export.
    WEB_SOCKETS = 'WebSockets', // WebSocket protocol for real-time telemetry data export.
}

/**
 * Defines the structure of a telemetry export destination.
 */
export interface TelemetryExportDestination {
    type: TelemetryExportDestinationType, // The type of the destination.
    protocol?: TelemetryExportProtocol, // The protocol used for exporting data.
    url?: string, // The URL of the destination.
    port?: number // The port of the destination.
}

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
 * Abstract base class for telemetry data sources.
 * Defines the basic structure and operations required 
 * for reading and storing telemetry data.
 */
export abstract class TelemetryDataSource {

    /**
     * Initializes the telemetry data source with a specific data source configuration.
     * @param {TelemetryDataSourceConfig } config - The configuration for the telemetry data source.
     */
    constructor(
        public config: TelemetryDataSourceConfig) { }


    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract read(filter?: any): Promise<any | any[]>;

    /**
     * Stores a single piece of data.
     * @param {any} data - The data to store.
     */
    abstract store(data: any): Promise<void>;

    /**
     * Stores an array of data items.
     * @param {any[]} data - The array of data items to store.
     */
    abstract storeAll(data: any[]): Promise<void>;

    abstract storeAssessments(assessments: Assessment[], filter?: any): Promise<void>;
}

/**
 * Configuration for telemetry data sources.
 */
export interface TelemetryDataSourceConfig {
    storageEndpoint: TelemetryStorageEndpoint, // The concerned storage endpoint.
    dataFormat?: TelemetryDataFormat, // The format of the telemetry data.
}

/**
 * Configuration for telemetry collectors.
 */
export interface TelemetryCollectorConfig {
    storageEndpoints?: TelemetryStorageEndpoint[], // Endpoints where collected telemetry data should be stored.
    dataFormat?: TelemetryDataFormat // The format of the telemetry data.
    port?: number; // The telemetry collector server port number
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
    protected _telemetryDataSource?: TelemetryDataSource; // The data source for reading/storing telemetry data.
    private eventEmitter = new EventEmitter(); // Used to notify listeners upon flushing new data to telemetry backends

    constructor(protected _config: TelemetryCollectorConfig) { }

    get config(): TelemetryCollectorConfig {
        return this._config || {};
    }

    set config(config: TelemetryCollectorConfig) {
        this._config = config;
    }

    get telemetryDataSource(): TelemetryDataSource | undefined {
        return this._telemetryDataSource;
    }

    set telemetryDataSource(telemetryDataSource: TelemetryDataSource) {
        this._telemetryDataSource = telemetryDataSource;
    }

    // Event handling methods
    on(event: 'dataFlushed', listener: (endpoints: TelemetryStorageEndpoint[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    emit(event: 'dataFlushed', data: any): void {
        this.eventEmitter.emit(event, data);
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
    abstract storeTelemetry(): Promise<void>;

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