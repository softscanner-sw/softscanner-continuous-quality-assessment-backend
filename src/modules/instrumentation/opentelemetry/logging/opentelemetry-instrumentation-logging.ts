import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Instrumentation } from "../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../opentelemetry-core";

// Concrete Strategy for Logging
export class OpenTelemetryLoggingInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /* METHODS */
    public generateInstrumentationFiles(): Instrumentation[] {
        throw new Error("Method not implemented.");
    }
    public generateImportations(): string {
        throw new Error("Method not implemented.");
    }
    public generateConstants(): string {
        throw new Error("Method not implemented.");
    }
    public generateProvider(): string {
        throw new Error("Method not implemented.");
    }
    public generateProviderRegistration(): string {
        throw new Error("Method not implemented.");
    }
    public generateProviderExporters(): string {
        throw new Error("Method not implemented.");
    }
}