import { OpenTelemetryInstrumentationGenerator } from "../../modules/instrumentation/opentelemetry/opentelemetry-instrumentation";
import { OpenTelemetryAutomaticTracingOptions, OpenTelemetryTracingInstrumentationConfig } from "../../modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-core";
import { ApplicationMetadata } from "../application/application-metadata";
import { Metric } from "../metrics/metrics-core";
import { TelemetryExportDestinationType, TelemetryExportProtocol, TelemetryType, UserInteractionEvent } from "../telemetry/telemetry";
import { InstrumentationBundle } from "./instrumentation-core";

/**
 * Handles the generation of instrumentation files based on the mapped metrics.
 */
export class InstrumentationManager {
    /**
     * Generates the instrumentation files and bundles them for the given application.
     * @param appMetadata The metadata of the application being instrumented.
     * @param metrics The metrics to be instrumented.
     */
    public async generateInstrumentation(appMetadata: ApplicationMetadata, metrics: Metric[]): Promise<InstrumentationBundle> {
        console.log('Generating instrumentation...');

        // Determine the required telemetry types based on the provided metrics
        const telemetryTypes: TelemetryType[] = Array.from(
            new Set(metrics.flatMap(metric => metric.requiredTelemetry))
        );

        // Define the OpenTelemetry configuration
        const telemetryConfig = new OpenTelemetryTracingInstrumentationConfig(
            telemetryTypes,
            [{
                type: TelemetryExportDestinationType.LOCAL_COLLECTOR,
                protocol: TelemetryExportProtocol.WEB_SOCKETS,
                url: 'ws://localhost:8081'
            }],
            new OpenTelemetryAutomaticTracingOptions({
                enabled: true,
                events: UserInteractionEvent.getMainEvents()
            },
                false, false, false, true, true)
        );

        // Create an instance of the OpenTelemetry instrumentation generator
        const generator = new OpenTelemetryInstrumentationGenerator(appMetadata, metrics, telemetryConfig);

        // Generate the instrumentation files
        await generator.generateInstrumentationFiles();

        // Bundle the generated instrumentation files
        await generator.generateInstrumentationBundle();

        const bundle = generator.getInstrumentationBundle();

        console.log('Instrumentation generation completed successfully!');

        return bundle;
    }
}