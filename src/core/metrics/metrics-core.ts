import { Goal } from "../goals/goals";
import { TelemetryType } from "../telemetry/telemetry";

/**
 * Represents a generic metric with basic properties and behaviors. This class
 * serves as a foundation for specific types of metrics that can be computed
 * from telemetry data.
 */
export abstract class Metric {
    protected _value: any;
    /**
     * Constructs a new Metric instance.
     * @param _name The name of the metric.
     * @param _description A brief description of what the metric measures.
     * @param _requiredTelemetry The types of telemetry required to compute this metric.
     */
    constructor(
        protected _name: string,
        protected _description: string,
        protected _acronym: string = "",
        protected _requiredTelemetry: TelemetryType[] = []) {
    }

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

    get requiredTelemetry(): TelemetryType[] {
        return this._requiredTelemetry;
    }

    /**
     * Checks if a specific type of telemetry is required by this metric.
     * @param telemetryType The type of telemetry to check.
     * @returns true if the telemetry type is required, false otherwise.
     */
    hasRequiredTelemetry(telemetryType: TelemetryType): boolean {
        return this._requiredTelemetry.includes(telemetryType);
    }

    setRequiredTelemetry(telemetryTypes: TelemetryType[]) {
        telemetryTypes.forEach(type => {
            if (!this.hasRequiredTelemetry(type))
                this._requiredTelemetry.push(type);
        });
    }

    /**
     * Displays information about the metric.
     */
    displayInfo(): void {
        console.log(`name: ${this._name}, acronym: ${this._acronym}, description: ${this._description}, value: ${this.computeValue()}`);
        console.log(`required telemetry: ${this._requiredTelemetry}`);
    }

    resetValue(): void {
        this._value = undefined;
    }

    /**
     * Abstract method to calculate or retrieve the value of the metric.
     * Must be implemented by subclasses.
     */
    abstract computeValue(data?: any[]): any;
}

export interface GoalMapper {
    map(goal: Goal): any
}