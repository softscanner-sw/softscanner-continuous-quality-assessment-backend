import { Goal } from "../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../core/metrics/metrics-interpreters";
import { TelemetryType, UserInteractionEvent } from "../../../core/telemetry/telemetry";
import { Utils } from "../../../core/util/util-core";

/**
 * Represents the metric for calculating the Number of Unique Users (NUU) in an application.
 * This metric counts the number of distinct user sessions to measure user engagement.
 */
export class NUUMetric extends Metric {
    _value: number = 0;

    constructor(
        private _nbSessions: number = 1,
    ) {
        super("Number of Unique Users", "Number of distinct users using an application", "users", "NUU");
    }

    /**
     * Returns the number of sessions used for computation.
     */
    get nbSessions(): number {
        return this._nbSessions;
    }

    /**
     * Sets the number of sessions. Throws an error if set to zero.
     */
    set nbSessions(nbSessions: number) {
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Computes the value for the **Number of Unique Users (NUU)** metric.
     * @param telemetryData An array of telemetry data to analyze.
     * @returns The computed value representing the number of unique sessions.
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

    /**
     * Resets the value and session count to the default state.
     */
    resetValue(): void {
        super.resetValue();
        this._nbSessions = 1;
    }

}

/**
 * Provides interpretation logic for the Number of Unique Users (NUU) metric.
 * This class assigns a weight to the metric based on the selected goals.
 */
export class NUUInterpreter extends MetricInterpreter {
    constructor(metric: NUUMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 200); // Initial hardcoded max value for NUU
    }

    /**
     * Assigns a weight to the **NUU** metric.
     * @returns A weight of 0.4 if "User Engagement" is a selected goal; otherwise, 0.2.
     */
    assignWeight(): number {
        return this.selectedGoals.some(goal => goal.name === "User Engagement") ? 0.4 : 0.2;
    }
}

/**
 * Represents the User Interaction Frequency (UIF) metric,
 * which calculates how frequently users interact with the application during a session.
 */
export class UIFMetric extends Metric {
    _value: number = 0;

    constructor(
        private _totalInteractions: number = 0,
        private _nbSessions: number = 1,
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        super("User Interaction Frequency", "How frequently users interact with the software during a typical session", "interactions/session", "UIF");
    }

    /**
     * Returns the total number of interactions.
     */
    get totalInteractions(): number {
        return this._totalInteractions;
    }

    /**
     * Sets the total number of interactions.
     */
    set totalInteractions(totalInteractions: number) {
        this._totalInteractions = totalInteractions;
    }

    /**
     * Returns the number of sessions used for computation.
     */
    get nbSessions(): number {
        return this._nbSessions;
    }

    /**
     * Sets the number of sessions. Throws an error if set to zero.
     */
    set nbSessions(nbSessions: number) {
        if (this._nbSessions === 0) {
            throw new Error("Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Computes the value for **User Interaction Frequency (UIF)**.
     * @param telemetryData An array of telemetry data to analyze.
     * @returns The computed value representing interactions per session.
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

        return this._value;
    }

    /**
     * Resets the value, total interactions, and session count to the default state.
     */
    resetValue(): void {
        super.resetValue();
        this._totalInteractions = 0;
        this._nbSessions = 1;
    }
}

/**
 * Provides interpretation logic for the User Interaction Frequency (UIF) metric.
 * This class assigns a weight to the metric based on the selected goals.
 */
export class UIFInterpreter extends MetricInterpreter {
    constructor(metric: UIFMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 500); // Initial hardcoded max value for UIF
    }

    /**
     * Assigns a weight to the **UIF** metric.
     * @returns A weight of 0.6 if "User Engagement" is a selected goal; otherwise, 0.3.
     */
    assignWeight(): number {
        return this.selectedGoals.some(goal => goal.name === "User Engagement") ? 0.6 : 0.3;
    }
}

/**
 * This class is responsible for mapping the User Engagement goal to its corresponding metrics:
 * Number of Unique Users (NUU) and User Interaction Frequency (UIF).
 */
export class UserEngagementMapper implements GoalMapper {
    
    /**
     * Maps the **User Engagement** goal to its metrics (NUU and UIF).
     * @param goal The goal to map.
     * @throws An error if the goal is not "User Engagement".
     */
    map(goal: Goal) {
        if (goal.name !== "User Engagement")
            throw new Error(`Incorrect Mapper for Goal ${goal.name}`);

        const nuu = new NUUMetric();
        nuu.setRequiredTelemetry([TelemetryType.TRACING]); // Metric requires tracing telemetry.
        const uif = new UIFMetric();
        uif.setRequiredTelemetry([TelemetryType.TRACING]); // Metric requires tracing telemetry.

        goal.metrics.push(nuu, uif);
    }
}