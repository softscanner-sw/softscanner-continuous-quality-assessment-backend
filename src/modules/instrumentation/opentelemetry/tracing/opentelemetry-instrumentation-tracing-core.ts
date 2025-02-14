import { TelemetryExportDestination, TelemetryType, UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryUserInteractionEventsConfig } from "../opentelemetry-core";

/**
 * Class representing options for automatic tracing in OpenTelemetry.
 * These options specify what types of events and data should be captured.
 */
export class OpenTelemetryAutomaticTracingOptions {
    constructor(
        /**
         * Configuration for user interaction events to be traced (e.g., clicks, form submissions).
         */
        public userInteractions: OpenTelemetryUserInteractionEventsConfig,

        /**
         * Whether to trace document loading and resource fetching.
         * Default: true
         */
        public documentLoad: boolean = true,

        /**
         * Whether to trace requests made using the Fetch API.
         * Default: true
         */
        public fetchApi: boolean = true,

        /**
         * Whether to trace AJAX requests (XMLHttpRequest).
         * Default: true
         */
        public ajaxRequests: boolean = true,

        /**
         * Whether to capture session data (e.g., session IDs).
         * Default: false
         */
        public sessionData: boolean = false,

        /**
         * Whether to include application metadata during tracing (e.g., app name, version).
         * Default: false
         */
        public appMetadata: boolean = false,
    ) { }
}

/**
 * Configuration class for OpenTelemetry tracing instrumentation.
 * Extends the base configuration and adds specific options for tracing.
 */
export class OpenTelemetryTracingInstrumentationConfig extends OpenTelemetryInstrumentationConfig {
    /**
     * An optional array of user interaction events to be traced.
     * For example: click, submit, navigation.
     */
    public userInteractionEvents?: UserInteractionEvent[];
    constructor(
        /**
         * One or multiple types of telemetry to be collected.
         * Example: Tracing, Metrics, Logs.
         */
        public telemetryTypes: TelemetryType[],

        /**
         * One or multiple destinations where telemetry data will be exported.
         * Example: OpenTelemetry collector, external monitoring service.
         */
        public exportDestinations: TelemetryExportDestination[],
        
        /**
         * Options for automatic tracing, specifying what to trace and how.
         */
        public automaticTracingOptions: OpenTelemetryAutomaticTracingOptions,
    ) {
        // Call the parent class constructor to initialize telemetry types and export destinations
        super(telemetryTypes, exportDestinations);

        // Set the user interaction events to the ones defined in the automatic tracing options
        this.userInteractionEvents = this.automaticTracingOptions.userInteractions.events;
    }
}