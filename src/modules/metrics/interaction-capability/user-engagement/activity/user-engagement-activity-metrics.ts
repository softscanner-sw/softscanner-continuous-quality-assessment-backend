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
        super(
            "User Interaction Frequency",
            "How frequently users interact with the software during a typical session",
            "interactions/session",
            "UIF",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
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
     * @param telemetryData An array of telemetry data objects to analyze.
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
     * Resets the total interactions and session count parameters, and the metric value to their default states.
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
        let weight = 0.3; // default weight
        // If selected goals includes "Activity"
        if (this.selectedGoals.some(goal => goal.name === "Activity")) {
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
export class CDAMetric extends Metric {
    private _totalNavClicks: number = 0;
    private _uniqueVisits: number = 0;

    constructor() {
        super(
            "Click Depth Average",
            "Average number of navigation clicks (page views) per visit",
            "clicks/visit",
            "CDA",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Click Depth Average (CDA)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the average number of page views per visit
     */
    computeValue(telemetryData: any[]): number {
        // Identify set of visits and group navigation click events by visits
        const visits: Set<string> = new Set();
        const navClicksByVisit: { [visitId: string]: number } = {};

        // Populate the visits set and the navigation dictionary
        telemetryData.forEach(data => {
            const visitId = data.attributes["app.visit.id"];
            if (visitId) {
                visits.add(visitId);
                const eventType = data.attributes["event_type"];
                const traceName = data.name;
                if (
                    eventType === "click" &&
                    typeof traceName === "string" &&
                    traceName.toLowerCase().includes("navigation:")
                ) {
                    navClicksByVisit[visitId] = (navClicksByVisit[visitId] || 0) + 1;
                }
            }
        });

        // Compute the total number of navigation clicks from the navigation dictionary
        // and divide it by the number of unique visits computed from the visits sets
        // to obtain the CDA value
        this._uniqueVisits = visits.size;
        this._totalNavClicks = Object.values(navClicksByVisit).reduce((sum, count) => sum + count, 0);

        if (this._uniqueVisits > 0) {
            this._value = this._totalNavClicks / this._uniqueVisits;
        } else {
            this._value = 0;
        }
        return this._value;
    }

    /**
     * Resets the total navigation clicks and unique session parameters, and the metric value to their default states.
     */
    resetValue(): void {
        super.resetValue();
        this._value = 0;
        this._totalNavClicks = 0;
        this._uniqueVisits = 0;
    }
}

/**
 * Provides interpretation logic for the **Click Depth Average (CDA)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `10` is used for the dynamic interpretation logic.
 */
export class CDAInterpreter extends MetricInterpreter {
    constructor(metric: CDAMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 10); // Initial hardcoded max value for CDA
    }

    /**
     * Assigns a weight to the **CDA** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        if (this.selectedGoals.some(goal => goal.name === "Activity")) {
            const activity = this.selectedGoals.find(goal => goal.name === "Activity");
            if (activity)
                weight = (activity.weight || 1) / (activity.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * Represents the **Dwell Time Average (DTA)** metric.
 * This metric calculates **the average time per visit**
 * to measure `Interaction Capability -> User Engagement -> Activity`.
 */
export class DTAMetric extends Metric {
    constructor() {
        super(
            "Dwell Time Average",
            "Average time per visit (dwell time)",
            "ms/visit",
            "DTA",
            [TelemetryType.TRACING]
        );
    }

    /**
     * Computes the value for **Dwell Time Average (DTA)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing dwell time (average time per visit)
     */
    computeValue(telemetryData: any[]): number {
        // Group events by visit id and compute min start and max end times for each visit
        const visits: { [visitId: string]: { minTime: number; maxTime: number } } = {};

        // Populate the visits dictionary
        telemetryData.forEach(data => {
            const visitId = data.attributes["app.visit.id"];
            if (visitId) {
                // Convert start and end times from [seconds, nanoseconds] to milliseconds
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);

                if (!visits[visitId]) {
                    visits[visitId] = { minTime: startTime, maxTime: endTime };
                } else {
                    visits[visitId].minTime = Math.min(visits[visitId].minTime, startTime);
                    visits[visitId].maxTime = Math.max(visits[visitId].maxTime, endTime);
                }
            }
        });

        // Compute total dwell time for all visits from the visits dictionary
        // and divide it by the total number of visits to obtain the DTA value
        const visitIds = Object.keys(visits);
        if (visitIds.length > 0) {
            let totalDwellTime = 0;
            visitIds.forEach(id => {
                totalDwellTime += visits[id].maxTime - visits[id].minTime;
            });
            this._value = totalDwellTime / visitIds.length;
        } else {
            this._value = 0;
        }
        return this._value;
    }

    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }
}

/**
 * Provides interpretation logic for the **Dwell Time Average (DTA)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `30000`ms (_i.e., 30 seconds_)
 * is used for the dynamic interpretation logic.
 */
export class DTAInterpreter extends MetricInterpreter {
    constructor(metric: DTAMetric, selectedGoals: Goal[]) {
      // Assume an initial maximum average dwell time of 30000 ms (30 seconds)
      super(metric, selectedGoals, 30000); // Initial hardcoded max value for DTA
    }
  
    /**
     * Assigns a weight to the **DTA** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     */
    assignWeight(): number {
      let weight = 0.3; // default weight
      if (this.selectedGoals.some(goal => goal.name === "Activity")) {
        const activity = this.selectedGoals.find(goal => goal.name === "Activity");
        if (activity)
            weight = (activity.weight || 1) / (activity.metrics.length || 1);
      }
      return weight;
    }
  }

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
            new CDAMetric(),
            new DTAMetric()
        );
    }
}