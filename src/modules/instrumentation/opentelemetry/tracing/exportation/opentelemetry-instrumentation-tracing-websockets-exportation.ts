import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Instrumentation, InstrumentationGenerator } from "../../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../../opentelemetry-core";

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