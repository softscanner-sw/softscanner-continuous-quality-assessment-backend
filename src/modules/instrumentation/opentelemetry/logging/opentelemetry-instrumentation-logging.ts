import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Instrumentation } from "../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../opentelemetry-core";

/**
 * Concrete implementation of the OpenTelemetryInstrumentationStrategy for logging purposes.
 * This strategy defines how instrumentation should be configured and generated to log telemetry data.
 */
export class OpenTelemetryLoggingInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Initializes a new instance of the OpenTelemetryLoggingInstrumentationStrategy.
     * @param config The configuration object for the OpenTelemetry instrumentation.
     * @param application Metadata about the application being instrumented.
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the necessary files for OpenTelemetry logging instrumentation.
     * @returns An array of Instrumentation objects representing the generated files.
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        throw new Error("Method not implemented.");
    }

    /**
     * Generates the import statements required for logging instrumentation.
     * @returns A string containing the generated import statements.
     */
    public generateImportations(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Generates constant declarations used in the logging instrumentation.
     * @returns A string containing the constant declarations.
     */
    public generateConstants(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Generates the provider code for the OpenTelemetry logging instrumentation.
     * @returns A string representing the generated provider code.
     */
    public generateProvider(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Generates the provider registration code for logging instrumentation.
     * @returns A string representing the provider registration.
     */
    public generateProviderRegistration(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Generates the exporter configuration for the provider.
     * @returns A string representing the provider exporter configuration.
     */
    public generateProviderExporters(): string {
        throw new Error("Method not implemented.");
    }
}