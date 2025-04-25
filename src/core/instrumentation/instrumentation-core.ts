import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { ApplicationMetadata } from "../application/application-metadata";
import { Metric } from "../metrics/metrics-core";
import { TelemetryConfig, TelemetryType } from "../telemetry/telemetry";
import { NPMDependencyManager } from "../util/dependency-management";

/**
 * Represents a single file of source code to be used in instrumentation.
 */
export interface Instrumentation {
    fileName: string;         // The name of the file, including its extension (e.g., "instrumentation.js").
    content: string;          // The source code content of the instrumentation file.
    path?: string;            // The absolute path of the file on the filesystem.
    parentPath?: string;      // The absolute path of the parent directory of the file.
    srcPath?: string;         // The absolute path of the src/ directory where the file is located.
    projectRootPath?: string; // The absolute path of the root directory of the instrumented project.
}

/**
 * Represents application metadata and name/path of the generated instrumentation bundle
 */
export type ApplicationInstrumentationMetadata = {
    appMetadata: ApplicationMetadata;  // Metadata describing the application (e.g., name, type, technology).
    bundleName: string;                // Name of the generated instrumentation bundle.
};

/**
 * Represents the structure of an instrumentation bundle.
 */
export interface InstrumentationBundle {
    fileName: string;          // The name of the bundle file (e.g., "bundle.js").
    files: Instrumentation[];  // An array of instrumentation files contained in the bundle.
    path?: string;             // Absolute path of the bundle on the filesystem.
    parentPath?: string;       // Parent directory of the bundle file.
    projectRootPath?: string;  // Root directory of the instrumented project.
    creationDate?: string;     // The date the bundle was created.
}

/**
 * Abstract class that provides a base for handling instrumentation bundles.
 * It encapsulates common properties and getters for subclasses.
 */
export abstract class AbstractInstrumentationBundle implements InstrumentationBundle {
    constructor(
        protected _fileName: string,
        protected _instrumentationfiles: Instrumentation[] = [],
        protected _path?: string,
        protected _parentPath?: string,
        protected _projectRootPath?: string,
        protected _creationDate?: string,
    ) { }

    /* Getters of properties */

    /**
     * Gets the file name of the instrumentation bundle
     */
    get fileName() {
        return this._fileName;
    }

    /**
     * Gets the file path of the instrumentation bundle
     */
    get path() {
        return this._path;
    }

    /**
     * Gets the parent folder path of the instrumentation bundle
     */
    get parentPath() {
        return this._parentPath;
    }

    /**
     * Gets the project root path of the instrumentation project from which the bundle is generated
     */
    get projectRootPath() {
        return this._projectRootPath;
    }

    /**
     * Gets the creation data of the instrumentation bundle
     */
    get creationDate() {
        return this._creationDate;
    }

    /**
     * Gets the instrumentation files bundled into this instrumentation bundle
     */
    get files(): Instrumentation[] {
        return this._instrumentationfiles;
    }

    /**
     * Extracts the normalized application name from the bundle name.
     * @param bundleName The bundle file name.
     * @param separator Character used to split the bundle name (default: '_').
     * @returns Normalized application name (e.g., "my_app" -> "my").
     */
    static extractNormalizedAppNameFromBundle(bundleName: string, separator: string = '_'): string {
        if (!bundleName) {
            console.warn(`Abstract Instrumentation Bundle: Invalid bundle name: ${bundleName}`);
            return '';
        }

        const parts = bundleName.split(separator);
        return parts.length > 0 ? parts[0].trim() : '';
    }
}

/**
 * Default implementation of the AbstractInstrumentationBundle.
 * Useful as a fallback or placeholder configuration
 */
export class DefaultInstrumentationBundle extends AbstractInstrumentationBundle {
    constructor() {
        super('', [], '', '', '');
    }
}

/**
 * An interface that defines a strategy for generating instrumentation files.
 * Concrete implementations will specify how files are generated based on the strategy.
 */
export interface InstrumentationStrategy {
    generateInstrumentationFiles(): Instrumentation[];
}

/**
 * Abstract base class for instrumentation strategies.
 * It defines the core logic for instrumentation strategies, such as generating instrumentation files,
 * constants, and import statements.
 */
export abstract class AbstractInstrumentationStrategy implements InstrumentationStrategy {
    protected _projectRootPath: string; // Root path for the application's instrumentation files
    protected _srcPath: string; // Source directory for the application's instrumentation files

    constructor(
        protected _config: TelemetryConfig, // Configuration for telemetry collection.
        protected _application: ApplicationMetadata, // Metadata of the target application.
        protected _instrumentationFilesRootFolder: string = path.join('assets', 'instrumentations'),
        protected _instrumentationBundleRootFolder: string = path.join('assets', 'bundles')
    ) {
        this._projectRootPath = path.join(this._instrumentationFilesRootFolder, this._application.generateNormalizedApplicationName('_'));
        this._srcPath = path.join(this._projectRootPath, 'src');
    }


    /* Getters for accessing strategy attributes */

    /**
     * Gets the metadata of the target application
     */
    get application(): ApplicationMetadata {
        return this._application;
    }

    /**
     * Gets the configuration for telemetry collection
     */
    get config(): TelemetryConfig {
        return this._config;
    }

    /**
     * Gets the root folder path of the instrumentation project
     */
    get projectRootPath(): string {
        return this._projectRootPath;
    }

    /**
     * Gets the source folder path of the instrumentation project
     */
    get srcPath(): string {
        return this._srcPath;
    }

    /**
     * Gets the root folder path of all instrumentation projects
     */
    get instrumentationFilesRootFolder(): string {
        return this._instrumentationFilesRootFolder;
    }

    /**
     * Gets the root folder path of all instrumentation bundles
     */
    get instrumentationBundleRootFolder(): string {
        return this._instrumentationBundleRootFolder;
    }

    /* Abstract methods that subclasses must implement */

    /**
     * Abstract method for the generation of instrumentation files for the instrumentation project
     */
    public abstract generateInstrumentationFiles(): Instrumentation[];

    /**
     * Abstract method for the generation of the necessary importations for the instrumentation files
     */
    public abstract generateImportations(): string;

    /**
     * Abstract method for the generation of constant variables in the instrumentation files
     */
    public abstract generateConstants(): string;
}

/**
 * Provides a default implementation for an instrumentation strategy.
 * Useful as a fallback or placeholder strategy.
 */
export class DefaultInstrumentationStrategy extends AbstractInstrumentationStrategy {

    constructor(
        _config: TelemetryConfig, // Configuration for telemetry collection.
        _application: ApplicationMetadata, // Metadata of the target application.
        _instrumentationFilesRootFolder: string = path.join('assets', 'instrumentations'),
        _instrumentationBundleRootFolder: string = path.join('assets', 'bundles')
    ) {
        super(_config, _application, _instrumentationFilesRootFolder, _instrumentationBundleRootFolder);
    }

    public generateImportations(): string {
        throw new Error("Method not implemented.");
    }

    public generateConstants(): string {
        throw new Error("Method not implemented.");
    }

    public generateInstrumentationFiles(): Instrumentation[] {
        return [];
    }
}

/**
 * Abstract base class for an instrumentation generator.
 * It defines the blueprint for generating and managing instrumentation files and bundles.
 */
export abstract class InstrumentationGenerator {
    protected instrumentations: Instrumentation[] = []; // Array of generated instrumentation files.
    protected dependencies: string[] = [];              // Array of required dependencies for instrumentation.
    protected _instrumentationStrategy: AbstractInstrumentationStrategy;
    protected instrumentationBundle: InstrumentationBundle;
    protected instrumentationBundler: InstrumentationBundler;

    /**
     * Constructs an instance of the InstrumentationGenerator.
     * @param application The metadata of the application being instrumented.
     * @param metrics An array of metrics that determine the types of telemetry needed.
     */
    constructor(
        protected application: ApplicationMetadata,     // Metadata of the target application.
        protected metrics: Metric[],                     // Metrics mapped to required telemetry.
        protected telemetryConfig?: TelemetryConfig       // Configuration for telemetry.
    ) {
        this._instrumentationStrategy = new DefaultInstrumentationStrategy(this.telemetryConfig!, application);
        this.instrumentationBundle = new DefaultInstrumentationBundle();
        this.instrumentationBundler = new DefaultInstrumentationBundler(this._instrumentationStrategy, this.instrumentationBundle);

    }

    /* Getters and setters for accessing and updating the instrumentation strategy */

    /**
     * Gets the instrumentation strategy of the instrumentation generator
     */
    get instrumentationStrategy(): AbstractInstrumentationStrategy {
        return this._instrumentationStrategy;
    }

    /**
     * Sets the instrumentation strategy of the instrumentation generator
     */
    set instrumentationStrategy(strategy: AbstractInstrumentationStrategy) {
        this._instrumentationStrategy = strategy;
    }

    /**
     * Sets a new telemetry configuration for this instrumentation generator
     * @param telemetryConfig - A new telemetry configuration
     */
    public configureTelemetry(telemetryConfig: TelemetryConfig): void {
        this.telemetryConfig = telemetryConfig;
    }

    /**
     * Checks if the generator requires a specific type of telemetry.
     * @param telemetryType The type of telemetry to check for (e.g., "tracing", "metrics").
     * @returns true if the telemetry type is required.
     */
    public requiresTelemetryType(telemetryType: TelemetryType): boolean {
        return this.metrics.some(metric => metric.hasRequiredTelemetry(telemetryType));
    }

    /**
     * Checks if the necessary dependencies are installed for the instrumentation generator,
     * And if not ensures they are installed.
     * @returns - true if all the necessary dependencies are installed and validated, false otherwise
     */
    public async validateDependencies(): Promise<boolean> {
        if (!NPMDependencyManager.areDependenciesInstalled(this.instrumentationDependencies())) {
            console.log("Instrumentation Generator: Some dependencies are missing. Attempting to install...");
            NPMDependencyManager.installNPMDependencies(this.instrumentationDependencies());
            return NPMDependencyManager.areDependenciesInstalled(this.instrumentationDependencies());
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

    /**
     * Retrieves the instrumentation bundle generated by this generator.
     * @returns - An instrumentation bundle of the instrumentation files created by this instrumentation generator
     */
    public getInstrumentationBundle(): InstrumentationBundle {
        return this.instrumentationBundle;
    }

    /**
     * Generates an import statement for importing specific elements from a module.
     * @param imported A comma-separated list of elements to import.
     * @param from The module from which to import the elements.
     * @returns A string representing the import statement.
     */
    public static generateImportFromStatement(imported: string, from: string) {
        return `import { ${imported} } from '${from}';`;
    }

    /**
     * Generates an import statement for importing an entire module.
     * @param imported The module to import.
     * @returns A string representing the import statement without specifying individual elements.
     */
    public static generateImportStatement(imported: string) {
        return `import "${imported}";`;
    }

    /**
     * An abstract method to define the dependency names for the instrumentation generator
     * Must be implemented to return a list of dependency names required for the instrumentation.
     * @returns An array of string representing dependency names.
     */
    public abstract instrumentationDependencies(): string[];

    /**
     * An abstract method to generate the instrumentation files by the instrumentation generator
     * Must be implemented to generate the actual instrumentation files.
     * Will use the instrumentation strategy in the process
     */
    public abstract generateInstrumentationFiles(): Promise<void>;

    /**
     * An abstract method to generate the instrumentation bundle by the instrumentation generator
     * Must be implemented to bundle the generated instrumentation files into a single executable package.
     */
    public abstract generateInstrumentationBundle(): Promise<void>;
}

export abstract class InstrumentationBundler {
    constructor(
        public instrumentationStrategy: AbstractInstrumentationStrategy,
        public instrumentationBundle: InstrumentationBundle,
    ) { }

    abstract generateInstrumentationBundle(): Promise<void>;
}

export class DefaultInstrumentationBundler extends InstrumentationBundler {
    constructor(
        instrumentationStrategy: AbstractInstrumentationStrategy,
        instrumentationBundle: InstrumentationBundle,
    ) {
        super(instrumentationStrategy, instrumentationBundle);
    }

    async generateInstrumentationBundle() {

    }
}

/**
 * Abstract class to define a blueprint for bundle injection into different types of applications.
 * It provides a structured process to inject an instrumentation bundle into a target application,
 * accommodating for custom pre and post injection steps.
 */
export abstract class InstrumentationBundleInjector {

    /**
     * Constructor to initialize the bundle injector.
     * @param application The target application metadata.
     * @param bundle The generated instrumentation bundle.
     * @param bundleDestinationParentPath Absolute path of the parent folder in the application where the bundle will be placed.
     */
    constructor(
        protected application: ApplicationMetadata, // the target application
        protected bundle: InstrumentationBundle, // The generated instrumentation bundle.
        protected bundleDestinationParentPath: string = "", // The destination folder path in the application where the bundle will be placed.
    ) { }

    /**
     * Template method to process the bundle injection.
     * Orchestrates the injection process by calling methods in a specific sequence.
     */
    public async process() {
        await this.preInject();
        await this.inject();
        await this.postInject();
    }

    /**
     * Method to define actions to be performed before injection.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract preInject(): Promise<void>;

    /**
     * Method to define bundle injection into the target web application.
     * To be implemented by subclasses based on specific needs
     */
    protected abstract inject(): Promise<void>;

    /**
     * Method to define actions to be performed after injection.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract postInject(): Promise<void>;
}

export abstract class FrontendInstrumentationBundleInjector extends InstrumentationBundleInjector {
    /**
     * Constructor to initialize the frontend bundle injector.
     * @param application The target frontend application metadata.
     * @param bundle The generated instrumentation bundle.
     * @param bundleDestinationParentPath Absolute path of the parent folder in the application where the bundle will be placed.
     * @param targetHTMLPagePath Absolute path to the HTML page where the bundle will be injected.
     */
    constructor(
        application: ApplicationMetadata, // the target application
        bundle: InstrumentationBundle, // The generated instrumentation bundle.
        bundleDestinationParentPath: string = "", // The destination folder path in the application where the bundle will be placed.
        protected targetHTMLPagePath: string = "", // the target HTML page path where the bundle will be injected
    ) {
        super(application, bundle, bundleDestinationParentPath);
    }

    /**
     * Injects the bundle into the target HTML page of the frontend app by appending a <script> tag.
     * This default implementation can be overridden by subclasses if needed.
     */
    protected async inject(): Promise<void> {
        if (!existsSync(this.targetHTMLPagePath)) {
            console.error(`Frontend Instrumentation Bundle Injector: Target HTML page does not exist: ${this.targetHTMLPagePath}`);
            return;
        }

        // Compute the relative path from the target HTML page to the bundle
        const relativePathToBundle = path.relative(path.dirname(this.targetHTMLPagePath), path.join(this.bundleDestinationParentPath, this.bundle.fileName));

        // Convert backslashes to forward slashes for cross-platform compatibility in HTML
        const scriptPath = relativePathToBundle.replace(/\\/g, '/');

        console.log(`Frontend Instrumentation Bundle Injector: Relative path for injection: ${scriptPath}`);

        // Preparing the <script> element to inject
        const bundleScriptTag = `<script src="${scriptPath}"></script>`;

        // Read and update the target HTML page's content by appending the script to <body>'s content
        const htmlContent = readFileSync(this.targetHTMLPagePath, 'utf8');
        const updatedHtmlContent = htmlContent.replace('</body>', `${bundleScriptTag}</body>`);

        // Write updates to the file
        writeFileSync(this.targetHTMLPagePath, updatedHtmlContent);
        console.log(`Frontend Instrumentation Bundle Injector: Instrumentation bundle injected successfully into ${this.targetHTMLPagePath}`);
    }
}

export abstract class BackendInstrumentationBundleInjector extends InstrumentationBundleInjector {
    /**
     * Constructor to initialize the backend bundle injector.
     * @param application The target backend application metadata.
     * @param bundle The generated instrumentation bundle.
     * @param bundleDestinationParentPath Absolute path of the parent folder in the application where the bundle will be placed.
     */
    constructor(
        application: ApplicationMetadata, // the target application
        bundle: InstrumentationBundle, // The generated instrumentation bundle.
        bundleDestinationParentPath: string = "", // The destination folder path in the application where the bundle will be placed.
    ) {
        super(application, bundle, bundleDestinationParentPath);
    }
}