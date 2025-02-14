import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { AbstractInstrumentationStrategy } from "../../../core/instrumentation/instrumentation-core";
import { TelemetryConfig, TelemetryExportDestination, TelemetryType, UserInteractionEvent } from "../../../core/telemetry/telemetry";
import { Utils } from "../../../core/util/util-core";

/**
 * Class responsible for managing a registry of user interaction events and their string representations 
 * for OpenTelemetry instrumentation.
 */
export class OpenTelemetryEventRegistry {
    static registry: Map<UserInteractionEvent, string> = new Map<UserInteractionEvent, string>();

    // Static block to initialize the registry when the class is loaded
    static {
        this.initialize()
    }

    /**
     * Initializes the event registry by mapping each `UserInteractionEvent` enum value
     * to its lowercase string representation without separators (e.g., `MouseClick` -> `mouseclick`).
     */
    private static initialize() {
        const enumValuesString = Utils.getEnumStringValues(UserInteractionEvent);
        for (let enumValue of enumValuesString) {
            // Convert enum value to its corresponding `UserInteractionEvent`
            const event = UserInteractionEvent[enumValue as keyof typeof UserInteractionEvent] as UserInteractionEvent;

            // Convert the event name to a lowercase string with no separators (required for OpenTelemetry)
            const eventString = Utils.convertEnumValueToLowercaseWithNoSeparator(enumValue);

            // Add the event and its string representation to the registry
            this.registry.set(event, eventString);
        }
    }

    /**
     * Returns all the `UserInteractionEvent` values registered in the map.
     * @returns {UserInteractionEvent[]} List of user interaction events.
     */
    public static events(): UserInteractionEvent[] {
        let events: UserInteractionEvent[] = [];

        for (let [event, str] of this.registry) {
            events.push(event);
        }

        return events;
    }

    /**
     * Returns all string representations of the registered user interaction events.
     * @returns {string[]} List of string representations.
     */
    public static stringRepresentations(): string[] {
        let eventStrs: string[] = [];

        for (let [event, str] of this.registry) {
            eventStrs.push(str);
        }

        return eventStrs;
    }

    /**
     * Gets the string representation for a specific `UserInteractionEvent`.
     * @param {UserInteractionEvent} event - The event to get the string representation for.
     * @returns {string | undefined} String representation if available, otherwise undefined.
     */
    public static getStringRepresentation(event: UserInteractionEvent): string | undefined {
        return this.registry.get(event);
    }

    /**
     * Converts an array of `UserInteractionEvent` values to their string representations.
     * @param {UserInteractionEvent[]} events - List of events to convert.
     * @returns {string[]} List of string representations.
     */
    public static getStringRepresentations(events: UserInteractionEvent[]): string[] {
        let target: string[] = [];
        events.forEach(event => {
            let str = this.getStringRepresentation(event);
            if (str)
                target.push(str);

        })
        return target;
    }
}

/**
 * Configuration class for user interaction events in OpenTelemetry.
 * Defines whether event tracing is enabled and which specific events are tracked.
 */
export class OpenTelemetryUserInteractionEventsConfig {
    constructor(
        public enabled: boolean,  // Indicates if event tracing is enabled
        public events: UserInteractionEvent[]  // List of events to trace
    ) { }
}

/**
 * Abstract base class for OpenTelemetry instrumentation strategies.
 * Defines a common structure for instrumentation configurations.
 */
export abstract class OpenTelemetryInstrumentationStrategy extends AbstractInstrumentationStrategy {
    /**
     * Constructor for the base OpenTelemetry instrumentation strategy.
     * @param {OpenTelemetryInstrumentationConfig} config - Configuration for the strategy.
     * @param {ApplicationMetadata} application - Metadata about the application being instrumented.
     */
    constructor(
        config: OpenTelemetryInstrumentationConfig,
        application: ApplicationMetadata,
    ) {
        super(config, application)
    }
}

/**
 * Abstract class for OpenTelemetry instrumentation strategies related to main telemetry types.
 * Requires implementation of methods to generate OpenTelemetry providers and exporters.
 */
export abstract class OpenTelemetryMainInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the main OpenTelemetry instrumentation strategy.
     * @param {OpenTelemetryInstrumentationConfig} config - Configuration for the strategy.
     * @param {ApplicationMetadata} application - Metadata about the application being instrumented.
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the OpenTelemetry provider setup code.
     * @abstract
     * @returns {string} Code for setting up the provider.
     */
    public abstract generateProvider(): string;

    /**
     * Generates the provider registration code for OpenTelemetry.
     * @abstract
     * @returns {string} Code for registering the provider.
     */
    public abstract generateProviderContextManagerRegistration(): string;

    /**
     * Generates the provider exporter configuration.
     * @abstract
     * @returns {string} Code for setting up exporters.
     */
    public abstract generateProviderExporters(): string;
}

/**
 * Configuration class for OpenTelemetry instrumentation.
 * Specifies the types of telemetry and export destinations.
 */
export class OpenTelemetryInstrumentationConfig implements TelemetryConfig {
    constructor(
        public telemetryTypes: TelemetryType[],  // List of telemetry types (e.g., traces, metrics)
        public exportDestinations: TelemetryExportDestination[]  // List of export destinations (e.g., local file, remote server)
    ) { }
}