import { Goal } from "../../../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType, UserInteractionEvent } from "../../../../../core/telemetry/telemetry";
import { Utils } from "../../../../../core/util/util-core";

/**
 * Represents the **User Interaction Frequency (UIF)** metric.
 * This metric calculates **how frequently users interact with the app during a session**
 * to measure `Interaction Capability -> User Engagement -> Activity`.
 */
export class UIFMetric extends Metric {
    _value: number = 0;

    constructor(
        private _totalInteractions: number = 0,
        private _nbSessions: number = 1,
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        // The metric requires tracing telemetry
        super("User Interaction Frequency", "How frequently users interact with the software during a typical session", "interactions/session", "UIF", [TelemetryType.TRACING]);
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
            throw new Error("UIF Metric: Number of sessions cannot be zero.");
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
 * Provides interpretation logic for the **User Interaction Frequency (UIF)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `500` is used for the dynamic interpretation logic.
 */
export class UIFInterpreter extends MetricInterpreter {
    constructor(metric: UIFMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 500); // Initial hardcoded max value for UIF
    }

    /**
     * Assigns a weight to the **UIF** metric.
     * @returns A weight dynamically computed based the selected goals; otherwise, 0.3.
     */
    assignWeight(): number {
        let weight = 0.3; // default weight (@TODO for now, but is it a good idea, or should I consider other values?)
        // If selected goals includes "Activity"
        if (this.selectedGoals.some(goal => goal.name === "Activity")){
            const activity = this.selectedGoals.find(goal => goal.name === "Activity");
            if (activity)
                weight = (activity.weight || 1) / (activity.metrics.length || 1);
        }
        
        return weight;
    }
}

/**
 * Represents the **Click Depth Average (CDA)** metric.
 * This metric calculates **the average number of page views per visit**
 * (_i.e., user click events generate navigation to new pages/routes in the app_)
 * to measure `Interaction Capability -> User Engagement -> Activity`.
 */
// @TODO implement and identify what telemetry is required

/**
 * Provides interpretation logic for the **Click Depth Average (CDA)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `<@TODO>` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `<@TODO>` is used for the dynamic interpretation logic.
 */
// @TODO

/**
 * Represents the **Dwell Time Average (DTA)** metric.
 * This metric calculates **the average time per visit**
 * to measure `Interaction Capability -> User Engagement -> Activity`.
 */
// @TODO implement and identify what telemetry is required

/**
 * Provides interpretation logic for the **Dwell Time Average (DTA)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `<@TODO>` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `<@TODO>` is used for the dynamic interpretation logic.
 */
// @TODO implement and identify what telemetry is required

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Activity`
 * goal to its corresponding metrics:
 * 1. **User Interaction Frequency (UIF)**
 * 2. **Click Depth Average (CDA)**
 * 3. **Dwell Time Average (DTA)**.
 */
export class ActivityMapper implements GoalMapper {

    /**
     * Maps the `Interaction Capability -> User Engagement -> Activity` goal to its metrics (UIF, CDA, and DTA).
     * @param goal The goal to map.
     * @throws An error if the goal is not "Activity".
     */
    map(goal: Goal) {
        if (goal.name !== "Activity")
            throw new Error(`Activity Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Activity"
        goal.weight = 0.35;
        goal.metrics.push(
            new UIFMetric(),
            // @TODO include CDAMetric implementation
            // @TODO include DTAMetric implementation
        );
    }
}