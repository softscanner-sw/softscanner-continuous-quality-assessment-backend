import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { ApplicationInstrumentationMetadata, Instrumentation, InstrumentationGenerator } from "../../../../core/instrumentation/instrumentation-core";
import { TelemetryExportDestination, TelemetryExportDestinationType, TelemetryExportProtocol } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryEventRegistry, OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy, OpenTelemetryMainInstrumentationStrategy } from "../opentelemetry-core";
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
        protected _applicationInstrumentationMetadata: ApplicationInstrumentationMetadata) {
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

        // Tracer proviver exporters
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
     * This includes imports for console, OTLP, and WebSocket exporters as well as session and metadata processing.
     * @returns {string} - A string containing the import statements
     */
    public generateImportations(): string {
        const config = (this._config as OpenTelemetryTracingInstrumentationConfig);
        const exportDestinations = config.exportDestinations;
        const automaticTracingOptions = config.automaticTracingOptions;

        // Default importations for tracing
        let importations = `
        ${InstrumentationGenerator.generateImportStatement('babel-polyfill')}
        ${InstrumentationGenerator.generateImportFromStatement('getWebAutoInstrumentations', '@opentelemetry/auto-instrumentations-web')}
        ${InstrumentationGenerator.generateImportFromStatement('ZoneContextManager', '@opentelemetry/context-zone')}
        ${InstrumentationGenerator.generateImportFromStatement('registerInstrumentations', '@opentelemetry/instrumentation')}
        ${InstrumentationGenerator.generateImportFromStatement('Resource', '@opentelemetry/resources')}
        ${InstrumentationGenerator.generateImportFromStatement('SimpleSpanProcessor, WebTracerProvider', '@opentelemetry/sdk-trace-web')}
        ${InstrumentationGenerator.generateImportFromStatement('SemanticResourceAttributes', '@opentelemetry/semantic-conventions')}
        `.trim();

        /* Add imports for specific export destinations */
        // Importation for console exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.type == TelemetryExportDestinationType.CONSOLE)) {
            importations = `
            ${importations}
            ${InstrumentationGenerator.generateImportFromStatement('ConsoleSpanExporter', '@opentelemetry/sdk-trace-web')}
            `.trim();
        }

        // Importation for OTLP exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.protocol == TelemetryExportProtocol.OTLP)) {
            importations = `
            ${importations}
            ${InstrumentationGenerator.generateImportFromStatement('OTLPTraceExporter ', '@opentelemetry/exporter-trace-otlp-http')}
            `.trim();
        }

        // Importation for websockets exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)) {
            importations = `
            ${importations}
            ${InstrumentationGenerator.generateImportFromStatement('WebSocketSpanExporter ', '../utils/exporterUtils')}
            `.trim();
        }

        // Importation for session data exportation (if provided in the configuration)
        if (automaticTracingOptions.sessionData) {
            importations = `
            ${importations}
            ${InstrumentationGenerator.generateImportFromStatement('SessionIdSpanProcessor', '../utils/sessionUtils')}
            `.trim();
        }

        // Importation for application metadata exportation (if provided in the configuration)
        if (automaticTracingOptions.appMetadata) {
            importations = `
            ${importations}
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
        return `
        export const tracerProvider = new WebTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: serviceInstanceID,
            }),
        });
        `.trim();
    }

    /**
     * Registers the tracer provider with a context manager.
     * @returns {string} - A string containing the registration code.
     */
    public generateProviderContextManagerRegistration(): string {
        return `
        tracerProvider.register({
            contextManager: new ZoneContextManager(),
        });
        `.trim();
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
                content = `
            ${content}

            // OpenTelemetry OTLP Trace Exporter
            ${this.generateCollectorExporter(exportDestination)}
            `.trim();
            })

        // Generate code for each WebSockets Trace Exporter defined in the configuration
        exportDestinations.filter(exportDestination => exportDestination.protocol == TelemetryExportProtocol.WEB_SOCKETS)
            .forEach(exportDestination => {
                content = `
            ${content}
            
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
     * This includes session ID and application metadata processors if enabled.
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

            // Check for session span processing
            if (automaticTracingOptions.sessionData) {
                spanProcessor = `new SessionIdSpanProcessor(${spanProcessor})`.trim();
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
        const automaticTracingOptions = (this._config as OpenTelemetryTracingInstrumentationConfig).automaticTracingOptions;

        let register = `
        registerInstrumentations({
            instrumentations: [
                getWebAutoInstrumentations({        
        `.trim();

        // Check document and resource loading and fetching
        let enabled = (automaticTracingOptions.documentLoad) ? 'true' : 'false';
        register = `
        ${register}
            '@opentelemetry/instrumentation-document-load': {
                enabled: ${enabled}
            },
        `.trim();

        // Check fetching API
        enabled = (automaticTracingOptions.fetchApi) ? 'true' : 'false';
        register = `
        ${register}
            '@opentelemetry/instrumentation-fetch': {
                enabled: ${enabled}
            },
        `.trim();

        // Check AJAX
        enabled = (automaticTracingOptions.ajaxRequests) ? 'true' : 'false';
        register = `
        ${register}
            '@opentelemetry/instrumentation-xml-http-request': {
                enabled: ${enabled}  
            },
        `.trim();

        // Check User Interactions
        if (automaticTracingOptions.userInteractions.enabled) {
            register = `
            ${register}
                '@opentelemetry/instrumentation-user-interaction': {
                    eventNames: [
            `.trim();

            // Register each selected event
            OpenTelemetryEventRegistry.getStringRepresentations(
                automaticTracingOptions.userInteractions.events
            ).forEach(eventStr => register += `\n\t\t\t\t\t'${eventStr}',`);

            register = `
            ${register}
                    ]
                },
            `.trim();
        }
        else {
            register = `
            ${register}
                '@opentelemetry/instrumentation-user-interaction': {
                    enabled: false
            `.trim();
        }

        register = `
        ${register}
                }),
            ],
            tracerProvider: tracerProvider
        });
        `.trim();

        return register;
    }

}

/**
 * A class representing a concrete strategy for generating instrumentation files to trace session data
 */
export class OpenTelemetrySessionDataInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the session data instrumentation strategy.
     * @param config OpenTelemetry instrumentation configuration
     * @param application Metadata of the application being instrumented
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the instrumentation files required for session data tracking.
     * @returns Array of instrumentation files
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `sessionUtils.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file with session management utilities.
     * @param fileName Name of the generated file
     * @returns An instrumentation object containing file details and content
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

        // Functions
        ${this.generateFunctions()}

        // Interfaces
        ${this.generateInterfaces()}

        // Constants
        ${this.generateConstants()}

        // Classes
        ${this.generateClasses()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates import statements for the session management utilities.
     * @returns Import statements as a string
     */
    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', '@opentelemetry/sdk-trace-web')}
        ${InstrumentationGenerator.generateImportFromStatement('v4 as uuidv4', 'uuid')}
        `.trim();
    }

    /**
     * Generates utility functions for session ID generation.
     * @returns Functions as a string
     */
    private generateFunctions(): string {
        return `
        /* Generates session IDs using UUIDV4 */
        function generateSessionId(){
            return uuidv4();
        }
        `.trim();
    }

    /**
     * Generates an interface for session representation.
     * @returns Interface definition as a string
     */
    private generateInterfaces(): string {
        return `
        /* Custom Session Interface */
        interface ISession {
            sessionId: string;
        }
        `.trim();
    }

    /**
     * Generates constants and session gateway functions for session management.
     * @returns Constants and gateway functions as a string
     */
    public generateConstants(): string {
        return `
        /* Key and default session values for local storage */ 
        const sessionKey = "session";
        const defaultSession: ISession = {
            sessionId: generateSessionId()
        };

        /* A Session Gateway Function */
        const SessionGateway = () => ({
            getSession(): ISession {
                if (typeof window === 'undefined')
                    return defaultSession;
                
                const sessionString = sessionStorage.getItem(sessionKey);

                if (!sessionString)
                    sessionStorage.setItem(sessionKey, JSON.stringify(defaultSession));
                
                return JSON.parse(sessionString || JSON.stringify(defaultSession)) as ISession;
            },
            setSessionValue<K extends keyof ISession>(key: K, value: ISession[K]){
                const session = this.getSession();

                sessionStorage.setItem(sessionKey, JSON.stringify({...session, [key]: value}));
            }
        });
        `.trim();
    }

    /**
     * Generates the session processor class that injects session information into spans.
     * @returns Class definition as a string
     */
    public generateClasses(): string {
        return `
        /* Custom Span Processor for Session information */
        export class SessionIdSpanProcessor implements SpanProcessor {
            private _nextProcessor: SpanProcessor;
            private _dataName = "app.session.id";

            constructor(nextProcessor: SpanProcessor){
                this._nextProcessor = nextProcessor;
            }
            
            onStart(span: Span, parentContext: Context): void {
                span.setAttribute(this._dataName, SessionGateway().getSession().sessionId);
                this._nextProcessor.onStart(span, parentContext);
            }

            forceFlush(): Promise<void>{
                return this._nextProcessor.forceFlush();
            }

            onEnd(span: Span): void {
                this._nextProcessor.onEnd(span);
            }

            shutdown(): Promise<void> {
                return this._nextProcessor.shutdown();
            }
        }
        `.trim();
    }
}

/**
 * A class representing a concrete strategy for generating a WebSockets-based span exporter for OpenTelemetry
 */
export class OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the WebSockets span exporter strategy.
     * @param config OpenTelemetry instrumentation configuration
     * @param application Metadata of the application being instrumented
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the instrumentation files for the WebSockets span exporter.
     * @returns Array of instrumentation files
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `exporterUtils.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file for WebSockets span exporting.
     * @param fileName Name of the generated file
     * @returns An instrumentation object containing file details and content
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

        // Interfaces
        ${this.generateInterfaces()}

        // Classes
        ${this.generateClasses()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates import statements for WebSockets span exporting.
     * @returns Import statements as a string
     */
    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('SpanExporter, ReadableSpan', '@opentelemetry/sdk-trace-base')}
        ${InstrumentationGenerator.generateImportFromStatement('ExportResult, ExportResultCode', '@opentelemetry/core')}
        `.trim();
    }

    /**
     * Generates constants for WebSockets span exporting.
     * @returns Constants for WebSockets span exporting as a string
     */
    public generateConstants(): string {
        return ""; // no constants
    }

    /**
     * Generates an interface for the WebSocket span exporter configuration.
     * @returns Interface definition as a string
     */
    private generateInterfaces(): string {
        return `
        /* Configuration for WebSocketSpanExporter */
        export interface WebSocketSpanExporterConfig {
            url: string
        }
        `.trim();
    }

    /**
     * Generates the WebSocket span exporter class.
     * @returns Class definition as a string
     */
    public generateClasses(): string {
        return `
        /* Custom Web Sockets Span Exporter */
        export class WebSocketSpanExporter implements SpanExporter {
            private ws: WebSocket;
            private _url: string;
        
            constructor(config: WebSocketSpanExporterConfig) {
                this._url = config.url;
                this.ws = new WebSocket(this._url);
            }
        
            get url(): string{
                return this._url;
            }
        
            export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
                const jsonSpans = spans.map(span => {
                    return {
                        traceId: span.spanContext().traceId,
                        parentId: span.parentSpanId,
                        name: span.name,
                        id: span.spanContext().spanId,
                        kind: span.kind,
                        startTime: span.startTime,
                        endTime: span.endTime,
                        duration: span.duration,
                        attributes: span.attributes,
                        status: span.status,
                        events: span.events.map(event => ({
                            name: event.name,
                            time: event.time,
                            attributes: event.attributes
                        })),
                        links: span.links,
                    };
                });
        
                // Send the exported traces to the websocket server
                this.ws.send(JSON.stringify(jsonSpans) + '\\n');
        
                resultCallback({ code: ExportResultCode.SUCCESS });
            }
        
            shutdown(): Promise<void> {
                return new Promise((resolve, reject) => {
                    this.ws.close();
                    resolve();
                });
            }
        }
        `.trim();
    }
}

/**
 * A class representing a concrete strategy for generating a metadata span processor for tracing instrumentation.
 * This strategy generates tracing-related instrumentation files that inject application metadata into spans.
 */
export class OpenTelemetryMetadataSpanProcessingInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the metadata span processing strategy.
     * @param config Configuration object for the OpenTelemetry instrumentation.
     * @param application Metadata related to the application being instrumented.
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates instrumentation files required for the metadata span processing strategy.
     * @returns An array of `Instrumentation` objects representing generated files.
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];

        // Generate the tracing instrumentation file
        instrumentations.push(this.generateTracingInstrumentationFile(`appMetadataUtils.ts`));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file with the given file name.
     * This file contains the necessary imports, interfaces, and classes for metadata span processing.
     * @param fileName The name of the generated file.
     * @returns An `Instrumentation` object containing file metadata and content.
     */
    private generateTracingInstrumentationFile(fileName: string): Instrumentation {
        const projectRootPath = this._projectRootPath;  // Path to the project root directory
        const srcPath = this._srcPath;                  // Path to the source directory

        // Generate the content of the tracing instrumentation file
        let content = `
        // Importations
        ${this.generateImportations()}

        // Interfaces
        ${this.generateInterfaces()}

        // Classes
        ${this.generateClasses()}
        `.trim();

        // Return an Instrumentation object with the file details
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates the import statements for the tracing instrumentation file.
     * @returns A string containing import statements.
     */
    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', '@opentelemetry/sdk-trace-web')}
        `.trim();
    }

    /**
     * Generates constant definitions (none needed for this strategy).
     * @returns An empty string.
     */
    public generateConstants(): string {
        return ""; // No constants required for this strategy
    }

    /**
     * Generates the interface definitions for the tracing instrumentation file.
     * @returns A string containing the ApplicationMetadata interface definition.
     */
    private generateInterfaces(): string {
        return `
        /* Application Metadata interface for telemetry exportation */
        export interface ApplicationMetadata {
            name: string,
            normalizedName: string,
            technology: string,
            instrumentationBundleName: string
        }
        `.trim();
    }

    /**
     * Generates the class definitions for the tracing instrumentation file.
     * This includes the `ApplicationMetadataSpanProcessor` class that injects metadata into spans.
     * @returns A string containing class definitions.
     */
    public generateClasses(): string {
        return `
        /* Custom Application Metadata Span Processor */
        export class ApplicationMetadataSpanProcessor implements SpanProcessor {
            private _nextProcessor: SpanProcessor;
            private _applicationMetadata: ApplicationMetadata;

            constructor(nextProcessor: SpanProcessor, applicationMetadata: ApplicationMetadata){
                this._nextProcessor = nextProcessor;
                this._applicationMetadata = applicationMetadata;
            }
            
            onStart(span: Span, parentContext: Context): void {
                span.setAttribute('app.metadata.name', this._applicationMetadata.name);
                span.setAttribute('app.metadata.normalizedName', this._applicationMetadata.normalizedName);
                span.setAttribute('app.metadata.technology', this._applicationMetadata.technology);
                span.setAttribute('app.metadata.instrumentationBundleName', this._applicationMetadata.instrumentationBundleName);
                this._nextProcessor.onStart(span, parentContext);
            }

            forceFlush(): Promise<void>{
                return this._nextProcessor.forceFlush();
            }

            onEnd(span: Span): void {
                this._nextProcessor.onEnd(span);
            }

            shutdown(): Promise<void> {
                return this._nextProcessor.shutdown();
            }
        }
        `.trim();
    }
}