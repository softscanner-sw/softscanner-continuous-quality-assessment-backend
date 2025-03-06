import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../../core/goals/goals";
import { CompositeMetric, LeafMetric, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../../core/telemetry/telemetry";
import { Utils } from "../../../../../core/util/util-core";
import { OpenTelemetryWebTracingInstrumentationAdapter } from "../../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";
import { NoUMetric } from "../popularity/user-engagement-popularity-metrics";

/**
 * Metric: **Active Days (AD)**
 *
 * Computes the number of days users visited the target instrumented application.
 * Its value is computed from user interaction traces
 * by extracting the days of all traces into a set and returning the size of that set.
 *
 * **Unit**: `days`
 * **Acronym**: `AD`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class ADMetric extends LeafMetric {
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
     * 
     * It initializes the set of days then populates it by extracting the start timestamp
     * of each trace and extracting the day field from the timestamp.
     * Finally, it uses the size of the days set to compute AD.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The number of active days where users visited the app.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the set of days
        const daySet: Set<string> = new Set();

        // Populate the set of days
        telemetryData.forEach(data => {
            const startMs = Utils.toMs(data.startTime);
            // Convert the timestamp to a date string (YYYY-MM-DD)
            const dateStr = new Date(startMs).toISOString().split('T')[0];
            daySet.add(dateStr);
        });

        // Use the size of the days set to compute the value of AD
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

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `ADInterpreter` to interpret this metric for the provided goal.
     * @see {@link ADInterpreter}.
     */
    getInterpter(goal: Goal): ADInterpreter {
        return new ADInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Active Days (AD)** metric.
 *
 * Normalizes the computed value using a benchmark (30 days, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link ADMetric}
 */
export class ADInterpreter extends MetricInterpreter {
    constructor(
        metric: ADMetric,
        goal: Goal,
        // Assume a maximum of 30 days
        // as an initial benchmark for AD's interpretation
        initialMaxValue: number = 30,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Active Days per User (ADu)**
 *
 * Computes the average number of active days per user.
 * For each user, it extracts the distinct days (YYYY-MM-DD) on which that user had activity,
 * and then it averages these counts over all users.
 *
 * **Unit**: `days/user`
 * **Acronym**: `ADu`
 * **Required Telemetry**: `TRACING`
 *
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class ADuMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Active Days per User",
            "Average number of active days per user on the application",
            "days/user",
            "ADu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        // Use the NoUMetric as a child to get the count of unique users.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Active Days per User (ADu)**.
     *
     * It groups telemetry data by `app.user.id`, collects the unique days (derived
     * from the trace start times) for each user, and then averages the number of active
     * days over all users.
     * The total number of users is obtained using the `NoU` child metric.
     *
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average active days per user.
     */
    computeValue(telemetryData: any[]): number {
        // initialize the user-to-days map
        const userDays: { [userId: string]: Set<string> } = {};

        // Populate the user days map based on the telemetry data
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            if (userId) {
                if (!userDays[userId]) {
                    userDays[userId] = new Set<string>();
                }
                const startMs = Utils.toMs(data.startTime);
                const day = new Date(startMs).toISOString().split('T')[0];
                userDays[userId].add(day);
            }
        });

        // Compute the total number of active days for all users
        let sumDays = 0;
        Object.keys(userDays).forEach(userId => {
            sumDays += userDays[userId].size;
        });

        // Get the number of unique users from the NoUMetric child.
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers > 0) {
            // Use the total sum of days
            // and the number of unique users to compute the value of ADu
            this._value = sumDays / nbUsers;
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

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `ADuInterpreter` to interpret this metric for the provided goal.
     * @see {@link ADuInterpreter}.
     */
    getInterpter(goal: Goal): ADuInterpreter {
        return new ADuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Active Days per User (ADu)** metric.
 *
 * Normalizes the computed value using a benchmark (30 days, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 *
 * @see {@link ADuMetric}
 */
export class ADuInterpreter extends MetricInterpreter {
    constructor(
        metric: ADuMetric,
        goal: Goal,
        // Assume a maximum of 30 days/user
        // as an initial benchmark for ADu's interpretation
        initialMaxValue: number = 30,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Return Rate (RR)**
 *
 * Computes the rate of users that revisited the target instrumented application after their first visit.
 * Its value is computed from user interaction traces
 * by dividing the total number of returns of all users by the number of unique users.
 *
 * **Unit**: `returns/user`
 * **Acronym**: `RR`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class RRMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Return Rate",
            "Average number of times a user revisited the application after their first visit",
            "returns/user",
            "RR",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        // Use the NoUMetric as a child to get the count of unique users.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Return Rate (RR)**.
     * 
     * It initializes the user-to-visits map
     * Then, it populates that map by examining the telemetry data
     * for users and their visits.
     * Then, it uses the map to compute the total number of returns
     * for all users.
     * Then, it uses `NoU` to compute the total number of unique users.
     * Finally, it uses the total number of returns and the number
     * of unique users to compute RR.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The return rate of users that revisited the app after their first visits.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-visits map
        const userVisits: { [userId: string]: Set<string> } = {};

        // Populates the user visits map
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            const visitId = data.attributes["app.visit.id"];
            if (userId && visitId) {
                if (!userVisits[userId]) {
                    userVisits[userId] = new Set();
                }
                userVisits[userId].add(visitId);
            }
        });

        // Compute total return count from the user visits map
        let totalReturns = 0;
        Object.values(userVisits).forEach(visitsSet => {
            if (visitsSet.size > 0) {
                totalReturns += (visitsSet.size - 1); // subtract first visit
            }
        });

        // Get the number of unique users from the NoUMetric child.
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers > 0) {
            // Use the total return count
            // and the number of unique users to compute the value of RR
            this._value = totalReturns / nbUsers;
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

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `RRInterpreter` to interpret this metric for the provided goal.
     * @see {@link RRInterpreter}.
     */
    getInterpter(goal: Goal): RRInterpreter {
        return new RRInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Return Rate (RR)** metric.
 *
 * Normalizes the computed value using a benchmark (5 returns/user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link RRMetric}
 */
export class RRInterpreter extends MetricInterpreter {
    constructor(
        metric: RRMetric,
        goal: Goal,
        // Assume a maximum of 5 returns/user
        // as an initial benchmark for RR's interpretation
        initialMaxValue: number = 5,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Dwell Time Retention per Visit (DTRv)**
 *
 * Computes the average cumulative dwell time per user based on visits.
 * It aggregates the dwell time for each visit (using the `app.visit.id` attribute) for each user,
 * computes each user’s average dwell time per visit, and then averages these values across all unique users.
 *
 * **Unit:** `ms/user`
 * **Acronym:** `DTRv`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class DTRvMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Dwell Time Retention per Visit",
            "Average cumulative dwell time per user aggregated over visits",
            "ms/user",
            "DTRv",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
        // Use the NoUMetric as a child to get the count of unique users.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Dwell Time Retention per Visit (DTRv)**.
     * 
     * It initializes the user-to-{visit-dwells} map
     * Then, it populates that map by examining the telemetry data
     * for users and their visits.
     * Then, it uses the map to compute the total average dwell time
     * for all users across all their visits.
     * Then, it uses the `NoU` metric to compute the number of unique users
     * Finally, it uses the total average dwell time per visit and number of unique
     * users to compute DTRv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average cumulative dwell time per user aggregated over visits.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-{visit, totalDwellTime} map
        const userVisitDwell: { [userId: string]: { [visitId: string]: number } } = {};

        // Populate the user visits dwell map
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            const visitId = data.attributes["app.visit.id"];
            if (userId && visitId) {
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);
                const dwell = endTime - startTime;
                if (!userVisitDwell[userId]) {
                    userVisitDwell[userId] = {};
                }
                // If multiple traces exist for the same visit, sum their dwell times.
                userVisitDwell[userId][visitId] = (userVisitDwell[userId][visitId] || 0) + dwell;
            }
        });

        // Compute each user's average dwell time per visit.
        let totalUserAvg = 0;
        Object.values(userVisitDwell).forEach(visitMap => {
            const visits = Object.values(visitMap);
            if (visits.length > 0) {
                const userAvg = visits.reduce((sum, v) => sum + v, 0) / visits.length;
                totalUserAvg += userAvg;
            }
        });

        // Get the number of unique users from the NoUMetric child.
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers > 0) {
            // Use the total user average dwell time
            // and the number of unique users to compute the value of DTRv
            this._value = totalUserAvg / nbUsers;
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

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `DTRvInterpreter` to interpret this metric for the provided goal.
     * @see {@link DTRvInterpreter}.
     */
    getInterpter(goal: Goal): DTRvInterpreter {
        return new DTRvInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Dwell Time Retention per Visit (DTRv)** metric.
 *
 * Normalizes the computed value using a benchmark (e.g., 30,000ms (30 seconds) per user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 *
 * @see {@link DTRvMetric}
 */
export class DTRvInterpreter extends MetricInterpreter {
    constructor(
        metric: DTRvMetric,
        goal: Goal,
        // Assume a maximum of 30,000 ms (30 seconds) per user
        // as an initial benchmark for DTRv's interpretation
        initialMaxValue: number = 30000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Dwell Time Retention per Session (DTRs)**
 *
 * Computes the average cumulative dwell time per user based on sessions.
 * It aggregates the dwell time for each session (using the `app.session.id` attribute) for each user,
 * computes each user’s average dwell time per session, and then averages these values across all unique users.
 *
 * **Unit:** `ms/user`
 * **Acronym:** `DTRs`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class DTRsMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Dwell Time Retention per Session",
            "Average cumulative dwell time per user aggregated over sessions",
            "ms/user",
            "DTRs",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
        // Use the NoUMetric as a child to get the count of unique users.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Dwell Time Retention per Session (DTRs)**.
     * 
     * It initializes the user-to-{session-dwells} map
     * Then, it populates that map by examining the telemetry data
     * for users and their sessions.
     * Then, it uses the map to compute the total average dwell time
     * for all users across all their sessions.
     * Then, it uses the `NoU` metric to compute the number of unique users
     * Finally, it uses the total average dwell time per session and number of unique
     * users to compute DTRs.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average cumulative dwell time per user aggregated over sessions.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-{session, totalDwellTime} map
        const userSessionDwell: { [userId: string]: { [sessionId: string]: number } } = {};

        // Populate the user sessions dwell map
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            const sessionId = data.attributes["app.session.id"];
            if (userId && sessionId) {
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);
                const dwell = endTime - startTime;
                if (!userSessionDwell[userId]) {
                    userSessionDwell[userId] = {};
                }
                // Sum dwell times for the same session if needed.
                userSessionDwell[userId][sessionId] = (userSessionDwell[userId][sessionId] || 0) + dwell;
            }
        });

        // Compute each user's average dwell time per session.
        let totalUserAvg = 0;
        Object.values(userSessionDwell).forEach(sessionMap => {
            const sessions = Object.values(sessionMap);
            if (sessions.length > 0) {
                const userAvg = sessions.reduce((sum, d) => sum + d, 0) / sessions.length;
                totalUserAvg += userAvg;
            }
        });

        // Get the number of unique users from the NoUMetric child.
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers > 0) {
            // Use the total user average dwell time
            // and the number of unique users to compute the value of DTRs
            this._value = totalUserAvg / nbUsers;
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

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `DTRsInterpreter` to interpret this metric for the provided goal.
     * @see {@link DTRsInterpreter}.
     */
    getInterpter(goal: Goal): DTRsInterpreter {
        return new DTRsInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Dwell Time Retention per Session (DTRs)** metric.
 *
 * Normalizes the computed value using a benchmark (e.g., 30,000ms (30 seconds) per user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 *
 * @see {@link DTRsMetric}
 */
export class DTRsInterpreter extends MetricInterpreter {
    constructor(
        metric: DTRsMetric,
        goal: Goal,
        // Assume a maximum of 30,000 ms (30 seconds) per user
        // as an initial benchmark for DTL's interpretation
        initialMaxValue: number = 30000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Loyalty`
 * goal to its corresponding metrics:
 * 
 * 1. **Active Days (AD)**;
 * 2. **Active Days per User (ADu)**
 * 3. **Return Rate (RR)**;
 * 4. **Dwell Time Retention per Visit (DTRv)**;
 * 5. **Dwell Time Retention per Session (DTRs)**.
 * 
 * @see classes {@link ADMetric}, {@link ADuMetric}, {@link RRMetric}, {@link DTRvMetric},
 * and {@link DTRsMetric}.
 */
export class LoyaltyMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('frontend')) {
            this.metrics.push(
                new ADMetric(), // AD
                new ADuMetric(), // ADu
                new RRMetric(), // RR
                new DTRvMetric(), // DTRv
                new DTRsMetric() // DTRs
            );
        }
    }

    /**
     * Maps the `Interaction Capability -> User Engagement -> Loyalty` goal to its metrics:
     * 
     * 1. **Active Days (AD)**;
     * 2. **Active Days per User (ADu)**
     * 3. **Return Rate (RR)**;
     * 4. **Dwell Time Retention per Visit (DTRv)**;
     * 5. **Dwell Time Retention per Session (DTRs)**.
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Loyalty".
     * @see classes {@link ADMetric}, {@link ADuMetric}, {@link RRMetric}, {@link DTRvMetric},
     * and {@link DTRsMetric}.
     */
    map(goal: Goal) {
        if (goal.name !== "Loyalty")
            throw new Error(`Loyalty Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Loyalty"
        goal.weight = 0.25;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}