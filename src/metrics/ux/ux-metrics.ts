import { TelemetryType, UserInteractionEvent } from "../../core/instrumentation/instrumentation-core";
import { Metric } from "../../core/metrics/metrics-core";
import { Utils } from "../../core/util/util-core";

/**
 * Represents a User Experience (UX) specific metric. This is an extension
 * of the Metric class, tailored to UX metrics, including an acronym for
 * the metric.
 */
export abstract class UXMetric extends Metric {
    protected _value: any;

    /**
     * Constructs a new UXMetric instance.
     * @param name The name of the UX metric.
     * @param description A brief description of what the UX metric measures.
     * @param acronym An optional acronym for the metric.
     * @param requiredTelemetry The types of telemetry required to compute this UX metric.
     */
    constructor(name: string, description: string,
        protected acronym: string = "",
        requiredTelemetry: TelemetryType[] = []) {
        super(name, description, requiredTelemetry);
    }

    displayInfo(): void {
        console.log(`name: ${this.name}, acronym: ${this.acronym}, description: ${this.description}, value: ${this._value}`);
    }
}

export class NUUMetric extends UXMetric {
    _value: number = 0;

    constructor(
        private _nbSessions: number = 1,
    ) {
        super("Number of Unique Users", "Number of distinct users using an application", "NUU", [TelemetryType.TRACING]);
    }

    get nbSessions(): number{
        return this._nbSessions;
    }

    set nbSessions(nbSessions: number){
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Calculates and returns the Number of Unique Users (NUU) value.
     */
    computeValue(telemetryData: any[]) {
        if (!this._value){
            // Compute distinct number of sessions
            let sessions: Set<string> = new Set<string>();

            telemetryData
                .map(data => data.attributes["app.session.id"])
                .forEach(sessionID => {
                    if (!sessions.has(sessionID))
                        sessions.add(sessionID);
                });
            this._nbSessions = sessions.size;

            // Compute metric
            if (this._nbSessions > 0)
                this._value = this._nbSessions;
        }

        return this._value;
    }
    
}

export class UIFMetric extends UXMetric {
    _value: number = 0;

    constructor(
        private _totalInteractions: number = 0,
        private _nbSessions: number = 1,
        private _selectedEvents: UserInteractionEvent[] = [],
    ) {
        super("User Interaction Frequency", "How frequently users interact with the software during a typical session", "UIF", [TelemetryType.TRACING]);
    }

    get totalInteractions(): number{
        return this._totalInteractions;
    }

    set totalInteractions(totalInteractions: number){
        this._totalInteractions = totalInteractions;
    }

    get nbSessions(): number{
        return this._nbSessions;
    }

    set nbSessions(nbSessions: number){
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Calculates and returns the User Interaction Frequency (UIF) value.
     */
    computeValue(telemetryData: any[]): number {
        if (this._value == 0){
            const selectedEventsStr = this._selectedEvents.map(event => {
                return Utils.convertEnumValueToLowercaseWithNoSeparator(UserInteractionEvent[event])
            });

            // Compute total number of interactions
            let nbInteractions = 0;
            telemetryData
                .map(data => data.attributes["event_type"])
                .forEach(name => {
                    if (selectedEventsStr.includes(name))
                        nbInteractions++;
                });
            this._totalInteractions = nbInteractions;

            // Compute number of sessions
            let sessions: Set<string> = new Set<string>();

            telemetryData
                .map(data => data.attributes["app.session.id"])
                .forEach(sessionID => {
                    if (!sessions.has(sessionID))
                        sessions.add(sessionID);
                });
            this._nbSessions = sessions.size;

            // Compute metric
            if (this._nbSessions > 0)
                this._value = this._totalInteractions / this._nbSessions;
        }

        return this._value;
    }
}