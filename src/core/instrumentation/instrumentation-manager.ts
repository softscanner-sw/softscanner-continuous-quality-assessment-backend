import { OpenTelemetryInstrumentationGenerator } from "../../modules/instrumentation/opentelemetry/opentelemetry-instrumentation";
import { OpenTelemetryAutomaticTracingOptions, OpenTelemetryNodeAutomaticTracingOptions, OpenTelemetryTracingInstrumentationConfig, OpenTelemetryWebAutomaticTracingOptions } from "../../modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-core";
import { ApplicationMetadata } from "../application/application-metadata";
import { Metric } from "../metrics/metrics-core";
import { TelemetryExportDestinationType, TelemetryExportProtocol, TelemetryType } from "../telemetry/telemetry";
import { InstrumentationSelection, assertSatisfied, selectInstrumentation } from "./instrumentation-capabilities";
import { DefaultInstrumentationBundle, InstrumentationBundle } from "./instrumentation-core";

/**
 * The `InstrumentationManager` is responsible for configuring the generation of specific instrumentation files
 * and bundling them for an application based on selected metrics and their observation requirements.
 *
 * The configuration is derived from the metrics: their declared telemetry types decide whether tracing is
 * generated, and their resolved observation requirements (direct and inherited, see `metric-observables.ts`)
 * decide which instrumentation modules, interaction events and span processors are enabled
 * (see `instrumentation-capabilities.ts`).
 */
export class InstrumentationManager {
    /** Selection computed by the last call to `generateInstrumentation` (for reporting). */
    public lastSelection?: InstrumentationSelection;

    /**
     * Computes the instrumentation selection (modules, events, processors) for the given application and
     * metrics, without generating anything. Throws an `InstrumentationSelectionError` when the platform is
     * unsupported, a metric has no declared observation requirement, or a requirement cannot be satisfied.
     */
    public planInstrumentation(appMetadata: ApplicationMetadata, metrics: Metric[]): InstrumentationSelection {
        return assertSatisfied(selectInstrumentation(appMetadata, metrics.map(metric => metric.acronym)));
    }

    /**
     * Builds the automatic tracing options of the generated agent from a selection.
     */
    public static tracingOptionsFor(selection: InstrumentationSelection): OpenTelemetryAutomaticTracingOptions {
        const module = (option: string) => selection.modules.some(m => m.option === option && m.enabled);
        const processor = (option: string) => selection.processors.some(p => p.option === option && p.enabled);
        const processors = { appMetadata: processor('appMetadata'), userIdData: processor('userIdData'), resourceData: processor('resourceData') };
        if (selection.platform === 'browser') {
            return new OpenTelemetryWebAutomaticTracingOptions({
                ...processors,
                userInteractions: { enabled: module('userInteractions'), events: selection.interactionEvents },
                documentLoad: module('documentLoad'),
                fetchApi: module('fetchApi'),
                ajaxRequests: module('ajaxRequests'),
            });
        }
        return new OpenTelemetryNodeAutomaticTracingOptions({
            ...processors,
            http: module('http'),
            express: module('express'),
            mysql: module('mysql'),
            mysql2: module('mysql2'),
        });
    }

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

        let bundle: InstrumentationBundle = new DefaultInstrumentationBundle();

        // Examine telemetry types to see if tracing is required
        if (telemetryTypes.includes(TelemetryType.TRACING)) {
            // Derive modules, interaction events and span processors from the metrics' observation requirements
            const selection = this.planInstrumentation(appMetadata, metrics);
            this.lastSelection = selection;
            console.log(`Instrumentation Manager: enabled modules [${selection.modules.filter(m => m.enabled).map(m => m.id).join(', ')}], ` +
                `processors [${selection.processors.filter(p => p.enabled).map(p => p.id).join(', ')}]`);

            // Define the instrumentation configuration (OpenTelemetry tracing configuration by default)
            const telemetryConfig = new OpenTelemetryTracingInstrumentationConfig(
                telemetryTypes,
                [{
                    type: TelemetryExportDestinationType.LOCAL_COLLECTOR,   // Set the destination to a local collector
                    protocol: TelemetryExportProtocol.WEB_SOCKETS,          // Use WebSockets as the transport protocol
                    url: 'ws://localhost:8081'                             // WebSocket server for telemetry collection
                }],
                InstrumentationManager.tracingOptionsFor(selection)
            );

            // Create an instance of an instrumentation generator with the given configuration (OpenTelemetry instrumentation generator by default)
            const generator = new OpenTelemetryInstrumentationGenerator(appMetadata, metrics, telemetryConfig);

            // Generate instrumentation files based on the defined metrics and telemetry types
            await generator.generateInstrumentationFiles();

            // Bundle the generated instrumentation files for deployment
            await generator.generateInstrumentationBundle();

            // Retrieve the generated instrumentation bundle
            bundle = generator.getInstrumentationBundle();
        }

        console.log('Instrumentation Manager: Instrumentation generation completed successfully!');

        return bundle;
    }
}
