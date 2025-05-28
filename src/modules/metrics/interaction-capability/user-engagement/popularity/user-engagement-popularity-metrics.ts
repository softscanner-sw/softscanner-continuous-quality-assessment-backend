import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../../core/goals/goals";
import { MetricsComputer } from "../../../../../core/metrics/metrics-computation";
import { CompositeMetric, LeafMetric, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../../core/telemetry/telemetry";
import { OpenTelemetryWebTracingInstrumentationAdapter } from "../../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";

/**
 * Metric: **Number of Users (NoU)**
 *
 * Computes the number of distinct users of the target instrumented application.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached user IDs.
 *
 * **Unit**: `users`
 * **Acronym**: `NoU`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class NoUMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Number of Users",
            "Number of unique, distinct users using an application",
            "users",
            "NoU",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Number of Users (NoU)** metric.
     * 
     * It initializes a set of users that gets populated by extracting and filtering
     * unique `app.user.id` values from the telemetry data.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The number of unique, distinct users using the application
     */
    computeValue(telemetryData: any[]) {
        // Compute the number of users
        // from the unique values of the 'app.user.id' telemetry attribute
        const nbUsers = MetricsComputer.uniqueCount(telemetryData, 'app.user.id');
        if (nbUsers > 0)
            this._value = nbUsers;

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
     * @returns - An instance of `NoUInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoUInterpreter}.
     */
    getInterpter(goal: Goal): NoUInterpreter {
        return new NoUInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Number of Users (NoU)** metric.
 *
 * Normalizes the computed value using a benchmark (200 users, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoUMetric}
 */
export class NoUInterpreter extends MetricInterpreter {
    constructor(
        metric: NoUMetric,
        goal: Goal,
        // Assume a maximum of 200 users
        // as an initial benchmark for NoU's interpretation
        initialMaxValue: number = 200,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Number of Visits (NoV)**
 *
 * Computes the total number of user visits to the target instrumented application.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached visit IDs.
 *
 * **Unit**: `visits`
 * **Acronym**: `NoV`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class NoVMetric extends LeafMetric {
    _value: number = 0;
    constructor() {
        super(
            "Number of Visits",
            "Total number of user visits to the application",
            "visits",
            "NoV",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Number of Visits (NoV)** metric.
     * 
     * It initializes a set of visits that gets populated by extracting and filtering
     * unique `app.visit.id` values from the telemetry data.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The number of user visits
     */
    computeValue(telemetryData: any[]): number {
        // Compute the number of visits
        // from the unique values of the 'app.visit.id' telemetry attribute
        const nbVisits = MetricsComputer.uniqueCount(telemetryData, 'app.visit.id');
        if (nbVisits > 0)
            this._value = nbVisits;

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
     * @returns - An instance of `NoVInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoVInterpreter}.
     */
    getInterpter(goal: Goal): NoVInterpreter {
        return new NoVInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Number of Visits (NoV)** metric.
 *
 * Normalizes the computed value using a benchmark (500 visits, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoVMetric}
 */
export class NoVInterpreter extends MetricInterpreter {
    constructor(
        metric: NoVMetric,
        goal: Goal,
        // Assume a maximum of 500 visits
        // as an initial benchmark for NoV's interpretation
        initialMaxValue: number = 500,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Number of Sessions (NoS)**
 *
 * Computes the total number of user sessions to the target instrumented application.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached session IDs.
 *
 * **Unit**: `sessions`
 * **Acronym**: `NoS`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class NoSMetric extends LeafMetric {
    _value: number = 0;
    constructor() {
        super(
            "Number of Sessions",
            "Total number of user interaction sessions with the application",
            "sessions",
            "NoS",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Number of Sessions (NoS)** metric.
     * 
     * It initializes a set of sessions that gets populated by extracting and filtering
     * unique `app.session.id` values from the telemetry data.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The number of user sessions
     */
    computeValue(telemetryData: any[]): number {
        // Compute the number of sessions
        // from the unique values of the 'app.session.id' telemetry attribute
        const nbSessions = MetricsComputer.uniqueCount(telemetryData, 'app.session.id');
        if (nbSessions > 0)
            this._value = nbSessions;

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
     * @returns - An instance of `NoSInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSInterpreter}.
     */
    getInterpter(goal: Goal): NoSInterpreter {
        return new NoSInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Number of Sessions (NoS)** metric.
 *
 * Normalizes the computed value using a benchmark (1000 sessions, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSMetric}
 */
export class NoSInterpreter extends MetricInterpreter {
    constructor(
        metric: NoSMetric,
        goal: Goal,
        // Assume a maximum of 1000 sessions
        // as an initial benchmark for NoS' interpretation
        initialMaxValue: number = 1000,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Average Visits per User (NoVu)**
 *
 * Computes the average number of visits per user.
 * It groups telemetry data by user, counts unique visits per user, and averages these values.
 *
 * **Unit:** `visits/user`
 * **Acronym:** `NoVu`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class NoVuMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average Visits per User",
            "Average number of visits per user",
            "visits/user",
            "NoVu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
        // Use NoUMetric as a child to obtain the unique user count.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * 
     * It initializes the user-to-visitCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of visits for all users.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total number of visits and number of users to compute NoVu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-visitCount map
        const userVisits: { [userId: string]: Set<string> } = {};

        // Populate the map from the telemetry data
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

        // Compute the total number of visits for all users from the map
        let totalVisits = 0;
        Object.values(userVisits).forEach(visitSet => {
            totalVisits += visitSet.size;
        });

        // Compute the number of users from the NoU metric by passing it the telemetry data
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers) {
            // Use the total number of visits and the NoU to compute the value of NoVu
            this._value = totalVisits / nbUsers;
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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoVuInterpreter}.
     */
    getInterpter(goal: Goal): NoVuInterpreter {
        return new NoVuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Average Visits per User (NoVu)** metric.
 *
 * Normalizes the computed value using a benchmark (10 visits/user, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoVuMetric}
 */
export class NoVuInterpreter extends MetricInterpreter {
    constructor(
        metric: NoVuMetric,
        goal: Goal,
        // Assume a maximum of 10 visits/user
        // as an initial benchmark for NoVu's interpretation
        initialMaxValue: number = 10,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Average Sessions per User (NoSu)**
 *
 * Computes the average number of sessions per user.
 * It groups telemetry data by user, counts unique sessions per user, and averages these values.
 *
 * **Unit:** `sessions/user`
 * **Acronym:** `NoSu`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class NoSuMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average Sessions per User",
            "Average number of sessions per user",
            "sessions/user",
            "NoSu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
        // Use NoUMetric as a child to obtain the unique user count.
        this.children = {
            "NoU": new NoUMetric()
        };
    }

    /**
     * Computes the value for **Average Sessions per User (NoSu)**.
     * 
     * It initializes the user-to-sessionCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of sessions for all users.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total number of sessions and number of users to compute NoSu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of sessions per user.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-sessionCount map
        const userSessions: { [userId: string]: Set<string> } = {};

        // Populate the map from the telemetry data
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            const sessionId = data.attributes["app.session.id"];
            if (userId && sessionId) {
                if (!userSessions[userId]) {
                    userSessions[userId] = new Set();
                }
                userSessions[userId].add(sessionId);
            }
        });

        // Compute the total number of sessions for all users from the map
        let totalSessions = 0;
        Object.values(userSessions).forEach(sessionSet => {
            totalSessions += sessionSet.size;
        });

        // Compute the number of users from the NoU metric by passing it the telemetry data
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers) {
            // Use the total number of sessions and the NoU to compute the value of NoSu
            this._value = totalSessions / nbUsers;
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
     * @returns - An instance of `NoSuInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSuInterpreter}.
     */
    getInterpter(goal: Goal): NoSuInterpreter {
        return new NoSuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Average Sessions per User (NoSu)** metric.
 *
 * Normalizes the computed value using a benchmark (20 sessions/user, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSuMetric}
 */
export class NoSuInterpreter extends MetricInterpreter {
    constructor(
        metric: NoSuMetric,
        goal: Goal,
        // Assume a maximum of 20 sessions/user
        // as an initial benchmark for NoSu's interpretation
        initialMaxValue: number = 20,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Average Sessions per Visit (NoSv)**
 *
 * Computes the average number of sessions per visit.
 * It groups telemetry data by visit, counts unique sessions per visit, and averages these values.
 *
 * **Unit:** `sessions/visit`
 * **Acronym:** `NoSv`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoVMetric}
 */
export class NoSvMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average Sessions per Visit",
            "Average number of sessions per visit",
            "sessions/visit",
            "NoSv",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
        // Use NoVMetric as a child to obtain the unique visit count.
        this.children = {
            "NoV": new NoVMetric()
        };
    }

    /**
     * Computes the value for **Average Sessions per Visit (NoSv)**.
     * 
     * It initializes the visit-to-sessionCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of sessions for all visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of sessions and number of visits to compute NoSv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of sessions per visit.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the visit-to-sessionCount map
        const visitSessions: { [userId: string]: Set<string> } = {};

        // Populate the map from the telemetry data
        telemetryData.forEach(data => {
            const visitId = data.attributes["app.visit.id"];
            const sessionId = data.attributes["app.session.id"];
            if (visitId && sessionId) {
                if (!visitSessions[visitId]) {
                    visitSessions[visitId] = new Set();
                }
                visitSessions[visitId].add(sessionId);
            }
        });

        // Compute the total number of sessions for all visits from the map
        let totalSessions = 0;
        Object.values(visitSessions).forEach(sessionSet => {
            totalSessions += sessionSet.size;
        });

        // Compute the number of visits from the NoV metric by passing it the telemetry data
        const nbVisits = this.children["NoV"].computeValue(telemetryData);

        if (nbVisits) {
            // Use the total number of sessions and the NoV to compute the value of NoSv
            this._value = totalSessions / nbVisits;
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
     * @returns - An instance of `NoSvInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSvInterpreter}.
     */
    getInterpter(goal: Goal): NoSvInterpreter {
        return new NoSvInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Average Sessions per Visit (NoSv)** metric.
 *
 * Normalizes the computed value using a benchmark (10 sessions/visit, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSvMetric}
 */
export class NoSvInterpreter extends MetricInterpreter {
    constructor(
        metric: NoSvMetric,
        goal: Goal,
        // Assume a maximum of 10 sessions/visit
        // as an initial benchmark for NoSv's interpretation
        initialMaxValue: number = 10,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}





/**
 * This class is responsible for mapping `Interaction Capability -> User Engagement -> Popularity`
 * goal to its corresponding metrics:
 * 
 * 1. **Number of Users (NoU)**;
 * 2. **Number of Visits (NoV)**;
 * 3. **Number of Sessions (NoS)**;
 * 4. **Average Visits per User (NoVu)**;
 * 5. **Average Sessions per User (NoSu)**;
 * 6. **Average Sessions per Visit (NoSv)**.
 * 
 * @see classes {@link NoUMetric}, {@link NoVMetric}, {@link NoSMetric},
 * {@link NoVuMetric}, {@link NoSuMetric}, and {@link NoSvMetric}
 */
export class PopularityMapper implements GoalMapper {
    metrics: Metric[] = [];
    
    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('frontend')) {
            this.metrics.push(
                new NoUMetric(), // NoU
                new NoVMetric(), // NoV
                new NoSMetric(), // NoS
                new NoVuMetric(), // NoVu
                new NoSuMetric(), // NoSu
                new NoSvMetric(), // NoSv
            );
        }
    }

    /**
     * Maps the `Interaction Capability -> User Engagement -> Popularity` goal to its metrics:
     * 
     * 1. **Number of Users (NoU)**;
     * 2. **Number of Visits (NoV)**;
     * 3. **Number of Sessions (NoS)**;
     * 4. **Average Visits per User (NoVu)**;
     * 5. **Average Sessions per User (NoSu)**;
     * 6. **Average Sessions per Visit (NoSv)**.
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Popularity".
     * @see classes {@link NoUMetric}, {@link NoVMetric}, {@link NoSMetric},
     * {@link NoVuMetric}, {@link NoSuMetric}, and {@link NoSvMetric}
     */
    map(goal: Goal) {
        if (goal.name !== "Popularity")
            throw new Error(`Popularity Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Popularity"
        goal.weight = 0.4; // @TODO remove this later when the weight assignment is finalized on the frontend

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}