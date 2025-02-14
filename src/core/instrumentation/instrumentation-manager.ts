import { OpenTelemetryInstrumentationGenerator } from "../../modules/instrumentation/opentelemetry/opentelemetry-instrumentation";
import { OpenTelemetryAutomaticTracingOptions, OpenTelemetryTracingInstrumentationConfig } from "../../modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-core";
import { ApplicationMetadata } from "../application/application-metadata";
import { Metric } from "../metrics/metrics-core";
import { TelemetryExportDestinationType, TelemetryExportProtocol, TelemetryType, UserInteractionEvent } from "../telemetry/telemetry";
import { InstrumentationBundle } from "./instrumentation-core";

/**
 * The `InstrumentationManager` is responsible for configuring the generation of specific instrumentation files
 * and bundling them for an application based on selected metrics and their telemetry requirements.
 */
export class InstrumentationManager {
    /**
     * Generates an instrumentation bundle for the given application and metrics.
     * This includes creating instrumentation configuration, generating instrumentation files,
     * and bundling them into a deployable format.
     * 
     * @param appMetadata Metadata of the application being instrumented (name, type, path, etc.).
     * @param metrics The list of metrics that define the telemetry to be collected.
     * @returns A promise that resolves to an `InstrumentationBundle` containing the generated files.
     */
    public async generateInstrumentation(appMetadata: ApplicationMetadata, metrics: Metric[]): Promise<InstrumentationBundle> {
        console.log('Instrumentation Manager: Generating instrumentation...');

        // Collect and deduplicate all required telemetry types from the provided metrics
        const telemetryTypes: TelemetryType[] = Array.from(
            new Set(metrics.flatMap(metric => metric.requiredTelemetry))
        );

        // Define the instrumentation configuration (OpenTelemetry tracing configuration by default)
        const telemetryConfig = new OpenTelemetryTracingInstrumentationConfig(
            telemetryTypes,
            [{
                type: TelemetryExportDestinationType.LOCAL_COLLECTOR,   // Set the destination to a local collector
                protocol: TelemetryExportProtocol.WEB_SOCKETS,          // Use WebSockets as the transport protocol
                url: 'ws://localhost:8081'                             // WebSocket server for telemetry collection
            }],
            new OpenTelemetryAutomaticTracingOptions(
                {
                    enabled: true,  // Enable automatic tracing
                    events: UserInteractionEvent.getMainEvents()  // Specify main user interaction events to capture
                },
                false, // Tracing for page loads
                false, // Fetch API calls tracking
                false, // Ajax Requests tracking
                true,  // Application Session ID tracking
                true   // Application Metadata tracking
            )
        );

        // Create an instance of an instrumentation generator with the given configuration (OpenTelemetry instrumentation generator by default)
        const generator = new OpenTelemetryInstrumentationGenerator(appMetadata, metrics, telemetryConfig);

        // Generate instrumentation files based on the defined metrics and telemetry types
        await generator.generateInstrumentationFiles();

        // Bundle the generated instrumentation files for deployment
        await generator.generateInstrumentationBundle();

        // Retrieve the generated instrumentation bundle
        const bundle = generator.getInstrumentationBundle();

        console.log('Instrumentation Manager: Instrumentation generation completed successfully!');

        return bundle;
    }
}