import { Goal } from "../../../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../../core/telemetry/telemetry";
import { Utils } from "../../../../../core/util/util-core";
import { OpenTelemetryWebTracingInstrumentationAdapter } from "../../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";

/**
 * Represents the **Active Days (AD)** metric.
 * This metric calculates **the number of days users visited the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 */
export class ADMetric extends Metric {
    _value: number = 0;

    constructor() {
        super(
            "Active Days",
            "Number of distinct days users visited the application",
            "days",
            "AD",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Active Days (AD)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the number of days users visited the app
     */
    computeValue(telemetryData: any[]): number {
        const daySet: Set<string> = new Set();
        telemetryData.forEach(data => {
            const startMs = Utils.toMs(data.startTime);
            // Convert the timestamp to a date string (YYYY-MM-DD)
            const dateStr = new Date(startMs).toISOString().split('T')[0];
            daySet.add(dateStr);
        });
        this._value = daySet.size;
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
 * Provides interpretation logic for the **Active Days (AD)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * A default initial hardcoded maximum of `30 days` is used
 * as an initial **normalization benchmark** for AD's interpretation.
 */
export class ADInterpreter extends MetricInterpreter {
    constructor(metric: ADMetric, selectedGoals: Goal[]) {
        // Assume a maximum of 30 days
        // as an initial benchmark for AD's interpretation
        super(metric, selectedGoals, 30);
    }

    /**
     * Assigns a weight to the **Active Days (AD)** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     * @see {@link ADMetric}
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        // If selected goals includes "Loyalty"
        if (this.selectedGoals.some(goal => goal.name === "Loyalty")) {
            const loyalty = this.selectedGoals.find(goal => goal.name === "Loyalty");
            if (loyalty)
                weight = (loyalty.weight || 1) / (loyalty.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * Represents the **Return Rate (RR)** metric.
 * This metric calculates **the number of times a user visited the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 */
export class RRMetric extends Metric {
    _value: number = 0;

    constructor() {
        super(
            "Return Rate",
            "Average number of times a user revisited the application after their first visit",
            "returns/user",
            "RR",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Return Rate (RR)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the number of times a user visited the app
     */
    computeValue(telemetryData: any[]): number {
        // Group visits by user (using app.session.id and app.visit.id)
        const userVisits: { [sessionId: string]: Set<string> } = {};
        telemetryData.forEach(data => {
            const sessionId = data.attributes["app.session.id"];
            const visitId = data.attributes["app.visit.id"];
            if (sessionId && visitId) {
                if (!userVisits[sessionId]) {
                    userVisits[sessionId] = new Set();
                }
                userVisits[sessionId].add(visitId);
            }
        });

        // Compute total return count and user count from the userVisits dictionary
        // then divide the total return count by the user count to obtain the RR value
        let totalReturnCount = 0;
        let userCount = 0;
        Object.values(userVisits).forEach(visitsSet => {
            if (visitsSet.size > 0) {
                totalReturnCount += (visitsSet.size - 1); // subtract first visit
                userCount++;
            }
        });
        this._value = userCount > 0 ? totalReturnCount / userCount : 0;
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
 * Provides interpretation logic for the **Return Rate (RR)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * A default initial hardcoded maximum of `5 returns/user` is used
 * as an initial **normalization benchmark** for RR's interpretation.
 */
export class RRInterpreter extends MetricInterpreter {
    constructor(metric: RRMetric, selectedGoals: Goal[]) {
        // Assume a maximum of 5 returns/user
        // as an initial benchmark for RR's interpretation
        super(metric, selectedGoals, 5);
    }

    /**
     * Assigns a weight to the **Return Rate (RR)** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     * @see {@link RRMetric}
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        // If selected goals includes "Loyalty"
        if (this.selectedGoals.some(goal => goal.name === "Loyalty")) {
            const loyalty = this.selectedGoals.find(goal => goal.name === "Loyalty");
            if (loyalty)
                weight = (loyalty.weight || 1) / (loyalty.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * Represents the **Dwell Time Loyalty (DTL)** metric.
 * This metric calculates **the average time a user spent on the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 */
export class DTLMetric extends Metric {
    _value: number = 0;

    constructor() {
        super(
            "Dwell Time Loyalty",
            "Average time a user spent on the application across visits",
            "ms/user",
            "DTL",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Dwell Time Loyalty (DTL)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the average time a user spent on the app
     */
    computeValue(telemetryData: any[]): number {
        // Group telemetry by user (app.session.id) and then by visit (app.visit.id)
        const userDwell: { [sessionId: string]: { totalDwell: number; visitCount: number } } = {};

        telemetryData.forEach(data => {
            const sessionId = data.attributes["app.session.id"];
            const visitId = data.attributes["app.visit.id"];
            if (sessionId && visitId) {
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);
                const dwell = endTime - startTime;
                if (!userDwell[sessionId]) {
                    userDwell[sessionId] = { totalDwell: dwell, visitCount: 1 };
                } else {
                    userDwell[sessionId].totalDwell += dwell;
                    userDwell[sessionId].visitCount += 1;
                }
            }
        });

        // Compute total average dwell time and user count from the userDwell dictionary
        // then divide the total average dwell time by the user count to obtain the DTL value
        let totalAvgDwell = 0;
        let userCount = 0;
        Object.values(userDwell).forEach(({ totalDwell, visitCount }) => {
            totalAvgDwell += totalDwell / visitCount;
            userCount++;
        });
        this._value = userCount > 0 ? totalAvgDwell / userCount : 0;
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
 * Provides interpretation logic for the **Dwell Time Loyalty (DTL)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * A default initial hardcoded maximum of `60,000 ms (60 seconds) per user` is used
 * as an initial normalization benchmark for DTL's
 *  interpretation.
 */
export class DTLInterpreter extends MetricInterpreter {
    constructor(metric: DTLMetric, selectedGoals: Goal[]) {
        // Assume a maximum of 60,000 ms (60 seconds) per user
        // as an initial benchmark for DTL's interpretation
        super(metric, selectedGoals, 60000);
    }

    /**
     * Assigns a weight to the **Dwell Time Loyalty (DTL)** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     * @see {@link DTLMetric}
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        // If selected goals includes "Loyalty"
        if (this.selectedGoals.some(goal => goal.name === "Loyalty")) {
            const loyalty = this.selectedGoals.find(goal => goal.name === "Loyalty");
            if (loyalty)
                weight = (loyalty.weight || 1) / (loyalty.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Loyalty`
 * goal to its corresponding metrics:
 * 1. **Active Days (AD)**;
 * 2. **Return Rate (RR)**;
 * 3. **Dwell Time Loyalty (DTL)**.
 * 
 * @see classes {@link ADMetric}, {@link RRMetric}, and {@link DTLMetric}
 */
export class LoyaltyMapper implements GoalMapper {

    /**
     * Maps the `Interaction Capability -> User Engagement -> Loyalty` goal to its metrics (AD, RR, and DTL).
     * @param goal The goal to map.
     * @throws An error if the goal is not "Loyalty".
     * @see classes {@link ADMetric}, {@link RRMetric}, and {@link DTLMetric}
     */
    map(goal: Goal) {
        if (goal.name !== "Loyalty")
            throw new Error(`Loyalty Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Loyalty"
        goal.weight = 0.25;
        goal.metrics.push(
            new ADMetric(),
            new RRMetric(),
            new DTLMetric()
        );
    }
}