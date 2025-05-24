import * as fs from "fs";
import * as path from "path";

import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { ApplicationInstrumentationMetadata, InstrumentationBundle, InstrumentationBundler, InstrumentationGenerator } from "../../../core/instrumentation/instrumentation-core";
import { Metric } from "../../../core/metrics/metrics-core";
import { TelemetryExportProtocol, TelemetryType } from "../../../core/telemetry/telemetry";
import { EsBuildBundler } from "../esbuild/esbuild-bundler";
import { WebpackBundler } from "../webpack/webpack-bundler";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "./opentelemetry-core";
import { OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy } from "./tracing/exportation/opentelemetry-instrumentation-tracing-websockets-exportation";
import { OpenTelemetryTracingInstrumentationStrategy } from "./tracing/opentelemetry-instrumentation-tracing";
import { OpenTelemetryNodeTracingInstrumentationAdapter, OpenTelemetryTracingInstrumentationAdapter, OpenTelemetryWebTracingInstrumentationAdapter } from "./tracing/opentelemetry-instrumentation-tracing-adapters";
import { OpenTelemetryTracingInstrumentationConfig } from "./tracing/opentelemetry-instrumentation-tracing-core";
import { OpenTelemetryMetadataSpanProcessingInstrumentationStrategy } from "./tracing/processing/opentelemetry-instrumentation-tracing-app-metadata";
import { OpenTelemetryUserIdentityInstrumentationStrategy } from "./tracing/processing/opentelemetry-instrumentation-tracing-user-identity";

/**
 * Class responsible for generating OpenTelemetry instrumentation files and bundles for an application.
 * It extends the InstrumentationGenerator to provide telemetry-specific instrumentation for tracing, metrics, etc.
 */
export class OpenTelemetryInstrumentationGenerator extends InstrumentationGenerator {
    private instrumentationAdapter?: OpenTelemetryTracingInstrumentationAdapter;
    private instrumentationBundlerAdapter?: OpenTelemetryInstrumentationBundlerAdapter;
    // Constructor for initializing the generator with application metadata, metrics, and telemetry configuration
    constructor(application: ApplicationMetadata,
        metrics: Metric[],
        telemetryConfig: OpenTelemetryInstrumentationConfig
    ) {
        super(application, metrics, telemetryConfig);

        // Initialize instrumentation adapter setup
        this.setupInstrumentationAdapter();
    }

    /**
     * Checks if a specific telemetry type (e.g., tracing, logging) is required by the instrumentation.
     */
    public requiresTelemetryType(telemetryType: TelemetryType): boolean {
        let result = super.requiresTelemetryType(telemetryType);

        if (this.telemetryConfig)
            result ||= this.telemetryConfig.telemetryTypes.includes(telemetryType);

        return result;
    }

    /**
     * Determines whether utility instrumentation files (e.g., for user identity data, app metadata) are needed.
     */
    protected requiresUtilityInstrumentationFiles(): boolean {
        let requires = false;
        if (this.requiresTelemetryType(TelemetryType.TRACING)) {
            let telemetryConfig = this.telemetryConfig as OpenTelemetryTracingInstrumentationConfig;
            requires = telemetryConfig.automaticTracingOptions.userIdData
                || telemetryConfig!!.automaticTracingOptions.appMetadata
        }

        return requires;
    }

    public setupInstrumentationAdapter() {
        if (this.requiresTelemetryType(TelemetryType.TRACING)) {
            const tracingConfig = this.telemetryConfig as OpenTelemetryTracingInstrumentationConfig;
            if (this.application.type.toLowerCase().includes('frontend')) {
                this.instrumentationAdapter = new OpenTelemetryWebTracingInstrumentationAdapter(tracingConfig, this.application);
            }

            else if (this.application.type.toLowerCase().includes('backend')) {
                if (this.application.technology.toLowerCase().includes('node'))
                    this.instrumentationAdapter = new OpenTelemetryNodeTracingInstrumentationAdapter(tracingConfig, this.application);
            }
        }
    }

    public setupInstrumentationBundlerAdapter() {
        if (this.requiresTelemetryType(TelemetryType.TRACING)) {
            if (this.application.type.toLowerCase().includes('frontend'))
                this.instrumentationBundler = new WebpackBundler(
                    this.instrumentationStrategy, 
                    this.instrumentationBundle, 
                    this.getTypeScriptConfigPath()
                );

            else if (this.application.type.toLowerCase().includes('backend')) {
                if (this.application.technology.toLowerCase().includes('node'))
                    this.instrumentationBundler = new EsBuildBundler(
                        this.instrumentationStrategy, 
                        this.instrumentationBundle, 
                        this.getTypeScriptConfigPath()
                    );
            }

            this.instrumentationBundlerAdapter = new OpenTelemetryInstrumentationBundlerAdapter(
                this.application, this.instrumentationBundler
            );
        }
    }

    /**
     * Generates the necessary instrumentation files for OpenTelemetry tracing.
     * It handles tracing, user identity data, metadata processing, and WebSocket-based exportation strategies.
     */
    public async generateInstrumentationFiles(): Promise<void> {
        // Preparing the application metadata which will be attached to every exported telemetry span
        const appInstrumentationMetadata: ApplicationInstrumentationMetadata = {
            appMetadata: this.application,
            bundleName: ''
        }

        if (this.requiresTelemetryType(TelemetryType.TRACING)) {
            const tracingConfig = this.telemetryConfig as OpenTelemetryTracingInstrumentationConfig;

            // Check if application metadata is required and use the corresponding instrumentation strategy
            if (tracingConfig.automaticTracingOptions.appMetadata) {
                this.instrumentationStrategy = new OpenTelemetryMetadataSpanProcessingInstrumentationStrategy(tracingConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }

            // Check if user identity data is required and use the corresponding instrumentation strategy
            if (tracingConfig.automaticTracingOptions.userIdData) {
                this.instrumentationStrategy = new OpenTelemetryUserIdentityInstrumentationStrategy(tracingConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }

            // Check if websockets are required for span exportation and use the corresponding instrumentation strategy
            if (tracingConfig.exportDestinations.some(exportDestination =>
                exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)) {
                this.instrumentationStrategy = new OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy(tracingConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }

            // Initialize instrumentation bundler adapter setup
            this.setupInstrumentationBundlerAdapter();

            // Preparing the instrumentation bundle to export its corresponding metadata
            this.instrumentationBundle = this.instrumentationBundlerAdapter!.prepareBundle();
            appInstrumentationMetadata.bundleName = this.instrumentationBundle.fileName;

            // Generate main tracing instrumentation file
            this.instrumentationStrategy = new OpenTelemetryTracingInstrumentationStrategy(tracingConfig, appInstrumentationMetadata,
                this.instrumentationAdapter);
            this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());

            // Associate generated instrumentation files with the instrumentation bundle
            this.instrumentationBundle.files = this.instrumentations;

            // Associate instrumentation bundle with the instrumentation bundle adapter's bundler.
            this.instrumentationBundler.instrumentationBundle = this.instrumentationBundle;
        }

        // verify that the dependencies are installed
        this.validateDependencies();

        // export instrumentation files into their proper paths
        await this.exportInstrumentationFiles();

        // Generate typescript configuration
        await this.generateTypeScriptConfig();
    }

    /**
     * Returns the list of dependencies required for OpenTelemetry instrumentation.
     * These dependencies are lazily initialized and returned only once.
     */
    public instrumentationDependencies(): string[] {
        // If the dependencies haven't already been set
        if (this.dependencies.length === 0 && this.instrumentationAdapter)
            this.dependencies = this.instrumentationAdapter.instrumentationDependencies();

        return this.dependencies;
    }

    /**
     * Exports the generated instrumentation files to the appropriate directories.
     * 
     * There should be a parent folder for the instrumentation files
     * associated with the application to instrument: `assets/instrumentations/<application-name>`
     * 
     * There should be a main instrumentation file per telemetry type
     * i.e., one for tracing, one for logging, and one for metrics) under a `./<application-name>/main/` folder
     * 
     * Besides these main instrumentation files, any extra instrumentation file
     * e.g., for user identity data by extending the `SpanProcessor` API)
     * is saved in a `./<application-name>/utils/` folder
     * 
     * Finally, all main instrumentation files should be imported into an `./<application-name>index.ts`
     * file, which will be used by webpack to generate the corresponding instrumentation file
     */
    public async exportInstrumentationFiles(): Promise<void> {
        const instrumentationStrategy = this._instrumentationStrategy as OpenTelemetryInstrumentationStrategy;
        const srcPath = instrumentationStrategy.srcPath;

        if (!srcPath)
            throw new Error(`Source path '${srcPath}' is undefined.`);

        const mainPath = path.join(srcPath, 'main');
        let utilsPath = '';

        if (this.requiresUtilityInstrumentationFiles())
            utilsPath = path.join(srcPath, 'utils');

        // Ensure base, main, and utils directories exist
        fs.mkdirSync(srcPath, { recursive: true });
        fs.mkdirSync(mainPath, { recursive: true });
        if (utilsPath)
            fs.mkdirSync(utilsPath, { recursive: true });

        // Iterate over each instrumentation and compute path and parentPath
        this.instrumentations.forEach(instrumentation => {
            if (this.requiresUtilityInstrumentationFiles() &&
                instrumentation.fileName.includes('Util')) {
                // Utility instrumentation file
                instrumentation.parentPath = utilsPath;
            }
            else {
                // Main instrumentation file
                instrumentation.parentPath = mainPath;
            }
            instrumentation.path = path.join(instrumentation.parentPath, instrumentation.fileName);
            // Write the instrumentation file's content into its computed path
            fs.writeFileSync(instrumentation.path, instrumentation.content);
        });

        // Create an index.ts file importing all main instrumentation files
        const indexFilePath = path.join(srcPath, 'index.ts');
        const importStatements = this.instrumentations
            .filter(instr => !instr.fileName.includes('Util'))
            .map(instr => `import './main/${instr.fileName.replace('.ts', '')}';`)
            .join('\n');

        // Write the index.ts, the main entry point of all main instrumentation files
        fs.writeFileSync(indexFilePath, importStatements);

        console.log('OpenTelemetry Instrumentation Generator: Instrumentation files generated successfully.');
    }

    /**
     * Generates a bundle from the instrumentation files generated
     * for the test application using Webpack.
     * 
     * There should be a parent folder for the bundles
     * associated with the application to instrument under `assets/bundles/`
     * 
     * The bundle generated for the application should be created from the
     * exported instrumentation files in the assets/instrumentations/<application-name>/
     */
    public async generateInstrumentationBundle(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.instrumentationBundlerAdapter!.executeBuild();
                resolve();
            } catch (err: any) {
                const errStr = err.toString();
                console.error("OpenTelemetry Instrumentation Generator: Instrumentation bundle build error:", errStr);
                reject(err);
            }
        })
    }

    /**
     * Generates the path to tsconfig.json of the OpenTelemetry instrumentation project
     * @returns - The path to tsconfig.json of the OpenTelemetry instrumentation project
     */
    private getTypeScriptConfigPath(): string {
        const projectRootPath = path.resolve(__dirname, '../../../../'); // this project's root folder path
        const instrumentationStrategy = this._instrumentationStrategy as OpenTelemetryInstrumentationStrategy;

        return path.join(projectRootPath, instrumentationStrategy.projectRootPath, 'tsconfig.json').replace(/\\/g, '/');
    }

    /**
     * Generates the content of tsconfig.json of the OpenTelemetry instrumentation project
     * @returns - The content of tsconfig.json of the OpenTelemetry instrumentation project
     */
    private async generateTypeScriptConfig(): Promise<void> {
        const tsConfigPath = this.getTypeScriptConfigPath();
        const tsConfig = {
            compilerOptions: {
                module: "NodeNext",
                target: "ESNext",
                rootDir: `./src`,
                outDir: `./dist`,
                strict: true,
            },
            include: [
                "src/**/*.ts"
            ]
        };

        fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    }
}

export class OpenTelemetryInstrumentationBundlerAdapter {
    constructor(
        public appMetadata: ApplicationMetadata,
        public instrumentationBundler: InstrumentationBundler
    ) { }

    prepareBundle(): InstrumentationBundle {
        const instrumentationStrategy = this.instrumentationBundler.instrumentationStrategy;
        const projectRootPath = path.resolve(__dirname, '../../../../'); // this project's root folder path

        const applicationNormalizedName = this.appMetadata.generateNormalizedApplicationName('_');
        const currentDateTime = new Date().toISOString().replace(/[-:.]/g, "_");
        const bundleParentPath = path.join(projectRootPath, instrumentationStrategy.instrumentationBundleRootFolder, applicationNormalizedName);
        const bundleName = `${applicationNormalizedName}_${currentDateTime}.bundle.js`;
        const bundlePath = path.join(bundleParentPath, bundleName);

        this.instrumentationBundler.instrumentationBundle = {
            fileName: bundleName,
            files: this.instrumentationBundler.instrumentationBundle.files,
            path: bundlePath.replace(/\\/g, '/'),
            parentPath: bundleParentPath.replace(/\\/g, '/'),
            projectRootPath: path.join(projectRootPath, instrumentationStrategy.projectRootPath).replace(/\\/g, '/'),
            creationDate: currentDateTime,
        };

        return this.instrumentationBundler.instrumentationBundle;
    }

    async executeBuild(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.instrumentationBundler.generateInstrumentationBundle();
                resolve();
            } catch (err: any) {
                const errStr = err.toString();
                // fs.writeFileSync("webpack-error.log", `Written from OpenTelemetry Instrumentation Bundler Adapter\n${errStr}`);
                console.error("OpenTelemetry Instrumentation Bundler Adapter: Instrumentation bundle build error:", errStr);
                reject(err);
                return;
            }
        });
    }
}