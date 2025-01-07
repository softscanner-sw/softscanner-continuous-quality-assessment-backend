import * as path from "path";
import { ApplicationMetadata } from "../application-core";
import { Metric } from "../metrics/metrics-core";
import { DependencyManager } from "../util/dependency-management";

/**
 * Represents a single file of source code to be used in instrumentation.
 */
export interface Instrumentation {
    fileName: string; // The name of the file, including its extension.
    content: string; // The source code content of the file.
    path?: string; // The absolute path of the instrumentation file
    parentPath?: string; // The absolute path of the instrumentation file's parent folder.
    srcPath?: string; // The absolute path of the instrumentation file's root src/ folder
    projectRootPath?: string // The absolute path of the instrumented project's root folder
}

export type ApplicationInstrumentationMetadata = {
    appMetadata: ApplicationMetadata,
    bundleName: string
}

/**
 * Represents the structure of an instrumentation bundle
 */
export interface InstrumentationBundle {
    fileName: string;// The name of the bundle file, including its extension.
    files: Instrumentation[]; // The instrumentation files bundled by this bundle
    path?: string; // The absolute path of the instrumentation bundle file
    parentPath?: string; // The absolute path of the instrumentation bundle file's parent folder.
    projectRootPath?: string; // The absolute path of the instrumented project's root folder
    creationDate?: string; // The creation date of the bundle
}

/**
 * Abstract class that provides a base for instrumentation bundles.
 * It encapsulates common properties and getters for subclasses.
 */
export abstract class AbstractInstrumentationBundle {
    constructor(
        protected _fileName: string,
        protected _instrumentationfiles: Instrumentation[] = [],
        protected _path?: string,
        protected _parentPath?: string,
        protected _projectRootPath?: string,
        protected _creationDate?: string,
    ){

    }

    get fileName(){
        return this._fileName;
    }

    get path(){
        return this._path;
    }

    get parentPath(){
        return this._parentPath;
    }

    get projectRootPath(){
        return this._projectRootPath;
    }

    get creationDate(){
        return this._creationDate;
    }

    get files(): Instrumentation[]{
        return this._instrumentationfiles;
    }
}

/**
 * Default implementation of the AbstractInstrumentationBundle.
 * Useful as a fallback or placeholder configuration
 */
export class DefaultInstrumentationBundle extends AbstractInstrumentationBundle {
    constructor(){
        super('', [], '', '', '');
    }
}

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
    export function getAllEvents(): UserInteractionEvent[]{
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

    export function getMainEvents(): UserInteractionEvent[]{
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
export enum TelemetryExportProtocol{
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
 * Defines a strategy for generating instrumentation files.
 * Concrete implementations will specify how files are generated based on the strategy.
 */
export interface InstrumentationStrategy {
    generateInstrumentationFiles(): Instrumentation[];
}

/**
 * Abstract base class for instrumentation strategies.
 * Provides common attributes and utility methods for concrete strategy implementations.
 */
export abstract class AbstractInstrumentationStrategy implements InstrumentationStrategy {
    /* ATTRIBUTES */
    protected _projectRootPath: string; // Root path for the application's instrumentation files
    protected _srcPath: string; // Source directory for the application's instrumentation files
    /* CONSTRUCTOR */
    constructor(
        protected _config: TelemetryConfig,
        protected _application: ApplicationMetadata,
        protected _instrumentationFilesRootFolder: string = path.join('assets', 'instrumentations'),
        protected _instrumentationBundleRootFolder: string = path.join('assets', 'bundles')
    ) {
        this._projectRootPath = path.join(this._instrumentationFilesRootFolder, this._application.generateNormalizedApplicationName('_'));
        this._srcPath = path.join(this._projectRootPath, 'src');
    }

    /* METHODS */
    // Getters for accessing strategy attributes.
    get application(): ApplicationMetadata{
        return this._application;
    }

    get config(): TelemetryConfig{
        return this._config;
    }

    get projectRootPath(): string{
        return this._projectRootPath;
    }

    get srcPath(): string{
        return this._srcPath;
    }

    get instrumentationFilesRootFolder(): string{
        return this._instrumentationFilesRootFolder;
    }

    get instrumentationBundleRootFolder(): string{
        return this._instrumentationBundleRootFolder;
    }

    // Abstract methods that subclasses must implement.
    public abstract generateInstrumentationFiles(): Instrumentation[];
    public abstract generateImportations(): string;
    public abstract generateConstants(): string;
}

/**
 * Provides a default implementation for an instrumentation strategy.
 * Useful as a fallback or placeholder strategy.
 */
export class DefaultInstrumentationStrategy implements InstrumentationStrategy{
    public generateInstrumentationFiles(): Instrumentation[] {
        return [];
    }
}

/**
 * Abstract base class for an instrumentation generator.
 * Encapsulates the common functionality required to generate and bundle instrumentation files.
 */
export abstract class InstrumentationGenerator {
    protected instrumentations: Instrumentation[] = []; // The generated instrumentation files.
    protected dependencies: string[] = []; // The dependencies required for the instrumentation.
    protected telemetryConfig?: TelemetryConfig; // Configuration for telemetry collection.
    protected _instrumentationStrategy: InstrumentationStrategy = new DefaultInstrumentationStrategy(); // Strategy for generating instrumentation files.
    protected instrumentationBundle: InstrumentationBundle = new DefaultInstrumentationBundle(); // The generated instrumentation bundle.

    /**
     * Constructs an instance of the InstrumentationGenerator.
     * @param application The metadata of the application being instrumented.
     * @param metrics An array of metrics that determine the types of telemetry needed.
     */
    constructor(
        protected application: ApplicationMetadata,
        protected metrics: Metric[] // obtained through a MetricsMapper instance
    ){}

    // Getters and setters for accessing and updating the instrumentation strategy.
    get instrumentationStrategy(){
        return this._instrumentationStrategy;
    }

    set instrumentationStrategy(strategy: InstrumentationStrategy){
        this._instrumentationStrategy = strategy;
    }

    /**
     * Determines if the generator requires a specific type of telemetry.
     * @param telemetryType The type of telemetry to check for.
     * @returns A boolean indicating if the specified telemetry type is required.
     */
    public requiresTelemetryType(telemetryType: TelemetryType): boolean{
        return this.metrics.some(metric => metric.hasRequiredTelemetry(telemetryType));
    }

    public configureTelemetry(telemetryConfig: TelemetryConfig): void {
        this.telemetryConfig = telemetryConfig;
    }

    public async validateDependencies(): Promise<boolean> {
        if(!DependencyManager.areDependenciesInstalled(this.instrumentationDependencies())){
            console.log("Some dependencies are missing. Attempting to install...");
            DependencyManager.installNPMDependencies(this.instrumentationDependencies());
            return DependencyManager.areDependenciesInstalled(this.instrumentationDependencies());
        }

        return true;
    }

    /**
     * Retrieves the instrumentation files generated by this generator.
     * @returns An array of Instrumentation objects representing the generated files.
     */
    public getInstrumentationFiles(): Instrumentation[] {
        return this.instrumentations;
    }

    public getInstrumentationBundle(): InstrumentationBundle{
        return this.instrumentationBundle;
    }

    /**
     * Generates an import statement for importing specific elements from a module.
     * @param imported A comma-separated list of elements to import.
     * @param from The module from which to import the elements.
     * @returns A string representing the import statement.
     */
    public static generateImportFromStatement(imported: string, from: string){
        return `import { ${imported} } from '${from}';`;
    }

    /**
     * Generates an import statement for importing an entire module.
     * @param imported The module to import.
     * @returns A string representing the import statement without specifying individual elements.
     */
    public static generateImportStatement(imported: string){
        return `import "${imported}";`;
    }

    /**
     * Must be implemented to return a list of dependency names required for the instrumentation.
     * @returns An array of string representing dependency names.
     */
    public abstract instrumentationDependencies(): string[];

    /**
     * Must be implemented to generate the actual instrumentation files.
     * Will use the instrumentation strategy in the process
     */
    public abstract generateInstrumentationFiles(): void;

    /**
     * Must be implemented to bundle the generated instrumentation files into a single executable package.
     */
    public abstract generateInstrumentationBundle(): Promise<void>;
}