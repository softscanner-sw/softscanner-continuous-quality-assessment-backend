import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import { CompositeMetric, LeafMetric, Metric } from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";
import { OpenTelemetryNodeTracingInstrumentationAdapter } from "../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";
import { IpMetric } from "../../non-repudiation/ip/non-repudiation-ip-metric";

/**
 * Metric: **Number of HTTP Requests (NHR)**
 *
 * Computes the total number of HTTP requests processed by the application.
 * It does so by counting the HTTP spans (identified by the presence of "http.method").
 *
 * **Unit**: `requests`
 * **Acronym**: `NHR`
 * **Required Telemetry**: `TRACING`
 *
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class NHRMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Number of HTTP Requests",
            "Total number of HTTP requests observed in the telemetry data",
            "requests",
            "NHR",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Number of HTTP Requests (NHR)** metric.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_)
     * and then returns their number.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns - The total number of HTTP requests observed in the telemetry data
     */
    computeValue(telemetryData: any[]): number {
        // Count HTTP spans (requests) by filtering those that have an "http.method" attribute.
        const httpTraces = telemetryData.filter(data =>
            data.attributes && data.attributes["http.method"]
        );
        this._value = httpTraces.length;
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
     * @returns - An instance of `NHRInterpreter` to interpret this metric for the provided goal.
     * @see {@link NHRInterpreter}.
     */
    getInterpter(goal: Goal): NHRInterpreter {
        return new NHRInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Number of HTTP Requests (NHR)** metric.
 *
 * Normalizes the computed value using a benchmark (500 requests, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link NHRMetric}
 */
export class NHRInterpreter extends MetricInterpreter {
    constructor(
        metric: NHRMetric,
        goal: Goal,
        // Assume a maximum of 500 requests
        // as an initial benchmark for NHR's interpretation
        initialMaxValue: number = 500,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Average Response Time (ART)**
 *
 * Computes average response time in ms for the target instrumented application.
 * Its value is computed based on identifying and analyzing HTTP spans from
 * the collected telemetry.
 *
 * **Unit**: `ms`
 * **Acronym**: `ART`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class ARTMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average Response Time",
            "Average time (in ms) to process HTTP requests",
            "ms",
            "ART",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Average Response Time (ART)** metric.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_)
     * and uses the `duration` field for each span in its computation.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns - The average time (in ms) to process HTTP requests.
     */
    computeValue(telemetryData: any[]): number {
        // Filter spans to include only HTTP spans (identified by the presence of 'http.method')
        const httpTraces = telemetryData.filter(data =>
            data.attributes && data.attributes["http.method"]
        );

        if (httpTraces.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Compute the total response time by summing the durations of each HTTP span.
        let totalResponseTime = 0;
        httpTraces.forEach(trace => {
            // Extract durations in milliseconds
            let durationMs = 0;
            // Prefer using duration; if missing startTime and endTime exists, compute duration from them
            if (trace.duration != null) {
                durationMs = Utils.toMs(trace.duration);
            } else if (trace.startTime && trace.endTime) {
                // If duration isn’t directly provided, compute it from startTime and endTime.
                durationMs = Utils.toMs(trace.endTime) - Utils.toMs(trace.startTime);
            }

            totalResponseTime += durationMs;
        });

        // Use the total response time and the number of HTTP spans
        // to compute ART
        this._value = totalResponseTime / httpTraces.length;
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
     * @returns - An instance of `ARTInterpreter` to interpret this metric for the provided goal.
     * @see {@link ARTInterpreter}.
     */
    getInterpter(goal: Goal): ARTInterpreter {
        return new ARTInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Average Response Time (ART)** metric.
 *
 * Normalizes the computed value using a benchmark (1000ms (1 second), by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link ARTMetric}
 */
export class ARTInterpreter extends MetricInterpreter {
    constructor(
        metric: ARTMetric,
        goal: Goal,
        // Assume a maximum of 1000ms (1 second)
        // as an initial benchmark for ART's interpretation
        initialMaxValue: number = 1000,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **95th Percentile Response Time (P95RT)**
 *
 * Computes the 95th percentile response time (in ms) of HTTP requests,
 * which reflects tail latency.
 *
 * **Unit**: `ms`
 * **Acronym**: `P95RT`
 * **Required Telemetry**: `TRACING`
 *
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class P95RTMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "95th Percentile Response Time",
            "95th percentile of HTTP response times (ms)",
            "ms",
            "P95RT",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **95th Percentile Response Time (P95RT)** metric.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_)
     * and uses the `duration` field for each span in its computation.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns - The 95th percentile time (in ms) to process HTTP requests.
     */
    computeValue(telemetryData: any[]): number {
        // Filter to include only HTTP spans (identified by the presence of 'http.method')
        const httpTraces = telemetryData.filter(data =>
            data.attributes && data.attributes["http.method"]
        );

        if (httpTraces.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Extract durations in milliseconds
        const durations = httpTraces.map(trace => {
            if (trace.duration != null) {
                return Utils.toMs(trace.duration);
            } else if (trace.startTime && trace.endTime) {
                return Utils.toMs(trace.endTime) - Utils.toMs(trace.startTime);
            } else {
                return 0;
            }
        }).filter(d => d > 0);

        if (durations.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Sort durations in ascending order
        durations.sort((a, b) => a - b);
        const index = Math.floor(0.95 * durations.length);
        this._value = durations[index];
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
     * @returns - An instance of `P95RTInterpreter` to interpret this metric for the provided goal.
     * @see {@link P95RTInterpreter}.
     */
    getInterpter(goal: Goal): P95RTInterpreter {
        return new P95RTInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **95th Percentile Response Time (P95RT)** metric.
 *
 * Normalizes the computed value using a benchmark (1000ms (1 second), by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link P95RTMetric}
 */
export class P95RTInterpreter extends MetricInterpreter {
    constructor(
        metric: P95RTMetric,
        goal: Goal,
        // Assume a maximum of 1000ms (1 second)
        // as an initial benchmark for ART's interpretation
        initialMaxValue: number = 1000,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Response Time Variability (RTVar)**
 *
 * Computes the standard deviation of HTTP response times,
 * which indicates the variability in system performance.
 *
 * **Unit**: `ms`
 * **Acronym**: `RTVar`
 * **Required Telemetry**: `TRACING`
 *
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class RTVarMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Response Time Variability",
            "Standard deviation of HTTP response times (ms)",
            "ms",
            "RTVar",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Response Time Variability (RTVar)** metric.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_)
     * and uses the `duration` field for each span in its computation.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns - The standard deviation of HTTP response times (ms).
     */
    computeValue(telemetryData: any[]): number {
        // Filter to include only HTTP spans (identified by the presence of 'http.method')
        const httpTraces = telemetryData.filter(data =>
            data.attributes && data.attributes["http.method"]
        );

        if (httpTraces.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Extract durations
        const durations = httpTraces.map(trace => {
            if (trace.duration != null) {
                return Utils.toMs(trace.duration);
            } else if (trace.startTime && trace.endTime) {
                return Utils.toMs(trace.endTime) - Utils.toMs(trace.startTime);
            } else {
                return 0;
            }
        }).filter(d => d > 0);

        if (durations.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Calculate average
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

        // Calculate standard deviation
        const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
        this._value = Math.sqrt(variance);
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
     * @returns - An instance of `RTVarInterpreter` to interpret this metric for the provided goal.
     * @see {@link RTVarInterpreter}.
     */
    getInterpter(goal: Goal): RTVarInterpreter {
        return new RTVarInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Response Time Variability (RTVar)** metric.
 *
 * Normalizes the computed value using a benchmark (500ms, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link RTVarMetric}
 */
export class RTVarInterpreter extends MetricInterpreter {
    constructor(
        metric: RTVarMetric,
        goal: Goal,
        // Assume a maximum of 500ms
        // as an initial benchmark for RTVar's interpretation
        initialMaxValue: number = 500,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Latency Performance Index (LPI)**
 *
 * Aggregates multiple latency metrics—Average Response Time (ART),
 * 95th Percentile Response Time (P95RT), and Response Time Variability (RTVar)—
 * into a single composite index that reflects the overall response time performance.
 *
 * **Unit:** `ms`
 * **Acronym:** `LPI`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see classes {@link ARTMetric}, {@link P95RTMetric}, and {@link RTVarMetric}.
 */
export class LPIMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Latency Performance Index",
            "Composite index aggregating ART, P95RT, and RTVar to reflect overall response time performance",
            "ms",
            "LPI",
            [TelemetryType.TRACING]
        );
        // Set up the composite children metrics.
        this.children = {
            "ART": new ARTMetric(),
            "P95RT": new P95RTMetric(),
            "RTVar": new RTVarMetric()
        };
    }

    /**
     * Computes the value for the **Latency Performance Index (LPI)**.
     * 
     * It calculates each child metric's value and then computes the average.
     *
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The composite latency index value (in ms).
     */
    computeValue(telemetryData: any[]): number {
        const art = this.children["ART"].computeValue(telemetryData);
        const p95rt = this.children["P95RT"].computeValue(telemetryData);
        const rtvar = this.children["RTVar"].computeValue(telemetryData);
        // Compute LPI as the average of ART, P95RT, and RTVar.
        this._value = (art + p95rt + rtvar) / 3;
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
     * @returns - An instance of `LPIInterpreter` to interpret this metric for the provided goal.
     * @see {@link LPIInterpreter}.
     */
    getInterpter(goal: Goal): LPIInterpreter {
        return new LPIInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Latency Performance Index (LPI)** metric.
 *
 * Normalizes the computed value using a benchmark (1000ms (1 second), by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link LPIMetric}
 */
export class LPIInterpreter extends MetricInterpreter {
    constructor(
        metric: LPIMetric,
        goal: Goal,
        // Assume a maximum of 1000ms (1 second)
        // as an initial benchmark for LPI's interpretation
        initialMaxValue: number = 1000,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * Metric: **Throughput (TPUT)**
 *
 * Computes the throughput (in requests per second) for the target instrumented application.
 * Its value is computed based on identifying and analyzing HTTP spans from
 * the collected telemetry.
 *
 * **Unit**: `req/s`
 * **Acronym**: `TPUT`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 */
export class TPUTMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Throughput",
            "Number of HTTP requests processed per second",
            "req/s",
            "TPUT",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for the **Throughput (TPUT)** metric.
     * 
     * It computes it as the number of HTTP spans divided by the
     * time window (in seconds) over which those spans occurred.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_).
     * 
     * Then it computes the observation window using the
     * minimum start time and maximum end time.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The number of HTTP requests processed per second.
     */
    computeValue(telemetryData: any[]): number {
        // Filter spans to include only HTTP spans (identified by the presence of 'http.method')
        const httpTraces = telemetryData.filter(data =>
            data.attributes && data.attributes["http.method"]
        );

        if (httpTraces.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Determine the minimum start time and maximum end time among all HTTP spans.
        let minStart = Infinity;
        let maxEnd = -Infinity;
        httpTraces.forEach(trace => {
            const startMs = Utils.toMs(trace.startTime);

            // Use endTime if available; if missing and duration exists, compute endTime from startTime.
            let endMs = trace.endTime != null
                ? Utils.toMs(trace.endTime)
                : (trace.duration != null ? startMs + Utils.toMs(trace.duration) : startMs);
            if (startMs < minStart) {
                minStart = startMs;
            }
            if (endMs > maxEnd) {
                maxEnd = endMs;
            }
        });

        // Define a fixed observation window of 10,000ms (10 seconds)
        const FIXED_WINDOW_MS = 10000;

        // If the overall batch spans less than the fixed window, use the actual span; otherwise, use the fixed window.
        const actualSpan = maxEnd - minStart;
        const observationWindowMs = actualSpan < FIXED_WINDOW_MS ? actualSpan : FIXED_WINDOW_MS;

        // Use the maximum end time as the "current" time, and consider only spans that started
        // within the observation window [maxEnd - observationWindowMs, maxEnd].
        const windowStart = maxEnd - observationWindowMs;
        const spansInWindow = httpTraces.filter(trace => Utils.toMs(trace.startTime) >= windowStart);

        // Compute throughput as number of spans divided by the observation window (in seconds).
        this._value = spansInWindow.length / (observationWindowMs / 1000);
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
     * @returns - An instance of `TPUTInterpreter` to interpret this metric for the provided goal.
     * @see {@link TPUTInterpreter}.
     */
    getInterpter(goal: Goal): TPUTInterpreter {
        return new TPUTInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **Throughput (TPUT)** metric.
 *
 * Normalizes the computed value using a benchmark (10 req/s, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link TPUTMetric}
 */
export class TPUTInterpreter extends MetricInterpreter {
    constructor(
        metric: TPUTMetric,
        goal: Goal,
        // Assume a maximum of 10 req/s
        // as an initial benchmark for TPUT's interpretation
        initialMaxValue: number = 10,
        // Assume a default weight of 0.3
        baseWeight: number = 0.3
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

/**
 * This class is responsible for mapping the `Performance Efficiency -> Time Behavior`
 * goal to its corresponding metrics:
 * 
 * 1. **Number of HTTP Requests (NHR)**;
 * 2. **Average Response Time (ART)**;
 * 3. **95th Percentile Response Time (P95RT)**;
 * 4. **Response Time Variability (RTVar)**;
 * 5. **Latency Performance Index (LPI)**;
 * 6. **Throughput (TPUT)**.
 * 
 * @see classes {@link NHRMetric}, {@link ARTMetric}, {@link P95RTMetric}, {@link RTVarMetric},
 * {@link LPIMetric}, and {@link TPUTMetric} and {@link IpMetric}
 */
export class TimeBehaviorMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('backend')) {
            this.metrics.push(
                new NHRMetric(), // NHR
                new ARTMetric(), // ART
                new P95RTMetric(), // P95RT
                new RTVarMetric(), // RTVar
                new LPIMetric(), // LPI
                new IpMetric(),
                new TPUTMetric(), // TPUT
            );
        }
    }

    /**
     * Maps the `Performance Efficiency -> Time Behavior` goal to its metrics:
     * 
     * 1. **Number of HTTP Requests (NHR)**;
     * 2. **Average Response Time (ART)**;
     * 3. **95th Percentile Response Time (P95RT)**;
     * 4. **Response Time Variability (RTVar)**;
     * 5. **Latency Performance Index (LPI)**;
     * 6. **Throughput (TPUT)**.
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Time Behavior".
     * @see classes {@link NHRMetric}, {@link ARTMetric}, {@link P95RTMetric}, {@link RTVarMetric},
     * {@link LPIMetric}, and {@link TPUTMetric}
     */
    map(goal: Goal): void {
        if (goal.name !== "Time Behavior") {
            throw new Error(`Time Behavior Mapper: Incorrect mapper for goal ${goal.name}`);
        }

        // Set overall weight for "Time Behavior"
        goal.weight = 1 / 3;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}
