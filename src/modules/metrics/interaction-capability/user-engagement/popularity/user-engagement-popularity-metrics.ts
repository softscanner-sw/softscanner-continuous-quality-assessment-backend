import { Goal } from "../../../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../../core/telemetry/telemetry";

/**
 * Represents the **Number of Unique Users (NUU)** metric.
 * This metric counts **the number of distinct user sessions of an app** 
 * to measure `Interaction Capability -> User Engagement -> Popularity`.
 */
export class NUUMetric extends Metric {
    _value: number = 0;

    constructor(
        private _nbSessions: number = 1,
    ) {
        super(
            "Number of Unique Users",
            "Number of distinct users using an application",
            "users",
            "NUU",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
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
            throw new Error("NUU Metric: Number of sessions cannot be zero.");
        }

        this._nbSessions = nbSessions;
    }

    /**
     * Computes the value for the **Number of Unique Users (NUU)** metric.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the number of unique users (sessions).
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
     * Resets the session count parameter and the metric value to their default states.
     */
    resetValue(): void {
        super.resetValue();
        this._nbSessions = 1;
        this._value = 0;
    }

}
/**
 * Provides interpretation logic for the **Number of Unique Users (NUU)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.4` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `200` is used for the dynamic interpretation logic.
 */
export class NUUInterpreter extends MetricInterpreter {
    constructor(metric: NUUMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 200); // Initial hardcoded max value for NUU
    }

    /**
     * Assigns a weight to the **NUU** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.4.
     */
    assignWeight(): number {
        let weight = 0.4; // default weight
        // If selected goals includes "Popularity"
        if (this.selectedGoals.some(goal => goal.name === "Popularity")) {
            const popularity = this.selectedGoals.find(goal => goal.name === "Popularity");
            if (popularity)
                weight = (popularity.weight || 1) / (popularity.metrics.length || 1);
        }

        return weight;
    }
}

/**
 * Represents the **Number of Visits (NoV)** metric.
 * This metric counts **the number of user visits to the app**
 * to measure `Interaction Capability -> User Engagement -> Popularity`.
 */
export class NoVMetric extends Metric {
    _value: number = 0;
    constructor() {
        super(
            "Number of Visits",
            "Total number of visits to the application",
            "visits",
            "NoV",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Counts the number of visits by counting unique visit ids.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing number of unique app visits
     */
    computeValue(telemetryData: any[]): number {
        const visits = new Set<string>();
        telemetryData
            .map(data => data.attributes["app.visit.id"])
            .forEach(visitId => { if (visitId) visits.add(visitId); });
        this._value = visits.size;
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
 * Provides interpretation logic for the **Number of Visits (NoV)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.4` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `500` is used for the dynamic interpretation logic.
 */
export class NoVInterpreter extends MetricInterpreter {
    constructor(metric: NoVMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 500); // Initial hardcoded max value for NoV
    }

    /**
     * Assigns a weight to the **NoV** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.4.
     */
    assignWeight(): number {
        let weight = 0.4; // default weight
        // If selected goals includes "Popularity"
        if (this.selectedGoals.some(goal => goal.name === "Popularity")) {
            const popularity = this.selectedGoals.find(goal => goal.name === "Popularity");
            if (popularity)
                weight = (popularity.weight || 1) / (popularity.metrics.length || 1);
        }

        return weight;
    }
}

/**
 * Represents the **Number of Clicks for Page Views (NCPV)** metric.
 * This metric calculates **the number of navigation clicks (_i.e., page view events_)
 * between different pages of the app** 
 * to measure `Interaction Capability -> User Engagement -> Popularity`.
 */
export class NCPVMetric extends Metric {
    _value: number = 0;

    constructor() {
        super(
            "Number of Clicks for Page Views",
            "Total number of navigation clicks (page views) in the application",
            "clicks",
            "NCPV",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the NCPV metric.
     * An event is considered a navigation click if:
     *   - Its attribute "event_type" equals "click"
     *   - Its trace name includes the substring "navigation:" (case-insensitive)
     *
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the number of navigation clicks.
     */
    computeValue(telemetryData: any[]): number {
        let clickCount = 0;
        telemetryData.forEach(data => {
            const eventType = data.attributes["event_type"];
            const traceName = data.name;
            if (
                eventType === "click" &&
                typeof traceName === "string" &&
                traceName.toLowerCase().includes("navigation:")
            ) {
                clickCount++;
            }
        });
        this._value = clickCount;
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
 * Provides interpretation logic for the **Number of Clicks for Page Views (NCPV)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.4` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `1000` is used for the dynamic interpretation logic.
 */
export class NCPVInterpreter extends MetricInterpreter {
    constructor(metric: NCPVMetric, selectedGoals: Goal[]) {
        super(metric, selectedGoals, 1000); // Initial hardcoded max value for NCPV
    }

    /**
     * Assigns a weight to the **NCPV** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.4.
     */
    assignWeight(): number {
        let weight = 0.4; // default weight
        // If selected goals includes "Popularity"
        if (this.selectedGoals.some(goal => goal.name === "Popularity")) {
            const popularity = this.selectedGoals.find(goal => goal.name === "Popularity");
            if (popularity)
                weight = (popularity.weight || 1) / (popularity.metrics.length || 1);
        }

        return weight;
    }
}

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Popularity`
 * goal to its corresponding metrics:
 * 1. **Number of Unique Users (NUU)**;
 * 2. **Number of Visits (NoV)**;
 * 3. **Number of Clicks for Page Views (NCPV)**.
 */
export class PopularityMapper implements GoalMapper {

    /**
     * Maps the `Interaction Capability -> User Engagement -> Popularity` goal to its metrics (NUU, NoV, and NCPV).
     * @param goal The goal to map.
     * @throws An error if the goal is not "Popularity".
     */
    map(goal: Goal) {
        if (goal.name !== "Popularity")
            throw new Error(`Popularity Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Popularity"
        goal.weight = 0.4;
        goal.metrics.push(
            new NUUMetric(),
            new NoVMetric(),
            new NCPVMetric()
        );
    }
}