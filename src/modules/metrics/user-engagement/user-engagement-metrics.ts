import { Goal } from "../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../core/metrics/metrics-core";
import { TelemetryType, UserInteractionEvent } from "../../../core/telemetry/telemetry";
import { Utils } from "../../../core/util/util-core";

export class NUUMetric extends Metric {
    _value: number = 0;

    constructor(
        private _nbSessions: number = 1,
    ) {
        super("Number of Unique Users", "Number of distinct users using an application", "NUU");
    }

    get nbSessions(): number {
        return this._nbSessions;
    }

    set nbSessions(nbSessions: number) {
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Calculates and returns the Number of Unique Users (NUU) value.
     */
    computeValue(telemetryData: any[]) {
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

        return this._value;
    }

    resetValue(): void {
        super.resetValue();
        this._nbSessions = 1;
    }

}

export class UIFMetric extends Metric {
    _value: number = 0;

    constructor(
        private _totalInteractions: number = 0,
        private _nbSessions: number = 1,
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        super("User Interaction Frequency", "How frequently users interact with the software during a typical session", "UIF");
    }

    get totalInteractions(): number {
        return this._totalInteractions;
    }

    set totalInteractions(totalInteractions: number) {
        this._totalInteractions = totalInteractions;
    }

    get nbSessions(): number {
        return this._nbSessions;
    }

    set nbSessions(nbSessions: number) {
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Calculates and returns the User Interaction Frequency (UIF) value.
     */
    computeValue(telemetryData: any[]): number {
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

        // console.log(`UIF computation: total interactions = ${nbInteractions}`);

        // Compute number of sessions
        let sessions: Set<string> = new Set<string>();

        telemetryData
            .map(data => data.attributes["app.session.id"])
            .forEach(sessionID => {
                if (!sessions.has(sessionID))
                    sessions.add(sessionID);
            });
        this._nbSessions = sessions.size;

        // console.log(`UIF computation: nb sessions = ${sessions.size}`);

        // Compute metric
        if (this._nbSessions > 0)
            this._value = this._totalInteractions / this._nbSessions;

        return this._value;
    }

    resetValue(): void {
        super.resetValue();
        this._totalInteractions = 0;
        this._nbSessions = 1;
    }
}

export class UserEngagementMapper implements GoalMapper {
    map(goal: Goal) {
        if (goal.name !== "User Engagement")
            throw new Error(`Incorrect Mapper for Goal ${goal.name}`);

        const nuu = new NUUMetric();
        nuu.setRequiredTelemetry([TelemetryType.TRACING]); // mapping metric to observable data
        const uif = new UIFMetric();
        uif.setRequiredTelemetry([TelemetryType.TRACING]); // mapping metric to observable data

        goal.metrics.push(nuu, uif);
    }

}