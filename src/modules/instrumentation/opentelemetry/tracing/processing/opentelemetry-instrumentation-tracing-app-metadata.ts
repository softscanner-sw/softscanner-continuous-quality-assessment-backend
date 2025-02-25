import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Instrumentation, InstrumentationGenerator } from "../../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../../opentelemetry-core";

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
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', this.application.type.toLowerCase().includes('frontend') ? '@opentelemetry/sdk-trace-web' : '@opentelemetry/sdk-trace-base')}
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