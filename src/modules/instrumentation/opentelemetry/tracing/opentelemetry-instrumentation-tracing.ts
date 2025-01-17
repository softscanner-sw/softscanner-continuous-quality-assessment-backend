import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { ApplicationInstrumentationMetadata, Instrumentation, InstrumentationGenerator } from "../../../../core/instrumentation/instrumentation-core";
import { TelemetryExportDestination, TelemetryExportDestinationType, TelemetryExportProtocol } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryEventRegistry, OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy, OpenTelemetryMainInstrumentationStrategy } from "../opentelemetry-core";
import { OpenTelemetryTracingInstrumentationConfig } from "./opentelemetry-instrumentation-tracing-core";

// Concrete Strategy for Tracing
export class OpenTelemetryTracingInstrumentationStrategy extends OpenTelemetryMainInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(
        config: OpenTelemetryTracingInstrumentationConfig,
        protected _applicationInstrumentationMetadata: ApplicationInstrumentationMetadata) {
        super(config, _applicationInstrumentationMetadata.appMetadata);
    }

    get applicationMetadata(): ApplicationInstrumentationMetadata {
        return this._applicationInstrumentationMetadata;
    }

    /* METHODS */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `${this._application.generateNormalizedApplicationName('-')}-tracing.ts`
        ));

        return instrumentations;
    }

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
        ${this.generateProviderRegistration()}

        // Tracer provider Automatic instrumentation registration
        ${this.generateTracerProviderAutoInstrumentationRegistration()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

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

    public generateConstants(): string {
        const applicationNormalizedName = this._application.generateNormalizedApplicationName('-');

        return `
        const serviceName = "${applicationNormalizedName}";
        const serviceInstanceID = "${applicationNormalizedName}-1";
        `.trim();
    }

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

    public generateProviderRegistration(): string {
        return `
        tracerProvider.register({
            contextManager: new ZoneContextManager(),
        });
        `.trim();
    }

    public generateProviderExporters(): string {
        const exportDestinations = (this._config as OpenTelemetryInstrumentationConfig).exportDestinations;
        let content = '';

        // Create a console exporter (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.type == TelemetryExportDestinationType.CONSOLE)) {
            content = `
            // Console exporter
            ${this.generateConsoleExporter()}
            `.trim();
        }

        // create an OTLP Trace Exporter (if provided in the configuration)
        exportDestinations.filter(exportDestination => exportDestination.protocol == TelemetryExportProtocol.OTLP)
            .forEach(exportDestination => {
                content = `
            ${content}

            // OpenTelemetry OTLP Trace Exporter
            ${this.generateCollectorExporter(exportDestination)}
            `.trim();
            })

        // create a Web Sockets Trace Exporter (if provided in the configuration)
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

    private generateConsoleExporter(): string {
        return `
        const consoleExporter = new ConsoleSpanExporter();
        `.trim();
    }

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

    private generateAddSpanProcessors(): string {
        const config = this._config as OpenTelemetryTracingInstrumentationConfig;
        const automaticTracingOptions = config.automaticTracingOptions;
        const exportDestinations = config.exportDestinations;
        let content = '';

        exportDestinations.forEach(exportDestination => {
            let exporterName = this.getTelemetryExporterVariableName(exportDestination);
            let simpleSpanProcessor = `new SimpleSpanProcessor(${exporterName})`;  // default (batch processing to be added later)
            let spanProcessor = simpleSpanProcessor;

            // Check for metadata span processing
            if (automaticTracingOptions.appMetadata) {
                spanProcessor = `new ApplicationMetadataSpanProcessor(
                    ${spanProcessor}, {
                        name: '${this._application.name}',
                        normalizedName: '${this._application.generateNormalizedApplicationName('-')}',
                        technology: '${this._application.technology}',
                        instrumentationBundleName: '${this._applicationInstrumentationMetadata.bundleName}'
                    })
                `.trim();
            }

            // Check for session span processing
            if (automaticTracingOptions.sessionData) {
                spanProcessor = `new SessionIdSpanProcessor( // Session data
                    ${spanProcessor})
                `.trim();
            }

            content = `
            ${content}

            tracerProvider.addSpanProcessor(
                ${spanProcessor}
            );
            `.trim()
        });

        return content;
    }

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

// Concrete strategy for generating instrumentation files to trace session data
export class OpenTelemetrySessionDataInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /* METHODS */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `sessionUtils.ts`
        ));

        return instrumentations;
    }

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

    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', '@opentelemetry/sdk-trace-web')}
        ${InstrumentationGenerator.generateImportFromStatement('v4 as uuidv4', 'uuid')}
        `.trim();
    }

    private generateFunctions(): string {
        return `
        /* Generates session IDs using UUIDV4 */
        function generateSessionId(){
            return uuidv4();
        }
        `.trim();
    }

    private generateInterfaces(): string {
        return `
        /* Custom Session Interface */
        interface ISession {
            sessionId: string;
        }
        `.trim();
    }

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

// Concrete strategy for generating a web sockets span exporter that will be used by the instrumentation
export class OpenTelemetryWebSocketsSpanExportationInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /* METHODS */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `exporterUtils.ts`
        ));

        return instrumentations;
    }

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

    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('SpanExporter, ReadableSpan', '@opentelemetry/sdk-trace-base')}
        ${InstrumentationGenerator.generateImportFromStatement('ExportResult, ExportResultCode', '@opentelemetry/core')}
        `.trim();
    }

    public generateConstants(): string {
        return ""; // no constants
    }

    private generateInterfaces(): string {
        return `
        /* Configuration for WebSocketSpanExporter */
        export interface WebSocketSpanExporterConfig {
            url: string
        }
        `.trim();
    }

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

// Concrete strategy for generating a metadata span processor that will be used by the instrumentation
export class OpenTelemetryMetadataSpanProcessingInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /* METHODS */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `appMetadataUtils.ts`
        ));

        return instrumentations;
    }

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

    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', '@opentelemetry/sdk-trace-web')}
        `.trim();
    }

    public generateConstants(): string {
        return ""; // no constants
    }

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