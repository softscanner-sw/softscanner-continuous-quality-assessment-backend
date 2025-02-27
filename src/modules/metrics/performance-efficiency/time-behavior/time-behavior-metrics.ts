import { Goal } from "../../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";
import { OpenTelemetryNodeTracingInstrumentationAdapter } from "../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";

/**
 * Represents the **Average Response Time (ART)** metric.
 * This metric counts **the average response time in milliseconds based on HTTP spans** 
 * to measure `Performance Efficiency -> Time Behavior`.
 * 
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 */
export class ARTMetric extends Metric {
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
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_)
     * and uses the `duration` field for each span in its computation.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed value representing the average response time.
     */
    computeValue(telemetryData: any[]): number {
        // Filter spans that are actual HTTP spans based on the presence of "http.method"
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

        // Compute average response time by dividing total response time
        // by number of HTTP spans
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
}

/**
 * Provides interpretation logic for the **Average Response Time (ART)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * A default initial hardcoded maximum of `1000ms (1 second)` is used
 * as an initial **normalization benchmark** for ART's interpretation.
 */
export class ARTInterpreter extends MetricInterpreter {
    constructor(metric: ARTMetric, selectedGoals: Goal[]) {
        // Assume a maximum of 1000ms (1 second)
        // as an initial benchmark for ART's interpretation
        super(metric, selectedGoals, 1000);
    }

    /**
     * Assigns a weight to the **Average Response Time (ART)** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     * @see {@link ARTMetric}
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        // If selected goals includes "Time Behavior"
        if (this.selectedGoals.some(goal => goal.name === "Time Behavior")) {
            const timeBehavior = this.selectedGoals.find(goal => goal.name === "Time Behavior");
            if (timeBehavior)
                weight = (timeBehavior.weight || 1) / (timeBehavior.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * Represents the **Throughput (TPUT)** metric.
 * This metric computes **the throughput (in requests per second) based on HTTP spans** 
 * to measure `Performance Efficiency -> Time Behavior`.
 * 
 * @requires {@link OpenTelemetryNodeTracingInstrumentationAdapter}
 */
export class TPUTMetric extends Metric {
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
     * It computes it as the number of HTTP spans divided by the
     * time window (in seconds) over which those spans occurred.
     * 
     * It filters telemetry data to include only **HTTP spans**
     * (_identified by a tag with key `http.method`_).
     * Then it computes the observation window using the
     * minimum start time and maximum end time.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The computed throughput value (in req/s).
     */
    computeValue(telemetryData: any[]): number {
        // Filter spans that are actual HTTP spans based on the presence of "http.method"
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

            // Prefer using endTime; if missing and duration exists, compute endTime from startTime.
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
}

/**
 * Provides interpretation logic for the **Throughput (TPUT)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `0.3` is assigned in case no goals are selected.
 * A default initial hardcoded maximum of `10 req/s` is used
 * as an initial **normalization benchmark** for TPUT's interpretation.
 */
export class TPUTInterpreter extends MetricInterpreter {
    constructor(metric: TPUTMetric, selectedGoals: Goal[]) {
        // Assume a maximum of 10 req/s
        // as an initial benchmark for TPUT's interpretation
        super(metric, selectedGoals, 10);
    }

    /**
     * Assigns a weight to the **Throughput (TPUT)** metric.
     * @returns A weight dynamically computed based on the selected goals; otherwise, 0.3.
     * @see {@link TPUTMetric}
     */
    assignWeight(): number {
        let weight = 0.3; // default weight
        // If selected goals includes "Time Behavior"
        if (this.selectedGoals.some(goal => goal.name === "Time Behavior")) {
            const timeBehavior = this.selectedGoals.find(goal => goal.name === "Time Behavior");
            if (timeBehavior)
                weight = (timeBehavior.weight || 1) / (timeBehavior.metrics.length || 1);
        }
        return weight;
    }
}

/**
 * This class is responsible for mapping the `Performance Efficiency -> Time Behavior`
 * goal to its corresponding metrics:
 * 1. **Average Response Time (ART)**;
 * 2. **Throughput (TPUT)**.
 * 
 * @see classes {@link ARTMetric} and {@link TPUTMetric}
 */
export class TimeBehaviorMapper implements GoalMapper {
    /**
     * Maps the `Performance Efficiency -> Time Behavior` goal to its metrics (ART and TPUT).
     * @param goal The goal to map.
     * @throws An error if the goal is not "Time Behavior".
     * @see classes {@link ARTMetric} and {@link TPUTMetric}
     */
    map(goal: Goal): void {
        if (goal.name !== "Time Behavior") {
            throw new Error(`Time Behavior Mapper: Incorrect mapper for goal ${goal.name}`);
        }

        // Set overall weight for "Time Behavior"
        goal.weight = 1 / 3;
        goal.metrics.push(
            new ARTMetric(),
            new TPUTMetric(),
        );
    }
}
