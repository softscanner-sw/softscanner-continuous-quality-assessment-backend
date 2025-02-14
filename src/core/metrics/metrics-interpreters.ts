import { Goal } from "../goals/goals";
import { Metric } from "./metrics-core";

/**
 * Abstract class representing a metric interpreter.
 * Interprets a metric's value and assigns a weight based on the selected goals.
 */
export abstract class MetricInterpreter {
    protected metric: Metric; // The metric to interpret
    protected selectedGoals: Goal[]; // The selected quality goals assessed by the metric to interpret
    protected _maxValue: any;  // Tracks the maximum value for normalization purposes.

    /**
     * Constructs a new `MetricInterpreter` instance.
     * @param metric - The metric to interpret.
     * @param selectedGoals - The list of selected quality goals.
     * @param initialMaxValue - An initial hardcoded maximum value for normalization.
     */
    constructor(metric: Metric, selectedGoals: Goal[], initialMaxValue: any) {
        this.metric = metric;
        this.selectedGoals = selectedGoals;
        this._maxValue = initialMaxValue; // Set the initial hardcoded benchmark
    }

    /**
     * Returns the initial hardcoded maximum value for normalization
     */
    get maxValue(): any {
        return this._maxValue;
    }

    /**
     * Interprets the metric's value by normalizing it against the maximum value.
     * @returns The normalized metric value.
     */
    interpret(): number {
        // Update the maxValue dynamically based on the metric's history
        this.updateMaxValue();

        // Normalize the metric value using the current maxValue
        return this.metric.value / this._maxValue;
    }

    /**
     * Updates the maximum value dynamically based on the metric's historical values.
     */
    private updateMaxValue(): void {
        const maxHistoricalValue = Math.max(
            ...this.metric.history.map(entry => entry.value),
            this._maxValue
        );
        this._maxValue = maxHistoricalValue;
    }

    /**
     * Abstract method to assign a weight to the metric based on the selected goals.
     * @returns The assigned weight for the metric.
     */
    abstract assignWeight(): number;
}