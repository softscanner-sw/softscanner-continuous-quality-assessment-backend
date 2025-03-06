import { ApplicationInstrumentationMetadata, Instrumentation, InstrumentationGenerator } from "../../../../core/instrumentation/instrumentation-core";
import { TelemetryExportDestination, TelemetryExportDestinationType, TelemetryExportProtocol } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryMainInstrumentationStrategy } from "../opentelemetry-core";
import { OpenTelemetryDefaultTracingInstrumentationAdapter, OpenTelemetryTracingInstrumentationAdapter } from "./opentelemetry-instrumentation-tracing-adapters";
import { OpenTelemetryTracingInstrumentationConfig } from "./opentelemetry-instrumentation-tracing-core";

/**
 * Strategy for generating OpenTelemetry tracing instrumentation files.
 * Extends `OpenTelemetryMainInstrumentationStrategy` to provide specific functionality for tracing.
 */
export class OpenTelemetryTracingInstrumentationStrategy extends OpenTelemetryMainInstrumentationStrategy {
    /**
     * Constructor for OpenTelemetryTracingInstrumentationStrategy
     * @param config {OpenTelemetryTracingInstrumentationConfig} - Configuration for tracing instrumentation
     * @param _applicationInstrumentationMetadata {ApplicationInstrumentationMetadata} - Metadata for the application being instrumented
     */
    constructor(
        config: OpenTelemetryTracingInstrumentationConfig,
        protected _applicationInstrumentationMetadata: ApplicationInstrumentationMetadata,
        protected adapter: OpenTelemetryTracingInstrumentationAdapter = new OpenTelemetryDefaultTracingInstrumentationAdapter(config, _applicationInstrumentationMetadata.appMetadata)) {
        super(config, _applicationInstrumentationMetadata.appMetadata);
    }

    /**
     * Getter for accessing application instrumentation metadata
     */
    get applicationInstrumentationMetadata(): ApplicationInstrumentationMetadata {
        return this._applicationInstrumentationMetadata;
    }

    /**
     * Generates the list of instrumentation files required for tracing.
     * @returns {Instrumentation[]} - Array of Instrumentation objects with file content and paths
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `${this._application.generateNormalizedApplicationName('-')}-tracing.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates the tracing instrumentation file content.
     * @param fileName {string} - The name of the instrumentation file
     * @returns {Instrumentation} - An Instrumentation object containing the file name, content, and paths
     */
    private generateTracingInstrumentationFile(fileName: string): Instrumentation {
        // project root path
        const projectRootPath = this._projectRootPath;

        // src path
        const srcPath = this._srcPath;

        // content
        let content = `
        // Importations
        ${this.generateImportations()}

        // Constants
        ${this.generateConstants()}

        // Tracer provider creation & configuration
        ${this.generateProvider()}

        // Tracer provider exporters
        ${this.generateProviderExporters()}

        // Tracer provider span processors
        ${this.generateAddSpanProcessors()}
        
        // Tracer provider registration
        ${this.generateProviderContextManagerRegistration()}

        // Tracer provider Automatic instrumentation registration
        ${this.generateTracerProviderAutoInstrumentationRegistration()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates the necessary import statements based on the configuration.
     * This includes imports for console, OTLP, and WebSocket exporters as well as user identity data and app metadata processing.
     * @returns {string} - A string containing the import statements
     */
    public generateImportations(): string {
        const config = (this._config as OpenTelemetryTracingInstrumentationConfig);
        const exportDestinations = config.exportDestinations;
        const automaticTracingOptions = config.automaticTracingOptions;

        // Get dynamic parts of importations from adapter
        let importations = this.adapter.generateImportations();

        /* Add imports for specific export destinations */
        // Importation for OTLP exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.protocol == TelemetryExportProtocol.OTLP)) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('OTLPTraceExporter ', '@opentelemetry/exporter-trace-otlp-http')}
            `.trim();
        }

        // Importation for websockets exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('WebSocketSpanExporter ', '../utils/exporterUtils')}
            `.trim();
        }

        // Importation for user identity data exportation (if provided in the configuration)
        if (automaticTracingOptions.userIdData) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('UserIdentitySpanProcessor', '../utils/userUtils')}
            `.trim();
        }

        // Importation for application metadata exportation (if provided in the configuration)
        if (automaticTracingOptions.appMetadata) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('ApplicationMetadataSpanProcessor ', '../utils/appMetadataUtils')}
            `.trim();
        }

        return importations;
    }

    /**
     * Generates constants for the service name and instance ID.
     * @returns {string} - A string containing constant declarations.
     */
    public generateConstants(): string {
        const applicationNormalizedName = this._application.generateNormalizedApplicationName('-');

        return `
        const serviceName = "${applicationNormalizedName}";
        const serviceInstanceID = "${applicationNormalizedName}-1";
        `.trim();
    }

    /**
     * Generates the code for creating and configuring the OpenTelemetry tracer provider.
     * @returns {string} - A string containing the provider setup code
     */
    public generateProvider(): string {
        return this.adapter.generateProvider();
    }

    /**
     * Registers the tracer provider with a context manager.
     * @returns {string} - A string containing the registration code.
     */
    public generateProviderContextManagerRegistration(): string {
        return this.adapter.generateProviderContextManagerRegistration();
    }

    /**
     * Generates code snippets for setting up telemetry data exporters based on the specified export destinations in the configuration.
     * This method supports three types of exporters:
     * - Console Exporter: Logs telemetry data to the console.
     * - OTLP Trace Exporter: Sends telemetry data to a remote OpenTelemetry Collector using the OTLP protocol.
     * - WebSockets Trace Exporter: Sends telemetry data to a remote destination via WebSockets.
     * 
     * @returns A string containing the generated JavaScript code for each exporter.
     */
    public generateProviderExporters(): string {
        const exportDestinations = (this._config as OpenTelemetryInstrumentationConfig).exportDestinations;
        let content = '';

        // Check for console exporter in the configuration and generate corresponding code
        if (exportDestinations.some(exportDestination => exportDestination.type == TelemetryExportDestinationType.CONSOLE)) {
            content = `
            // Console exporter
            ${this.generateConsoleExporter()}
            `.trim();
        }

        // Generate code for each OTLP Trace Exporter defined in the configuration
        exportDestinations.filter(exportDestination => exportDestination.protocol == TelemetryExportProtocol.OTLP)
            .forEach(exportDestination => {
                content += `

            // OpenTelemetry OTLP Trace Exporter
            ${this.generateCollectorExporter(exportDestination)}
            `.trim();
            })

        // Generate code for each WebSockets Trace Exporter defined in the configuration
        exportDestinations.filter(exportDestination => exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)
            .forEach(exportDestination => {
                content += `
            
            // Websockets Trace Exporter
            ${this.generateCollectorExporter(exportDestination)}
            `.trim();
            })

        return content;
    }

    /**
     * Generates code for the ConsoleSpanExporter, which logs telemetry data to the console.
     * This exporter is typically used for local development and debugging.
     * 
     * @returns A string containing the JavaScript code for creating a ConsoleSpanExporter instance.
     */
    private generateConsoleExporter(): string {
        return `
        const consoleExporter = new ConsoleSpanExporter();
        `.trim();
    }

    /**
     * Generates code for creating an exporter that sends telemetry data to a remote collector.
     * Depending on the protocol and destination type, the generated exporter can be either an OTLP Trace Exporter
     * or a WebSockets Trace Exporter, with appropriate configurations.
     * 
     * @param exportDestination The export destination configuration, specifying protocol, URL, and type (local or remote).
     * @returns A string containing the JavaScript code for creating the appropriate telemetry exporter instance.
     */
    private generateCollectorExporter(exportDestination: TelemetryExportDestination): string {
        let protocol = 'OTLP'; // default
        let exporterObjectCls = 'OTLPTraceExporter'; // default
        let scope = 'local'; // default

        if (exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS) {
            protocol = 'WebSockets'
            exporterObjectCls = 'WebSocketSpanExporter';
        }

        if (exportDestination.type == TelemetryExportDestinationType.REMOTE_COLLECTOR)
            scope = 'remote';

        return `
        const ${scope}${protocol}CollectorExporter = new ${exporterObjectCls}({
            url: '${exportDestination.url}'
        });
        `.trim();
    }

    /**
     * Generates code for adding span processors to the tracer provider.
     * This includes user identity data and application metadata processors if enabled.
     * @returns {string} - A string containing the span processor registration code
     */
    private generateAddSpanProcessors(): string {
        const config = this._config as OpenTelemetryTracingInstrumentationConfig;
        const automaticTracingOptions = config.automaticTracingOptions;
        const exportDestinations = config.exportDestinations;
        let content = '';

        exportDestinations.forEach(exportDestination => {
            let exporterName = this.getTelemetryExporterVariableName(exportDestination);
            let spanProcessor = `new SimpleSpanProcessor(${exporterName})`;  // default (batch processing to be added later)

            // Check for metadata span processing
            if (automaticTracingOptions.appMetadata) {
                spanProcessor = `new ApplicationMetadataSpanProcessor(
                    ${spanProcessor}, {
                        name: '${this._application.name}',
                        normalizedName: '${this._application.generateNormalizedApplicationName('-')}',
                        technology: '${this._application.technology}',
                        instrumentationBundleName: '${this._applicationInstrumentationMetadata.bundleName}'
                    })`.trim();
            }

            // Check for user identity data span processing
            if (automaticTracingOptions.userIdData) {
                spanProcessor = `new UserIdentitySpanProcessor(${spanProcessor})`.trim();
            }

            content += `
            tracerProvider.addSpanProcessor(${spanProcessor});
            `.trim()
        });

        return content;
    }

    /**
     * Helper function to get the variable name of the telemetry exporter.
     * @param exportDestination {TelemetryExportDestination}
     * @returns {string} - The variable name of the telemetry exporter.
     */
    private getTelemetryExporterVariableName(exportDestination: TelemetryExportDestination): string {
        // Console exporter
        if (exportDestination.type == TelemetryExportDestinationType.CONSOLE)
            return 'consoleExporter';

        // Local OTLP exporter by default
        let protocol = 'OTLP'; // default
        let scope = 'local'; // default

        // Change if web sockets are used for the collection
        if (exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)
            protocol = 'WebSockets'

        // Change if the collector is remote
        if (exportDestination.type == TelemetryExportDestinationType.REMOTE_COLLECTOR)
            scope = 'remote';

        return `${scope}${protocol}CollectorExporter`;
    }

    /**
     * Generates code for registering automatic instrumentation for document load, fetch, AJAX, and user interactions.
     * @returns {string} - A string containing the auto-instrumentation registration code
     */
    private generateTracerProviderAutoInstrumentationRegistration(): string {
        return this.adapter.generateTracerProviderAutoInstrumentationRegistration();
    }

}