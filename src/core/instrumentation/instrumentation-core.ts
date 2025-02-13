import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { ApplicationMetadata } from "../application/application-metadata";
import { Metric } from "../metrics/metrics-core";
import { TelemetryConfig, TelemetryType } from "../telemetry/telemetry";
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
export abstract class AbstractInstrumentationBundle implements InstrumentationBundle {
    constructor(
        protected _fileName: string,
        protected _instrumentationfiles: Instrumentation[] = [],
        protected _path?: string,
        protected _parentPath?: string,
        protected _projectRootPath?: string,
        protected _creationDate?: string,
    ) {

    }

    get fileName() {
        return this._fileName;
    }

    get path() {
        return this._path;
    }

    get parentPath() {
        return this._parentPath;
    }

    get projectRootPath() {
        return this._projectRootPath;
    }

    get creationDate() {
        return this._creationDate;
    }

    get files(): Instrumentation[] {
        return this._instrumentationfiles;
    }

    static extractNormalizedAppNameFromBundle(bundleName: string, separator: string = '_'): string {
        if (!bundleName) {
            console.warn(`Invalid bundle name: ${bundleName}`);
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
    get application(): ApplicationMetadata {
        return this._application;
    }

    get config(): TelemetryConfig {
        return this._config;
    }

    get projectRootPath(): string {
        return this._projectRootPath;
    }

    get srcPath(): string {
        return this._srcPath;
    }

    get instrumentationFilesRootFolder(): string {
        return this._instrumentationFilesRootFolder;
    }

    get instrumentationBundleRootFolder(): string {
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
export class DefaultInstrumentationStrategy implements InstrumentationStrategy {
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
    ) { }

    // Getters and setters for accessing and updating the instrumentation strategy.
    get instrumentationStrategy() {
        return this._instrumentationStrategy;
    }

    set instrumentationStrategy(strategy: InstrumentationStrategy) {
        this._instrumentationStrategy = strategy;
    }

    /**
     * Determines if the generator requires a specific type of telemetry.
     * @param telemetryType The type of telemetry to check for.
     * @returns A boolean indicating if the specified telemetry type is required.
     */
    public requiresTelemetryType(telemetryType: TelemetryType): boolean {
        return this.metrics.some(metric => metric.hasRequiredTelemetry(telemetryType));
    }

    public configureTelemetry(telemetryConfig: TelemetryConfig): void {
        this.telemetryConfig = telemetryConfig;
    }

    public async validateDependencies(): Promise<boolean> {
        if (!DependencyManager.areDependenciesInstalled(this.instrumentationDependencies())) {
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
     * @param targetHTMLPagePath Absolute path to the HTML page where the bundle will be injected.
     */
    constructor(
        protected application: ApplicationMetadata, // the target application
        protected bundle: InstrumentationBundle, // The generated instrumentation bundle.
        protected bundleDestinationParentPath: string = "", // The destination folder path in the application where the bundle will be placed.
        protected targetHTMLPagePath: string = "", // the target HTML page path where the bundle will be injected
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
     * Injects the bundle into the target HTML page.
     * Default implementation can be overridden by subclasses if needed.
     */
    protected async inject(): Promise<void> {
        if (!existsSync(this.targetHTMLPagePath)) {
            console.error(`Target HTML page does not exist: ${this.targetHTMLPagePath}`);
            return;
        }

        // Compute the relative path from the target HTML page to the bundle
        const relativePathToBundle = path.relative(path.dirname(this.targetHTMLPagePath), path.join(this.bundleDestinationParentPath, this.bundle.fileName));

        // Convert backslashes to forward slashes for cross-platform compatibility in HTML
        const scriptPath = relativePathToBundle.replace(/\\/g, '/');

        console.log(`Relative path for injection: ${scriptPath}`);

        // Preparing the <script> element to inject
        const bundleScriptTag = `<script src="${scriptPath}"></script>`;

        // Read and update the target HTML page's content by appending the script to <body>'s content
        const htmlContent = readFileSync(this.targetHTMLPagePath, 'utf8');
        const updatedHtmlContent = htmlContent.replace('</body>', `${bundleScriptTag}</body>`);

        // Write updates to the file
        writeFileSync(this.targetHTMLPagePath, updatedHtmlContent);
        console.log(`Instrumentation bundle injected successfully into ${this.targetHTMLPagePath}`);
    }

    /**
     * Method to define actions to be performed after injection.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract postInject(): Promise<void>;
}