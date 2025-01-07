import { Metric } from "./metrics-core";
import { Characteristic, CompositeCharacteristic, LeafCharacteristic } from "../characteristics/characteristics-core";
import { CharacteristicsSelector } from "../characteristics/characteristics-selection";

/**
 * An interface to be implemented by any visitor that can visit a hierarchy of
 * Characteristic instances in a Quality Model to map them to their
 * corresponding metrics to be computed, based on the user goal
 * and operational context of the application
 * 
 */
export interface IMetricsMapperCharacteristicVisitor {
    /**
     * Visits a composite characteristic to map it to its associated metrics
     * @param characteristic The composite characteristic visited by this metrics mapper
     */
    visitCompositeCharacteristic(characteristic: CompositeCharacteristic): Metric[] | void;

    /**
     * Visits a leaf characteristic to map it to its associated metrics
     * @param characteristic The leaf characteristic visited by this metrics mapper
     */
    visitLeafCharacteristic(characteristic: LeafCharacteristic): Metric[] | void;

    map(): void;
}

/**
 * Defines the interface for a metrics mapper, capable of visiting characteristics
 * within a quality model and mapping them to corresponding metrics based on
 * the application's user goal and operational context.
 */
export abstract class MetricsMapper implements IMetricsMapperCharacteristicVisitor {
    protected _selectedMetrics: Metric[] = [];

    /**
     * Constructs a new MetricsMapper instance.
     * @param selector A CharacteristicsSelector instance to select characteristics
     * based on user goals.
     */
    constructor(protected selector: CharacteristicsSelector) {
        
    }

    /**
     * Retrieves the metrics selected by this mapper.
     * @returns An array of selected Metric instances.
     */
    public get selectedMetrics() : Metric[] {
        return this._selectedMetrics;
    }
    
    /**
     * Retrieves the characteristics selected by the CharacteristicsSelector.
     * @returns An array of selected Characteristic instances.
     */
    public getSelectedCharacteristics(): Characteristic[] {
        return this.selector.getSelectedCharacteristics();
    }

    /**
     * Abstract method to visit and process a composite characteristic.
     * Must be implemented by subclasses.
     * @param characteristic The composite characteristic to visit.
     */
    abstract visitCompositeCharacteristic(characteristic: CompositeCharacteristic): void | Metric[];

    /**
     * Abstract method to visit and process a leaf characteristic.
     * Must be implemented by subclasses.
     * @param characteristic The leaf characteristic to visit.
     */
    abstract visitLeafCharacteristic(characteristic: LeafCharacteristic): void | Metric[];

    /**
     * Initiates the mapping of selected characteristics to their corresponding metrics.
     * Must be implemented by subclasses.
     */
    public abstract map(): void;
}