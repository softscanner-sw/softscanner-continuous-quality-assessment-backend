import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { AbstractInstrumentationStrategy } from "../../../core/instrumentation/instrumentation-core";
import { TelemetryConfig, TelemetryExportDestination, TelemetryType, UserInteractionEvent } from "../../../core/telemetry/telemetry";
import { Utils } from "../../../core/util/util-core";

export class OpenTelemetryEventRegistry {
    static registry: Map<UserInteractionEvent, string> = new Map<UserInteractionEvent, string>();

    static {
        this.initialize()
    }

    private static initialize() {
        const enumValuesString = Utils.getEnumStringValues(UserInteractionEvent);
        for (let enumValue of enumValuesString) {
            // Event representation in the enum
            const event = UserInteractionEvent[enumValue as keyof typeof UserInteractionEvent] as UserInteractionEvent;

            // Event string representation as required by the OpenTelemetry instrumentation
            // to capture user interactions during tracing. (i.e., lowercase and no separator)
            const eventString = Utils.convertEnumValueToLowercaseWithNoSeparator(enumValue);
            this.registry.set(event, eventString);
        }
    }

    public static events(): UserInteractionEvent[] {
        let events: UserInteractionEvent[] = [];

        for (let [event, str] of this.registry) {
            events.push(event);
        }

        return events;
    }

    public static stringRepresentations(): string[] {
        let eventStrs: string[] = [];

        for (let [event, str] of this.registry) {
            eventStrs.push(str);
        }

        return eventStrs;
    }

    public static getStringRepresentation(event: UserInteractionEvent): string | undefined {
        return this.registry.get(event);
    }

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

export class OpenTelemetryUserInteractionEventsConfig {
    constructor(
        public enabled: boolean, // enabled/disabled
        public events: UserInteractionEvent[] // events to enable
    ) { }
}

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

export class OpenTelemetryInstrumentationConfig implements TelemetryConfig {
    constructor(
        // one or multiple telemetry types
        public telemetryTypes: TelemetryType[],
        // one or multiple export destinations
        public exportDestinations: TelemetryExportDestination[]
    ) { }
}