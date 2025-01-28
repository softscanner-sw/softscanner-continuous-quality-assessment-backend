import { Goal } from "../goals/goals";
import { Metric } from "./metrics-core";

/**
 * Abstract class representing a metric interpreter.
 * It defines methods for interpreting a metric's value and assigning a weight.
 */
export abstract class MetricInterpreter {
    protected metric: Metric;
    protected selectedGoals: Goal[];
    protected _maxValue: any; // Holds the evolving max value for this metric

    constructor(metric: Metric, selectedGoals: Goal[], initialMaxValue: any) {
        this.metric = metric;
        this.selectedGoals = selectedGoals;
        this._maxValue = initialMaxValue; // Set the initial hardcoded benchmark
    }

    get maxValue(): any {
        return this._maxValue;
    }

    /**
     * Method to interpret the metric's value based on the selected goals.
     * @returns Normalized metric value.
     */
    interpret(): number {
        // Update the maxValue dynamically based on the metric's history
        this.updateMaxValue();

        // Normalize the metric value using the current maxValue
        return this.metric.value / this._maxValue;
    }

    /**
     * Updates the maxValue based on the metric's history.
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
     * @returns Weight for the metric.
     */
    abstract assignWeight(): number;
}