import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { InjectionReport, InstrumentationInjectionError, planHtmlInjection, scriptSources } from "./instrumentation-injection";
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
 *
 * The process validates every precondition before the application is modified, is idempotent for the
 * same bundle, and reports each stage separately (see {@link InjectionReport}). Any failure raises an
 * {@link InstrumentationInjectionError}; a failed injection is never reported as successful.
 */
export abstract class InstrumentationBundleInjector {
    /** Human-readable label used in log messages (e.g., "Angular"). */
    protected label: string = "Instrumentation";

    /** The report of the last call to {@link process}. */
    protected report!: InjectionReport;

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

    /** Absolute path of the deployed copy of the bundle inside the application. */
    protected get deployedBundlePath(): string {
        return path.join(this.bundleDestinationParentPath, this.bundle.fileName);
    }

    /** Prefix shared by all bundles generated for this application (`<normalizedName>_`). */
    protected get bundleAppPrefix(): string {
        return AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(this.bundle.fileName);
    }

    /**
     * Template method to process the bundle injection.
     * Orchestrates the injection process by calling methods in a specific sequence:
     * validation (no modification), pre-injection (bundle copy), injection (entry point), post-injection (verification).
     * @returns The injection report.
     */
    public async process(): Promise<InjectionReport> {
        this.report = {
            technology: this.application.technology,
            bundleFileName: this.bundle.fileName,
            generated: false,
            copy: 'unchanged',
            deployedBundlePath: this.deployedBundlePath,
            entryPointPath: '',
            entryPoint: 'already-present',
            replacedReferences: [],
            verified: false,
        };
        this.validateBundle();
        await this.validateEntryPoint();
        await this.preInject();
        await this.inject();
        await this.postInject();
        return this.report;
    }

    /**
     * Checks that the generated bundle exists. Does not modify the application.
     */
    protected validateBundle(): void {
        if (!this.bundle.path || !existsSync(this.bundle.path)) {
            throw new InstrumentationInjectionError(
                `${this.label} Instrumentation Bundle Injector: generated bundle not found: ${this.bundle.path}`, 'BUNDLE_MISSING');
        }
        this.report.generated = true;
    }

    /**
     * Copies the generated bundle into the application. If a byte-identical copy is already deployed,
     * the file is left untouched (idempotent).
     */
    protected async copyBundle(): Promise<void> {
        const destination = this.deployedBundlePath;
        const source = readFileSync(this.bundle.path!);
        if (existsSync(destination) && readFileSync(destination).equals(source)) {
            this.report.copy = 'unchanged';
            console.log(`${this.label} Instrumentation Bundle Injector: identical bundle already deployed at ${destination}`);
            return;
        }
        mkdirSync(this.bundleDestinationParentPath, { recursive: true });
        copyFileSync(this.bundle.path!, destination);
        this.report.copy = 'copied';
        console.log(`${this.label} Instrumentation Bundle Injector: copied the bundle to ${destination}`);
    }

    /**
     * Checks that the deployed bundle is byte-identical to the generated one.
     */
    protected verifyDeployedBundle(): void {
        if (!existsSync(this.deployedBundlePath) ||
            !readFileSync(this.deployedBundlePath).equals(readFileSync(this.bundle.path!))) {
            throw new InstrumentationInjectionError(
                `${this.label} Instrumentation Bundle Injector: deployed bundle missing or different from the generated bundle: ${this.deployedBundlePath}`,
                'VERIFICATION_FAILED');
        }
    }

    /**
     * Validates the application entry point before any modification.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract validateEntryPoint(): Promise<void>;

    /**
     * Method to define actions to be performed before injection.
     * By default, copies the bundle into the application.
     */
    protected async preInject(): Promise<void> {
        console.log(`${this.label} Instrumentation Bundle Injector: Preparing for bundle injection...`);
        await this.copyBundle();
    }

    /**
     * Method to define bundle injection into the target web application.
     * To be implemented by subclasses based on specific needs
     */
    protected abstract inject(): Promise<void>;

    /**
     * Method to define actions to be performed after injection.
     * To be implemented by subclasses based on specific needs (verification of the injection).
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

    /** `src` of the script element, relative to the HTML page, with forward slashes. */
    protected get scriptSrc(): string {
        return path.relative(path.dirname(this.targetHTMLPagePath), this.deployedBundlePath).replace(/\\/g, '/');
    }

    /** Folder of the bundles, relative to the HTML page, with forward slashes. */
    protected get scriptDir(): string {
        return path.relative(path.dirname(this.targetHTMLPagePath), this.bundleDestinationParentPath).replace(/\\/g, '/');
    }

    /**
     * Checks that the HTML page exists and has a supported insertion point (dry run, no modification).
     */
    protected async validateEntryPoint(): Promise<void> {
        this.report.entryPointPath = this.targetHTMLPagePath;
        if (!existsSync(this.targetHTMLPagePath)) {
            throw new InstrumentationInjectionError(
                `${this.label} Instrumentation Bundle Injector: target HTML page does not exist: ${this.targetHTMLPagePath}`,
                'ENTRY_POINT_MISSING');
        }
        planHtmlInjection(readFileSync(this.targetHTMLPagePath, 'utf8'), this.scriptSrc, this.scriptDir, this.bundleAppPrefix);
    }

    /**
     * Injects the bundle into the target HTML page by inserting a <script> element before </body>
     * (or </html> when </body> is omitted). Idempotent; see {@link planHtmlInjection}.
     */
    protected async inject(): Promise<void> {
        const html = readFileSync(this.targetHTMLPagePath, 'utf8');
        const plan = planHtmlInjection(html, this.scriptSrc, this.scriptDir, this.bundleAppPrefix);
        if (plan.status !== 'already-present') writeFileSync(this.targetHTMLPagePath, plan.updated);
        this.report.entryPoint = plan.status;
        this.report.replacedReferences = plan.replacedReferences;
        console.log(`${this.label} Instrumentation Bundle Injector: entry point ${this.targetHTMLPagePath}: ${plan.status} (${this.scriptSrc})`);
    }

    /**
     * Verifies that the page references the deployed bundle exactly once and that the deployed bundle
     * is identical to the generated one.
     */
    protected async postInject(): Promise<void> {
        const references = scriptSources(readFileSync(this.targetHTMLPagePath, 'utf8')).filter(src => src === this.scriptSrc).length;
        if (references !== 1) {
            throw new InstrumentationInjectionError(
                `${this.label} Instrumentation Bundle Injector: expected exactly one reference to ${this.scriptSrc} in ${this.targetHTMLPagePath}, found ${references}`,
                'VERIFICATION_FAILED');
        }
        this.verifyDeployedBundle();
        this.report.verified = true;
        console.log(`${this.label} Instrumentation Bundle Injector: Finished bundle injection (verified).`);
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