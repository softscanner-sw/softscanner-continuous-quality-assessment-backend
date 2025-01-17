import { TelemetryExportDestination, TelemetryType, UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryUserInteractionEventsConfig } from "../opentelemetry-core";

export class OpenTelemetryAutomaticTracingOptions {
    constructor(
        public userInteractions: OpenTelemetryUserInteractionEventsConfig, // user interaction events
        public documentLoad: boolean = true, // document and resource loading and fetching
        public fetchApi: boolean = true, // fetch API requests
        public ajaxRequests: boolean = true, // AJAX requests
        public sessionData: boolean = false, // session data (e.g., ID)
        public appMetadata: boolean = false, // Application metadata recovered during the bundle generation
    ) { }
}

export class OpenTelemetryTracingInstrumentationConfig extends OpenTelemetryInstrumentationConfig {
    public userInteractionEvents?: UserInteractionEvent[];
    constructor(
        // one or multiple telemetry types
        public telemetryTypes: TelemetryType[],
        // one or multiple export destinations
        public exportDestinations: TelemetryExportDestination[],
        // automatic tracing options
        public automaticTracingOptions: OpenTelemetryAutomaticTracingOptions,
    ) {
        super(telemetryTypes, exportDestinations);
        this.userInteractionEvents = this.automaticTracingOptions.userInteractions.events;
        // "http://localhost:4318/v1/traces"
    }
}