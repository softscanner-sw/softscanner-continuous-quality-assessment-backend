import * as fs from "fs";
import * as path from "path";
import webpack from "webpack";

import { ApplicationMetadata } from "../../core/application-core";
import { ApplicationInstrumentationMetadata, InstrumentationGenerator, TelemetryConfig, TelemetryExportDestination, TelemetryExportProtocol, TelemetryType, UserInteractionEvent } from "../../core/instrumentation/instrumentation-core";
import { Metric } from "../../core/metrics/metrics-core";
import { Utils } from "../../core/util/util-core";
import { OpenTelemetryInstrumentationStrategy } from "./strategies/opentelemetry-instrumentation-strategy-core";
import { OpenTelemetryAutomaticTracingOptions, OpenTelemetryMetadataSpanProcessingInstrumentationStrategy, OpenTelemetrySessionDataInstrumentationStrategy, OpenTelemetryTracingInstrumentationStrategy, OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy } from "./strategies/opentelemetry-instrumentation-strategy-tracing";

export class OpenTelemetryEventRegistry {
    static registry: Map<UserInteractionEvent, string> = new Map<UserInteractionEvent, string>();

    static {
        this.initialize()
    }

    private static initialize() {
        const enumValuesString = Utils.getEnumStringValues(UserInteractionEvent);
        for (let enumValue of enumValuesString) {
            // Event representation in the enum
            const event = UserInteractionEvent[enumValue as keyof typeof UserInteractionEvent] as UserInteractionEvent;

            // Event string representation as required by the OpenTelemetry instrumentation
            // to capture user interactions during tracing. (i.e., lowercase and no separator)
            const eventString = Utils.convertEnumValueToLowercaseWithNoSeparator(enumValue);
            this.registry.set(event, eventString);
        }
    }

    public static events(): UserInteractionEvent[] {
        let events: UserInteractionEvent[] = [];

        for (let [event, str] of this.registry) {
            events.push(event);
        }

        return events;
    }

    public static stringRepresentations(): string[] {
        let eventStrs: string[] = [];

        for (let [event, str] of this.registry) {
            eventStrs.push(str);
        }

        return eventStrs;
    }

    public static getStringRepresentation(event: UserInteractionEvent): string | undefined {
        return this.registry.get(event);
    }

    public static getStringRepresentations(events: UserInteractionEvent[]): string[] {
        let target: string[] = [];
        events.forEach(event => {
            let str = this.getStringRepresentation(event);
            if (str)
                target.push(str);

        })
        return target;
    }
}

export class OpenTelemetryUserInteractionEventsConfig {
    constructor(
        public enabled: boolean, // enabled/disabled
        public events: UserInteractionEvent[] // events to enable
    ) { }
}

export class OpenTelemetryInstrumentationConfig implements TelemetryConfig {
    public userInteractionEvents?: UserInteractionEvent[];
    constructor(
        // one or multiple telemetry types
        public telemetryTypes: TelemetryType[],
        // one or multiple export destinations
        public exportDestinations: TelemetryExportDestination[],
        // automatic tracing options
        public automaticTracingOptions: OpenTelemetryAutomaticTracingOptions,
    ) {
        this.userInteractionEvents = this.automaticTracingOptions.userInteractions.events;
        // "http://localhost:4318/v1/traces"
    }
}

export class OpenTelemetryInstrumentationGenerator extends InstrumentationGenerator {
    /* CONSTRUCTOR */
    constructor(application: ApplicationMetadata,
        metrics: Metric[],
        telemetryConfig: OpenTelemetryInstrumentationConfig
    ) {
        super(application, metrics);
        this.telemetryConfig = telemetryConfig;
    }

    /* METHODS */
    public instrumentationDependencies(): string[] {
        // If the dependencies haven't already been set
        if (this.dependencies.length === 0) {
            // opentelemetry dependencies
            this.dependencies = [
                "@opentelemetry/api",
                "@opentelemetry/auto-instrumentations-web",
                "@opentelemetry/context-zone",
                "@opentelemetry/core",
                "@opentelemetry/exporter-trace-otlp-http",
                "@opentelemetry/instrumentation",
                "@opentelemetry/resources",
                "@opentelemetry/sdk-trace-base",
                "@opentelemetry/sdk-trace-web",
                "@opentelemetry/semantic-conventions",
                "ws",
                "babel-polyfill",
                "uuid",
                "path-browserify",
                "@types/uuid",
                "@types/path-browserify",
                "webpack",
                "terser-webpack-plugin",
            ];
        }

        return this.dependencies;
    }

    public requiresTelemetryType(telemetryType: TelemetryType): boolean {
        let result = super.requiresTelemetryType(telemetryType);

        if (this.telemetryConfig)
            result ||= this.telemetryConfig.telemetryTypes.includes(telemetryType);

        return result;
    }

    protected requiresUtilityInstrumentationFiles(): boolean {
        const telemetryConfig = this.telemetryConfig as OpenTelemetryInstrumentationConfig;

        return telemetryConfig.automaticTracingOptions.sessionData
            || telemetryConfig.automaticTracingOptions.appMetadata;
    }

    public async generateInstrumentationFiles(): Promise<void> {
        const telemetryConfig = this.telemetryConfig as OpenTelemetryInstrumentationConfig;

        // Preparing the application metadata which will be attached to every exported telemetry span
        const appInstrumentationMetadata: ApplicationInstrumentationMetadata = {
            appMetadata: this.application,
            bundleName: ''
        }

        if (this.requiresTelemetryType(TelemetryType.TRACING)) {
            // Generate main tracing instrumentation file
            this.instrumentationStrategy = new OpenTelemetryTracingInstrumentationStrategy(telemetryConfig, appInstrumentationMetadata);

            const strategy = this.instrumentationStrategy as OpenTelemetryTracingInstrumentationStrategy;

            // Preparing the instrumentation bundle to export its correspoding metadata
            this.instrumentationBundle = this.createInstrumentationBundle();
            strategy.applicationMetadata.bundleName = this.instrumentationBundle.fileName;
            appInstrumentationMetadata.bundleName = this.instrumentationBundle.fileName;

            this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());

            // Check if application metadata is required and use the corresponding instrumentation strategy
            if (telemetryConfig.automaticTracingOptions.appMetadata) {
                this.instrumentationStrategy = new OpenTelemetryMetadataSpanProcessingInstrumentationStrategy(telemetryConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }

            // Check if session data is required and use the corresponding instrumentation strategy
            if (telemetryConfig.automaticTracingOptions.sessionData) {
                this.instrumentationStrategy = new OpenTelemetrySessionDataInstrumentationStrategy(telemetryConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }

            // Check if websockets are required for span exportation and use the corresponding instrumentation strategy
            if (telemetryConfig.exportDestinations.some(exportDestination => 
                exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)){
                this.instrumentationStrategy = new OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy(telemetryConfig, appInstrumentationMetadata.appMetadata);
                this.instrumentations.push(...this.instrumentationStrategy.generateInstrumentationFiles());
            }
        }

        // verify that the dependencies are installed
        this.validateDependencies();

        // export instrumentation files into their proper paths
        await this.exportInstrumentationFiles();
    }

    /**
     * Exports the generated instrumentation files into their appropriate locations.
     * 
     * There should be a parent folder for the instrumentation files
     * associated with the application to instrument: `assets/instrumentations/<application-name>`
     * 
     * There should be a main instrumentation file per telemetry type
     * i.e., one for tracing, one for logging, and one for metrics) under a `./<application-name>/main/` folder
     * 
     * Besides these main instrumentation files, any extra instrumentation file
     * e.g., for session data by extending the `SpanProcessor` API)
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
                instrumentation.fileName.includes('Util')){
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

        console.log('Instrumentation files generated successfully.');
    }

    /**
     * Generates a bundle from the instrumentation files generated
     * for the test application.
     * 
     * There should be a parent folder for the bundles
     * associated with the application to instrument under `assets/bundles/`
     * 
     * The bundle generated for the application should be created from the
     * exported instrumentation files in the assets/instrumentations/<application-name>/
     */
    public async generateInstrumentationBundle(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Generate typescript configuration
            this.generateTypeScriptConfig();

            // Generate webpack config, then initialize and run the compiler
            const webpackConfig = this.generateWebPackConfig();
            const compiler = webpack(webpackConfig);

            compiler.run((err, stats) => {
                if (err){
                    console.error('Webpack compilation error:', err);
                    reject(err);
                    return;
                }

                console.log(stats?.toString({
                    colors: true, // Adds colors to the console output
                    modules: false, // Reduce the amount of stuff printed to the console
                    children: false // Hide child information
                }));

                console.log('Instrumentation bundle generated successfully.');
                resolve();
            });
        })
    }

    private getTypeScriptConfigPath(): string{
        const projectRootPath = path.resolve(__dirname, '../../../'); // this project's root folder path
        const instrumentationStrategy = this._instrumentationStrategy as OpenTelemetryInstrumentationStrategy;

        return path.join(projectRootPath, instrumentationStrategy.projectRootPath, 'tsconfig.json'); 
    }

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

    private createInstrumentationBundle(){
        const instrumentationStrategy = this._instrumentationStrategy as OpenTelemetryInstrumentationStrategy;
        const projectRootPath = path.resolve(__dirname, '../../../'); // this project's root folder path

        const applicationNormalizedName = this.application.generateNormalizedApplicationName('_');
        const currentDateTime = new Date().toISOString().replace(/[-:.]/g, "_");
        const bundleParentPath = path.join(projectRootPath, instrumentationStrategy.instrumentationBundleRootFolder, applicationNormalizedName);
        const bundleName = `${applicationNormalizedName}_${currentDateTime}.bundle.js`;
        const bundlePath = path.join(bundleParentPath, bundleName);

        return {
            fileName: bundleName,
            files: this.instrumentations,
            path: bundlePath,
            parentPath: bundleParentPath,
            projectRootPath: path.join(projectRootPath, instrumentationStrategy.projectRootPath),
            creationDate: currentDateTime,
        };
    }

    private generateWebPackConfig() {
        const instrumentationStrategy = this._instrumentationStrategy as OpenTelemetryInstrumentationStrategy;
        const projectRootPath = path.resolve(__dirname, '../../../'); // this project's root folder path

        // this.instrumentationBundle = this.createInstrumentationBundle();
        const tsConfigPath = this.getTypeScriptConfigPath();
        return {
            mode: "development" as 'development',
            entry: path.join(projectRootPath, instrumentationStrategy.srcPath, 'index.ts'),
            output: {
                filename: this.instrumentationBundle.fileName,
                path: this.instrumentationBundle.parentPath,
            },
            optimization: {
                minimize: true,
                minimizer: [new (require('terser-webpack-plugin'))()],
            },
            resolve: {
                extensions: ['.ts', '.js'],
            },
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-env'],
                            },
                        },
                        exclude: /node_modules\/(?!(@opentelemetry\/sdk|@opentelemetry\/exporter-trace-otlp-http|@opentelemetry\/instrumentation.*))/,
                    },
                    {
                        test: /\.ts?$/,
                        use: [{
                            loader: 'ts-loader',
                            options: {
                                configFile: tsConfigPath
                            }
                        }],
                        exclude: /node_modules\/(?!(@opentelemetry\/sdk|@opentelemetry\/exporter-trace-otlp-http|@opentelemetry\/instrumentation.*))/
                    }
                ],
            },
        };
    }
}