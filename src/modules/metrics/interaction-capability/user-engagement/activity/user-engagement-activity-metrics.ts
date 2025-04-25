import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../../core/goals/goals";
import { CompositeMetric, Metric } from "../../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../../core/metrics/metrics-interpreters";
import { TelemetryType, UserInteractionEvent } from "../../../../../core/telemetry/telemetry";
import { Utils } from "../../../../../core/util/util-core";
import { OpenTelemetryWebTracingInstrumentationAdapter } from "../../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";
import { NoSMetric, NoUMetric, NoVMetric } from "../popularity/user-engagement-popularity-metrics";

/**
 * Metric: **User Interaction Frequency per User (UIFu)**
 *
 * Computes the average number of user interactions with the target instrumented application per user.
 * Its value is computed from user interaction traces
 * by dividing the total number of user interactions by the number of unique users.
 *
 * **Unit**: `interactions/user`
 * **Acronym**: `UIFu`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class UIFuMetric extends CompositeMetric {
    _value: number = 0;

    constructor(
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        super(
            "User Interaction Frequency per User",
            "How frequently users interact with the software during a typical user",
            "interactions/user",
            "UIFu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoU": new NoUMetric() // NoU
        }
    }

    /**
     * Computes the value for **User Interaction Frequency per User (UIFu)**.
     * 
     * It retireves the array of events considered for user interaction.
     * It then uses this array to compute the total number of interactions from the telemetry data.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total number of interactions and number of users to compute UIFu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The rate of user interactions per user.
     */
    computeValue(telemetryData: any[]): number {
        // Retrieve the array of events considered for user interaction
        const selectedEventsStr = this._selectedEvents.map(event => {
            return Utils.convertEnumValueToLowercaseWithNoSeparator(UserInteractionEvent[event])
        });

        // Compute total number of interactions based on the selected user interaction events
        let totalInteractions = 0;
        telemetryData
            .map(data => data.attributes["event_type"])
            .forEach(name => {
                if (selectedEventsStr.includes(name))
                    totalInteractions++;
            });

        // Compute the number of users from the NoU metric by passing it the telemetry data
        const nbUsers = this.children['NoU'].computeValue(telemetryData);

        // Use the total number of interactions and the NoU to compute the value of UIFu
        if (nbUsers > 0)
            this._value = totalInteractions / nbUsers;

        return this._value;
    }

    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `UIFuInterpreter` to interpret this metric for the provided goal.
     * @see {@link UIFuInterpreter}.
     */
    getInterpter(goal: Goal): UIFuInterpreter {
        return new UIFuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **User Interaction Frequency per User (UIFu)** metric.
 *
 * Normalizes the computed value using a benchmark (500 interactions/user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link UIFuMetric}
 */
export class UIFuInterpreter extends MetricInterpreter {
    constructor(
        metric: UIFuMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/user
        // as an initial benchmark for UIFu's interpretation
        initialMaxValue: number = 500,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **User Interaction Frequency per Visit (UIFv)**
 *
 * Computes how frequently users interact with the target instrumented application per visit.
 * Its value is computed from user interaction traces
 * by dividing the total number of user interactions by the number of unique visits.
 *
 * **Unit**: `interactions/visit`
 * **Acronym**: `UIFv`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoVMetric}
 */
export class UIFvMetric extends CompositeMetric {
    _value: number = 0;

    constructor(
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        super(
            "User Interaction Frequency per Visit",
            "How frequently users interact with the software during a typical visit",
            "interactions/visit",
            "UIFv",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoV": new NoVMetric() // NoV
        }
    }

    /**
     * Computes the value for **User Interaction Frequency per Visit (UIFv)**.
     * 
     * It retireves the array of events considered for user interaction.
     * It then uses this array to compute the total number of interactions from the telemetry data.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of interactions and number of visits to compute UIFv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The rate of user interactions per visit.
     */
    computeValue(telemetryData: any[]): number {
        // Retrieve the array of events considered for user interaction
        const selectedEventsStr = this._selectedEvents.map(event => {
            return Utils.convertEnumValueToLowercaseWithNoSeparator(UserInteractionEvent[event])
        });

        // Compute total number of interactions based on the selected user interaction events
        let totalInteractions = 0;
        telemetryData
            .map(data => data.attributes["event_type"])
            .forEach(name => {
                if (selectedEventsStr.includes(name))
                    totalInteractions++;
            });

        // Compute the number of visits from the NoV metric by passing it the telemetry data
        const nbVisits = this.children['NoV'].computeValue(telemetryData);

        // Use the total number of interactions and the NoV to compute the value of UIFv
        if (nbVisits > 0)
            this._value = totalInteractions / nbVisits;

        return this._value;
    }

    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `UIFvInterpreter` to interpret this metric for the provided goal.
     * @see {@link UIFvInterpreter}.
     */
    getInterpter(goal: Goal): UIFvInterpreter {
        return new UIFvInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **User Interaction Frequency per Visit (UIFv)** metric.
 *
 * Normalizes the computed value using a benchmark (1000 interactions/visit, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link UIFvMetric}
 */
export class UIFvInterpreter extends MetricInterpreter {
    constructor(
        metric: UIFvMetric,
        goal: Goal,
        // Assume a maximum of 1000 interactions/visit
        // as an initial benchmark for UIFv's interpretation
        initialMaxValue: number = 1000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **User Interaction Frequency per Session (UIFs)**
 *
 * Computes how frequently users interact with the target instrumented application per session.
 * Its value is computed from user interaction traces
 * by dividing the total number of user interactions by the number of unique sessions.
 *
 * **Unit**: `interactions/session`
 * **Acronym**: `UIFs`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoSMetric}
 */
export class UIFsMetric extends CompositeMetric {
    _value: number = 0;

    constructor(
        private _selectedEvents: UserInteractionEvent[] = UserInteractionEvent.getAllEvents(),
    ) {
        super(
            "User Interaction Frequency per Session",
            "How frequently users interact with the software during a typical session",
            "interactions/session",
            "UIFs",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoS": new NoSMetric() // NoS
        }
    }

    /**
     * Computes the value for **User Interaction Frequency per Session (UIFs)**.
     * 
     * It retireves the array of events considered for user interaction.
     * It then uses this array to compute the total number of interactions from the telemetry data.
     * Afterwards, it computes the number of sessions using the `NoS` metric.
     * Finally, it uses the total number of interactions and number of sessions to compute UIFs.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The rate of user interactions per session.
     */
    computeValue(telemetryData: any[]): number {
        // Retrieve the array of events considered for user interaction
        const selectedEventsStr = this._selectedEvents.map(event => {
            return Utils.convertEnumValueToLowercaseWithNoSeparator(UserInteractionEvent[event])
        });

        // Compute total number of interactions based on the selected user interaction events
        let totalInteractions = 0;
        telemetryData
            .map(data => data.attributes["event_type"])
            .forEach(name => {
                if (selectedEventsStr.includes(name))
                    totalInteractions++;
            });

        // Compute the number of sessions from the NoS metric by passing it the telemetry data
        const nbSessions = this.children['NoS'].computeValue(telemetryData);

        // Use the total number of interactions and the NoS to compute the value of UIFs
        if (nbSessions > 0)
            this._value = totalInteractions / nbSessions;

        return this._value;
    }

    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `UIFsInterpreter` to interpret this metric for the provided goal.
     * @see {@link UIFsInterpreter}.
     */
    getInterpter(goal: Goal): UIFsInterpreter {
        return new UIFsInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **User Interaction Frequency per Session (UIFs)** metric.
 *
 * Normalizes the computed value using a benchmark (500 interactions/session, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link UIFsMetric}
 */
export class UIFsInterpreter extends MetricInterpreter {
    constructor(
        metric: UIFsMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/session
        // as an initial benchmark for UIFs's interpretation
        initialMaxValue: number = 500,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Dwell Time per User (DTu)**
 *
 * Computes the average dwell time per user.
 * Its value is computed from user interaction traces
 * by dividing the total dwell time for all users by the number of unique users.
 *
 * **Unit**: `ms/user`
 * **Acronym**: `DTu`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class DTuMetric extends CompositeMetric {
    _value = 0;

    constructor() {
        super(
            "Dwell Time per User",
            "Average time per user (dwell time)",
            "ms/user",
            "DTu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoU": new NoUMetric() // NoU
        }
    }

    /**
     * Computes the value for **Dwell Time per User (DTu)**.
     * 
     * It initializes the user-to-{min-start-Time, max-end-Time} map
     * It then populates this map from the telemetry data.
     * It then uses this map to compute the total dwell time from all users.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total dwell time and number of users to compute DTu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average dwell time per user.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-{min-start-Time, max-end-Time} map
        const users: { [userId: string]: { minTime: number; maxTime: number } } = {};

        // Populate the users map
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            if (userId) {
                // Convert start and end times from [seconds, nanoseconds] to milliseconds
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);

                if (!users[userId]) {
                    users[userId] = { minTime: startTime, maxTime: endTime };
                } else {
                    users[userId].minTime = Math.min(users[userId].minTime, startTime);
                    users[userId].maxTime = Math.max(users[userId].maxTime, endTime);
                }
            }
        });

        // Compute the number of users from the NoU metric by passing it the telemetry data
        const nbUsers = this.children['NoU'].computeValue(telemetryData);

        if (nbUsers > 0) {
            let totalDwellTime = 0;
            Object.keys(users).forEach(id => {
                // Compute total dwell time for all users from the users map
                totalDwellTime += users[id].maxTime - users[id].minTime;
            });
            // Use the total dwell time fo all users and the number of users to compute DTu
            this._value = totalDwellTime / nbUsers;
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
     * @returns - An instance of `DTuInterpreter` to interpret this metric for the provided goal.
     * @see {@link DTuInterpreter}.
     */
    getInterpter(goal: Goal): DTuInterpreter {
        return new DTuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Dwell Time per User (DTu)** metric.
 *
 * Normalizes the computed value using a benchmark (30,000ms (30 seconds) per user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link DTuMetric}
 */
export class DTuInterpreter extends MetricInterpreter {
    constructor(
        metric: DTuMetric,
        goal: Goal,
        // Assume a maximum of 30,000ms (30 seconds) per user
        // as an initial benchmark for DTu's interpretation
        initialMaxValue: number = 30000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Dwell Time per Visit (DTv)**
 *
 * Computes the average dwell time per visit.
 * Its value is computed from user interaction traces
 * by dividing the total dwell time during visits by the number of unique visits.
 *
 * **Unit**: `ms/visit`
 * **Acronym**: `DTv`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoVMetric}
 */
export class DTvMetric extends CompositeMetric {
    _value = 0;

    constructor() {
        super(
            "Dwell Time per Visit",
            "Average time per visit (dwell time)",
            "ms/visit",
            "DTv",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoV": new NoVMetric() // NoV
        }
    }

    /**
     * Computes the value for **Dwell Time per Visit (DTv)**.
     * 
     * It initializes the visit-to-{min-start-Time, max-end-Time} map
     * It then populates this map from the telemetry data.
     * It then uses this map to compute the total dwell time from all visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total dwell time and number of visits to compute DTv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average dwell time per visit.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the visit-to-{min-start-Time, max-end-Time} map
        const visits: { [visitId: string]: { minTime: number; maxTime: number } } = {};

        // Populate the visits map
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

        // Compute the number of visits from the NoV metric by passing it the telemetry data
        const nbVisits = this.children['NoV'].computeValue(telemetryData);

        if (nbVisits > 0) {
            let totalDwellTime = 0;
            Object.keys(visits).forEach(id => {
                // Compute total dwell time for all visits from the visits map
                totalDwellTime += visits[id].maxTime - visits[id].minTime;
            });
            // Use the total dwell time fo all visits and the number of visits to compute DTv
            this._value = totalDwellTime / nbVisits;
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
     * @returns - An instance of `DTvInterpreter` to interpret this metric for the provided goal.
     * @see {@link DTvInterpreter}.
     */
    getInterpter(goal: Goal): DTvInterpreter {
        return new DTvInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Dwell Time per Visit (DTv)** metric.
 *
 * Normalizes the computed value using a benchmark (30,000ms (30 seconds) per visit, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link DTvMetric}
 */
export class DTvInterpreter extends MetricInterpreter {
    constructor(
        metric: DTvMetric,
        goal: Goal,
        // Assume a maximum of 30,000ms (30 seconds) per visit
        // as an initial benchmark for DTv's interpretation
        initialMaxValue: number = 30000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Dwell Time per Session (DTs)**
 *
 * Computes the average dwell time per session.
 * Its value is computed from user interaction traces
 * by dividing the total dwell time during sessions by the number of unique sessions.
 *
 * **Unit**: `ms/session`
 * **Acronym**: `DTs`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoSMetric}
 */
export class DTsMetric extends CompositeMetric {
    _value = 0;

    constructor() {
        super(
            "Dwell Time per Session",
            "Average time per session (dwell time)",
            "ms/session",
            "DTs",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoS": new NoSMetric() // NoS
        }
    }

    /**
     * Computes the value for **Dwell Time per Session (DTs)**.
     * 
     * It initializes the session-to-{min-start-Time, max-end-Time} map
     * It then populates this map from the telemetry data.
     * It then uses this map to compute the total dwell time from all sessions.
     * Afterwards, it computes the number of sessions using the `NoS` metric.
     * Finally, it uses the total dwell time and number of sessions to compute DTs.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average dwell time per session.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the session-to-{min-start-Time, max-end-Time} map
        const sessions: { [sessionId: string]: { minTime: number; maxTime: number } } = {};

        // Populate the sessions map
        telemetryData.forEach(data => {
            const sessionId = data.attributes["app.session.id"];
            if (sessionId) {
                // Convert start and end times from [seconds, nanoseconds] to milliseconds
                const startTime = Utils.toMs(data.startTime);
                const endTime = Utils.toMs(data.endTime);

                if (!sessions[sessionId]) {
                    sessions[sessionId] = { minTime: startTime, maxTime: endTime };
                } else {
                    sessions[sessionId].minTime = Math.min(sessions[sessionId].minTime, startTime);
                    sessions[sessionId].maxTime = Math.max(sessions[sessionId].maxTime, endTime);
                }
            }
        });

        // Compute the number of sessions from the NoS metric by passing it the telemetry data
        const nbSessions = this.children['NoS'].computeValue(telemetryData);

        if (nbSessions > 0) {
            let totalDwellTime = 0;
            Object.keys(sessions).forEach(id => {
                // Compute total dwell time for all sessions from the sessions map
                totalDwellTime += sessions[id].maxTime - sessions[id].minTime;
            });
            // Use the total dwell time fo all sessions and the number of sessions to compute DTs
            this._value = totalDwellTime / nbSessions;
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
     * @returns - An instance of `DTsInterpreter` to interpret this metric for the provided goal.
     * @see {@link DTsInterpreter}.
     */
    getInterpter(goal: Goal): DTsInterpreter {
        return new DTsInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Dwell Time per session (DTs)** metric.
 *
 * Normalizes the computed value using a benchmark (30,000ms (30 seconds) per session, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link DTsMetric}
 */
export class DTsInterpreter extends MetricInterpreter {
    constructor(
        metric: DTsMetric,
        goal: Goal,
        // Assume a maximum of 30,000ms (30 seconds) per session
        // as an initial benchmark for DTs's interpretation
        initialMaxValue: number = 30000,
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Navigation Clicks per User (NNCu)**
 *
 * Computes the average number of navigation click events per user.
 * and `Interaction Capability -> User Engagement -> Popularity`.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached user IDs and mapping them to their captured
 * navigation click events.
 *
 * **Unit**: `clicks/user`
 * **Acronym**: `NNCu`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class NNCuMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Navigation Clicks per User",
            "Average number of navigation clicks (page views) per user",
            "clicks/user",
            "NNCu",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoU": new NoUMetric() // NoU
        }
    }

    /**
     * Computes the value for the **Navigation Clicks per User (NNCu)** metric.
     * 
     * It initializes a user-to-clickCount map to map each user to the number of its navigation clicks.
     * It then uses the map to compute the total number of clicks across users.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total number of clicks and number of users to compute NNCu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of navigation clicks (_page views_) per user.
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the user-to-clickCount map
        const userClicks: { [userId: string]: number } = {};

        // Populate the map and the set
        telemetryData.forEach(data => {
            const userId = data.attributes["app.user.id"];
            if (userId) {
                const eventType = data.attributes["event_type"];
                const traceName = data.name;
                if (
                    eventType === "click" &&
                    typeof traceName === "string" &&
                    traceName.toLowerCase().includes("navigation:")
                ) {
                    userClicks[userId] = (userClicks[userId] || 0) + 1;
                }
            }
        });

        // Compute the total number of clicks from the user-to-clickCount map
        const totalClicks = Object.values(userClicks).reduce((sum, count) => sum + count, 0);

        // Compute the number of unique users from the NoU metric by passing it the telemetry data
        const nbUsers = this.children["NoU"].computeValue(telemetryData);

        if (nbUsers) {
            // Use the NoU and the total number of navigation clicks across users
            // to compute the value of NNCu
            this._value = totalClicks / nbUsers;
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
     * @returns - An instance of `NNCuInterpreter` to interpret this metric for the provided goal.
     * @see {@link NNCuInterpreter}.
     */
    getInterpter(goal: Goal): NNCuInterpreter {
        return new NNCuInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Navigation Clicks per User (NNCu)** metric.
 *
 * Normalizes the computed value using a benchmark (10 clicks/user, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NNCuMetric}
 */
export class NNCuInterpreter extends MetricInterpreter {
    constructor(
        metric: NNCuMetric,
        goal: Goal,
        // Assume a maximum of 10 clicks/user
        // as an initial benchmark for NNCu's interpretation
        initialMaxValue: number = 10,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Navigation Clicks per Visit (NNCv)**
 *
 * Computes the average number of navigation click events per user visit.
 * and `Interaction Capability -> User Engagement -> Popularity`.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached visit IDs and mapping them to their captured
 * navigation click events.
 *
 * **Unit**: `clicks/visit`
 * **Acronym**: `NNCv`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoVMetric}
 */
export class NNCvMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Navigation Clicks per Visit",
            "Average number of navigation clicks (page views) per visit",
            "clicks/visit",
            "NNCv",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoV": new NoVMetric() // NoV
        }
    }

    /**
     * Computes the value for the **Navigation Clicks per Visit (NNCv)** metric.
     * 
     * It initializes a visit-to-clickCount map to map each visit to the number of its navigation clicks.
     * It then uses the map to compute the total number of clicks across visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of clicks and number of visits to compute NNCv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of navigation clicks (_page views_) per visit
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the visit-to-clickCount map
        const visitClicks: { [visitId: string]: number } = {};

        // Populate the map and the set
        telemetryData.forEach(data => {
            const visitId = data.attributes["app.visit.id"];
            if (visitId) {
                const eventType = data.attributes["event_type"];
                const traceName = data.name;
                if (
                    eventType === "click" &&
                    typeof traceName === "string" &&
                    traceName.toLowerCase().includes("navigation:")
                ) {
                    visitClicks[visitId] = (visitClicks[visitId] || 0) + 1;
                }
            }
        });

        // Compute the total number of navigation clicks from the map
        const totalClicks = Object.values(visitClicks).reduce((sum, count) => sum + count, 0);

        // Compute the number of visits from the NoV metric by passing it the telemetry data
        const nbVisits = this.children['NoV'].computeValue(telemetryData);

        if (nbVisits) {
            // Use the NoV and the total number of navigation clicks across user visits
            // to compute the value of NNCv
            this._value = totalClicks / nbVisits;
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
     * @returns - An instance of `NNCvInterpreter` to interpret this metric for the provided goal.
     * @see {@link NNCvInterpreter}.
     */
    getInterpter(goal: Goal): NNCvInterpreter {
        return new NNCvInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Navigation Clicks per Visit (NNCv)** metric.
 *
 * Normalizes the computed value using a benchmark (10 clicks/visit, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NNCvMetric}
 */
export class NNCvInterpreter extends MetricInterpreter {
    constructor(
        metric: NNCvMetric,
        goal: Goal,
        // Assume a maximum of 10 clicks/visit
        // as an initial benchmark for NNCv's interpretation
        initialMaxValue: number = 10,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Navigation Clicks per Session (NNCs)**
 *
 * Computes the average number of navigation click events per user session.
 * and `Interaction Capability -> User Engagement -> Popularity`.
 * Its value is computed from user interaction traces
 * by extracting and filtering the attached session IDs and mapping them to their captured
 * navigation click events.
 *
 * **Unit**: `clicks/session`
 * **Acronym**: `NNCs`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoSMetric}
 */
export class NNCsMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Navigation Clicks per Session",
            "Average number of navigation clicks (page views) per session",
            "clicks/session",
            "NNCs",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "NoS": new NoSMetric() // NoS
        }
    }

    /**
     * Computes the value for the **Navigation Clicks per Session (NNCs)** metric.
     * 
     * It initializes a session-to-clickCount map to map each session to the number of its navigation clicks.
     * It then uses the map to compute the total number of clicks across sessions.
     * Afterwards, it computes the number of sessions using the `NoS` metric.
     * Finally, it uses the total number of clicks and number of sessions to compute NNCs.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of navigation clicks (_page views_) per session
     */
    computeValue(telemetryData: any[]): number {
        // Initialize the session-to-clickCount map and the set of unique sessions
        const sessionClicks: { [sessionId: string]: number } = {};

        // Populate the map and the set
        telemetryData.forEach(data => {
            const sessionId = data.attributes["app.session.id"];
            if (sessionId) {
                const eventType = data.attributes["event_type"];
                const traceName = data.name;
                if (
                    eventType === "click" &&
                    typeof traceName === "string" &&
                    traceName.toLowerCase().includes("navigation:")
                ) {
                    sessionClicks[sessionId] = (sessionClicks[sessionId] || 0) + 1;
                }
            }
        });

        // Compute the total number of navigation clicks from the map
        const totalClicks = Object.values(sessionClicks).reduce((sum, count) => sum + count, 0);

        // Compute the number of sessions from the NoS metric by passing it the telemetry data
        const nbSessions = this.children['NoS'].computeValue(telemetryData);

        // Use the NoS and the total number of navigation clicks across user sessions
        // to compute the value of NNCs
        if (nbSessions) {
            this._value = totalClicks / nbSessions;
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
     * @returns - An instance of `NNCsInterpreter` to interpret this metric for the provided goal.
     * @see {@link NNCsInterpreter}.
     */
    getInterpter(goal: Goal): NNCsInterpreter {
        return new NNCsInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Navigation Clicks per Session (NNCs)** metric.
 *
 * Normalizes the computed value using a benchmark (20 clicks/session, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NNCsMetric}
 */
export class NNCsInterpreter extends MetricInterpreter {
    constructor(
        metric: NNCsMetric,
        goal: Goal,
        // Assume a maximum of 20 clicks/session
        // as an initial benchmark for NNCs's interpretation
        initialMaxValue: number = 20,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Activity`
 * goal to its corresponding metrics:
 * 
 * 1. **User Interaction Frequency per User (UIFu)**;
 * 2. **User Interaction Frequency per Visit (UIFv)**;
 * 3. **User Interaction Frequency per Session (UIFs)**;
 * 4. **Dwell Time per User (DTu)**;
 * 5. **Dwell Time per Visit (DTv)**;
 * 6. **Dwell Time per Session (DTs)**;
 * 7. **Navigation Clicks per User (NNCu)**;
 * 8. **Navigation Clicks per Visit (NNCv)**;
 * 9. **Navigation Clicks per Session (NNCs)**.
 * 
 * @see classes {@link UIFuMetric}, {@link UIFvMetric}, {@link UIFsMetric},
 * {@link DTuMetric}, {@link DTvMetric}, {@link DTsMetric},
 * {@link NNCuMetric}, {@link NNCvMetric}, and {@link NNCsMetric}.
 */
export class ActivityMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('frontend')) {
            this.metrics.push(
                /* User Interaction Frequency metrics */
                new UIFuMetric(), // UIFu
                new UIFvMetric(), // UIFv
                new UIFsMetric(), // UIFs
                /* Dwell Time metrics */
                new DTuMetric(), // DTu
                new DTvMetric(), // DTv
                new DTsMetric(), // DTs
                /* Navigation Click Depth metrics */
                new NNCuMetric(), // NNCu
                new NNCvMetric(), // NNCv
                new NNCsMetric() // NNCs
            );
        }
    }

    /**
     * Maps the `Interaction Capability -> User Engagement -> Activity` goal to its metrics:
     * 
     * 1. **User Interaction Frequency per User (UIFu)**;
     * 2. **User Interaction Frequency per Visit (UIFv)**;
     * 3. **User Interaction Frequency per Session (UIFs)**;
     * 4. **Dwell Time per User (DTu)**;
     * 5. **Dwell Time per Visit (DTv)**;
     * 6. **Dwell Time per Session (DTs)**;
     * 7. **Navigation Clicks per User (NNCu)**;
     * 8. **Navigation Clicks per Visit (NNCv)**;
     * 9. **Navigation Clicks per Session (NNCs)**.
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Activity".
     * @see classes {@link UIFuMetric}, {@link UIFvMetric}, {@link UIFsMetric},
     * {@link DTuMetric}, {@link DTvMetric}, {@link DTsMetric},
     * {@link NNCuMetric}, {@link NNCvMetric}, and {@link NNCsMetric}.
     */
    map(goal: Goal) {
        if (goal.name !== "Activity")
            throw new Error(`Activity Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Activity"
        goal.weight = 0.35;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}