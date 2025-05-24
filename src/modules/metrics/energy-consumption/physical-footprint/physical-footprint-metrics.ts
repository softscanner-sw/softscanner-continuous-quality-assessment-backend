import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import { CompositeMetric, LeafMetric, Metric } from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";
import { OpenTelemetryNodeTracingInstrumentationAdapter } from "../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";
import { CpuTimeUsageMetric, CpuUsageMetric, MemoryMetric, UptimeMetric } from "../../performance-efficiency/resource-utilization/resource-utilization-metrics";

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
export class PhysicalFootprintMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "PhysicalFootprint calcul",
            "PhysicalFootprint calcul",
            "PhysicalFootprint calcul",
            "PhysicalFootprint",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies

            "CpuUsage": new CpuUsageMetric(),
            "CpuTimeUsage": new CpuTimeUsageMetric(),
            "Memory": new MemoryMetric(),
            "Uptime": new UptimeMetric(),
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
        const CpuUsage = this.children["CpuUsage"].computeValue(telemetryData);       // Usage CPU en pourcentage
        const CpuTimeUsage = this.children["CpuTimeUsage"].computeValue(telemetryData); // Temps CPU utilisé (en pourcentage ou en secondes)
        const MemoryUsage = this.children["Memory"].computeValue(telemetryData);      // Usage mémoire en pourcentage
        const Uptime = this.children["Uptime"].computeValue(telemetryData);           // Uptime (en secondes ou en heures)

        const alpha = 0.4;  // Poids de l'usage CPU
        const beta = 0.3;   // Poids de l'usage mémoire
        const gamma = 0.2;  // Poids du temps CPU
        const delta = 0.1;  // Poids de l'uptime

        // Calculer le Footprint (empremte) du serveur
        this._value = alpha * (CpuUsage / 100) + beta * (MemoryUsage / 100) + gamma * (CpuTimeUsage / 100) + delta * (Uptime / 100);

        // Retourner la valeur du footprint calculée
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
    getInterpter(goal: Goal): PhysicalFootprintInterpreter {
        return new PhysicalFootprintInterpreter(this, goal);
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
export class PhysicalFootprintInterpreter extends MetricInterpreter {
    constructor(
        metric: PhysicalFootprintMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/user
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, baseWeight);
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
export class PhysicalFootprintMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('backend')) {
            this.metrics.push(
                new CpuUsageMetric(),
                new CpuTimeUsageMetric(),
                new MemoryMetric(),
                new UptimeMetric(),
                new PhysicalFootprintMetric
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
        if (goal.name !== "Physical Footprint") {
            throw new Error(`Physical-footprint: Incorrect mapper for goal ${goal.name}`);
        }

        // Set overall weight for "Time Behavior"
        goal.weight = 1 / 3;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}