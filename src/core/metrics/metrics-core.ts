import { TelemetryType } from "../instrumentation/instrumentation-core";

/**
 * Represents a generic metric with basic properties and behaviors. This class
 * serves as a foundation for specific types of metrics that can be computed
 * from telemetry data.
 */
export abstract class Metric {
    /**
     * Constructs a new Metric instance.
     * @param name The name of the metric.
     * @param description A brief description of what the metric measures.
     * @param requiredTelemetry The types of telemetry required to compute this metric.
     */
    constructor(
        protected name: string,
        protected description: string,
        protected requiredTelemetry: TelemetryType[] = []){
    }

    /**
     * Checks if a specific type of telemetry is required by this metric.
     * @param telemetryType The type of telemetry to check.
     * @returns true if the telemetry type is required, false otherwise.
     */
    hasRequiredTelemetry(telemetryType: TelemetryType): boolean{
        return this.requiredTelemetry.includes(telemetryType);
    }

    /**
     * Displays information about the metric.
     */
    displayInfo(): void{
        console.log(`name: ${this.name}, description: ${this.description}, value: ${this.computeValue()}`);
        console.log(`required telemetry: ${this.requiredTelemetry}`);
    }

    /**
     * Abstract method to calculate or retrieve the value of the metric.
     * Must be implemented by subclasses.
     */
    abstract computeValue(data?: any[]): any;
}