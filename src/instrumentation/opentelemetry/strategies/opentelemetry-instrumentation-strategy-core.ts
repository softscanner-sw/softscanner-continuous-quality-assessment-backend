import { ApplicationMetadata } from "../../../core/application-core";
import { AbstractInstrumentationStrategy } from "../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig } from "../opentelemetry-instrumentation";

// Abstract Strategy class for all OpenTelemetry instrumentation strategies
export abstract class OpenTelemetryInstrumentationStrategy extends AbstractInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(
        config: OpenTelemetryInstrumentationConfig,
        application: ApplicationMetadata,
    ) {
        super(config, application)
    }
}

// Abstract Strategy class for all setup and configuration instrumentation strategies of main telemetry types
export abstract class OpenTelemetryMainInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /* CONSTRUCTOR */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /* METHODS */
    public abstract generateProvider(): string;
    public abstract generateProviderRegistration(): string;
    public abstract generateProviderExporters(): string;
}