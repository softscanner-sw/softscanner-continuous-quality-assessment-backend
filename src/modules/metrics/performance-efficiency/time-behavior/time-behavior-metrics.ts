import { Goal } from "../../../../core/goals/goals";
import { GoalMapper, Metric } from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";

/**
 * ARTMetric computes the Average Response Time (ART) in milliseconds
 * based on HTTP spans collected via backend Node.js instrumentation.
 */
export class ARTMetric extends Metric {
    _value: number = 0;

    constructor() {
        // The metric requires tracing telemetry
        super("Average Response Time", "Average time (in ms) to process HTTP requests", "ms", "ART", [TelemetryType.TRACING]);
    }

    /**
     * Computes the average response time.
     * It filters telemetry data to include only HTTP spans (identified by a tag with key "http.method")
     * and uses the "duration" field for each span.
     *
     * @param telemetryData An array of span objects.
     * @returns The computed average response time.
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

        // Helper to convert a time representation (number or [seconds, nanoseconds]) into milliseconds.
        const toMs = (time: any): number => {
            if (typeof time === 'number') {
                return time;
            } else if (Array.isArray(time)) {
                // Convert [seconds, nanoseconds] to milliseconds
                return time[0] * 1000 + time[1] / 1e6;
            }
            return 0;
        };

        // Sum the durations of each HTTP span.
        let totalResponseTime = 0;
        httpTraces.forEach(trace => {
            let durationMs = 0;
            // Prefer using duration; if missing startTime and endTime exists, compute duration from them
            if (trace.duration != null) {
                durationMs = toMs(trace.duration);
            } else if (trace.startTime && trace.endTime) {
                // If duration isn’t directly provided, compute it from startTime and endTime.
                durationMs = toMs(trace.endTime) - toMs(trace.startTime);
            }

            totalResponseTime += durationMs;
        });

        // Compute average response time.
        this._value = totalResponseTime / httpTraces.length;
        return this._value;
    }

    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }
}

/**
 * ARTInterpreter normalizes the computed Average Response Time value
 * and assigns a weight based on whether the "Time Behavior" goal is selected.
 */
export class ARTInterpreter extends MetricInterpreter {
    constructor(metric: ARTMetric, selectedGoals: Goal[]) {
        // Use an initial benchmark of 1000ms (1 second) as the normalization maximum.
        super(metric, selectedGoals, 1000);
    }

    /**
     * If the "Time Behavior" goal is selected, assign a higher weight.
     */
    assignWeight(): number {
        return this.selectedGoals.some(goal => goal.name === "Time Behavior") ? 0.5 : 0.3;
    }
}

/**
 * TPUTMetric computes the throughput (in requests per second) based on
 * HTTP spans collected via backend Node.js instrumentation.
 */
export class TPUTMetric extends Metric {
    _value: number = 0;

    constructor() {
        // The metric requires tracing telemetry.
        super("Throughput", "Number of HTTP requests processed per second", "req/s", "TPUT", [TelemetryType.TRACING]);
    }

    /**
     * Computes the throughput as the number of HTTP spans divided by the
     * time window (in seconds) over which those spans occurred.
     *
     * It first filters telemetry data to only include HTTP spans (identified by the presence
     * of a tag with key "http.method"). Then it computes the observation window using the
     * minimum start time and maximum end time (both assumed to be numeric and in milliseconds).
     *
     * @param telemetryData An array of span objects.
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

        // Define a fixed observation window (in milliseconds)
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

    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }
}

/**
 * TPUTInterpreter normalizes the computed throughput value
 * and assigns a weight based on whether the "Time Behavior" goal is selected.
 */
export class TPUTInterpreter extends MetricInterpreter {
    constructor(metric: TPUTMetric, selectedGoals: Goal[]) {
        // Use an initial benchmark of 10 req/s as the normalization maximum.
        super(metric, selectedGoals, 10);
    }

    /**
     * If the "Time Behavior" goal is selected, assign a higher weight.
     */
    assignWeight(): number {
        return this.selectedGoals.some(goal => goal.name === "Time Behavior") ? 0.4 : 0.2;
    }
}

/**
 * TimeBehaviorMapper maps a "Time Behavior" goal to the ARTMetric.
 */
export class TimeBehaviorMapper implements GoalMapper {
    map(goal: Goal): void {
        if (goal.name !== "Time Behavior") {
            throw new Error(`Time Behavior Mapper: Incorrect mapper for goal ${goal.name}`);
        }

        // Set overall weight for "Time Behavior"
        goal.weight = 1/3;
        goal.metrics.push(
            new ARTMetric(),
            new TPUTMetric(),
        );
    }
}
