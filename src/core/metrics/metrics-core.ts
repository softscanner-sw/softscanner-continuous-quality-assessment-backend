import { Goal } from "../goals/goals";
import { TelemetryType } from "../telemetry/telemetry";

/**
 * Abstract class representing a generic metric.
 * This class serves as the foundation for specific types of metrics that are computed from telemetry data.
 */
export abstract class Metric {
    protected _value: any;  // Holds the computed value of the metric.
    protected _history: MetricHistory = [];  // Tracks historical values of the metric.

    /**
     * Constructs a new `Metric` instance.
     * @param _name - The name of the metric.
     * @param _description - A brief description of what the metric measures.
     * @param _unit - The unit of measurement for the metric (e.g., "ms", "users", "interactions/session").
     * @param _acronym - An optional short acronym representing the metric.
     * @param _requiredTelemetry - The types of telemetry data required to compute this metric.
     */
    constructor(
        protected _name: string,
        protected _description: string,
        protected _unit: string,
        protected _acronym: string = "",
        protected _requiredTelemetry: TelemetryType[] = []) {
    }

    // Getter methods for accessing metric properties.
    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get acronym(): string {
        return this._acronym;
    }

    get value(): any {
        return this._value;
    }

    get unit(): string {
        return this._unit;
    }

    get requiredTelemetry(): TelemetryType[] {
        return this._requiredTelemetry;
    }

    get history(): MetricHistory {
        return this._history;
    }

    /**
    * Checks if the metric requires a specific type of telemetry.
    * @param telemetryType - The type of telemetry to check.
    * @returns true if the telemetry type is required, false otherwise.
    */
    hasRequiredTelemetry(telemetryType: TelemetryType): boolean {
        return this._requiredTelemetry.includes(telemetryType);
    }

    /**
     * Adds new telemetry types to the metric's requirements.
     * @param telemetryTypes - An array of telemetry types to add.
     */
    setRequiredTelemetry(telemetryTypes: TelemetryType[]) {
        telemetryTypes.forEach(type => {
            if (!this.hasRequiredTelemetry(type))
                this._requiredTelemetry.push(type);
        });
    }

    /**
     * Displays detailed information about the metric.
     */
    displayInfo(): void {
        console.log(`name: ${this._name}, acronym: ${this._acronym}, description: ${this._description}, value: ${this.computeValue()}, unit: ${this._unit}`);
        console.log(`required telemetry: ${this._requiredTelemetry}`);
    }

    /**
     * Resets the value of the metric to its initial state.
     */
    resetValue(): void {
        this._value = undefined;
    }

    abstract isComposite(): boolean;

    /**
     * Abstract method to accept a visitor for this metric
     * @param visitor - The visitor implementing the `MetricVisitor` interface.
     */
    abstract accept(visitor: MetricVisitor): any;

    /**
     * Abstract method to compute the value of the metric.
     * This method must be implemented by subclasses.
     * @param data - Optional telemetry data used to compute the metric.
     */
    abstract computeValue(data?: any[]): any;

    /**
     * Abstract method to return a proper interpreter for the metric for the provided goal
     * @param goal - The goal in the context of which the metric is interpreted.
     */
    abstract getInterpter(goal: Goal): any;
}

/**
 * Represents an entry in the metric's historical data.
 */
export type MetricHistoryEntry = {
    'timestamp': string,
    'value': number
}

/**
 * Represents the history of a metric as an array of historical entries.
 */
export type MetricHistory = MetricHistoryEntry[]


export abstract class LeafMetric extends Metric {
    isComposite(): boolean {
        return false;
    }

    accept(visitor: MetricVisitor): any {
        return visitor.visitLeafMetric(this);
    }
}

export abstract class CompositeMetric extends Metric {
    /**
     * Children metrics that are used in the computation
     * of this composite metric
     */
    children: { [key: string]: Metric } = {};

    isComposite(): boolean {
        return true;
    }

    accept(visitor: MetricVisitor): any {
        return visitor.visitCompositeMetric(this);
    }
}

/**
 * Interface for a visitor that can traverse a hierarchy of metrics (composite and leaf metrics).
 * This interface follows the Visitor design pattern.
 */
export interface MetricVisitor {
    /**
     * Visits a composite metric and maps it to its associated metrics.
     * @param metric - The composite metric being visited.
     */
    visitCompositeMetric(metric: CompositeMetric): any;

    /**
     * Visits a leaf metric and maps it to its associated metrics.
     * @param metric - The leaf metric being visited.
     */
    visitLeafMetric(metric: LeafMetric): any;
}