import { Metric } from "../metrics/metrics-core";
import { IMetricsMapperCharacteristicVisitor } from "../metrics/metrics-mappers";
import { QualityModel } from "../model/model-core";

/**
 * Abstract class representing a characteristic or sub-characteristic
 * in a software quality model. This follows the Composite design pattern.
 * @abstract
 */
export abstract class Characteristic {
    protected _metrics: Metric[] = [];

    constructor(
        private _name: string,
        private _description: string,
        private _weight: number,
        protected _parent?: Characteristic,
        private _model?: QualityModel) {}

    /**
     * Returns the name of this characteristic
     * @returns this characteristic's name
     */
    get name(): string{
        return this._name
    }

    set name(name: string) {
        this._name = name;
    }

    /**
     * Returns the description of this characteristic
     * @returns this characteristic's description
     */
    get description(): string{
        return this._description
    }
    
    /**
     * Sets a new description for this characteristic
     * @param description the new description for this characteristic
     */
    public set description(description : string) {
        this._description = description;
    }

    /**
     * Returns the weight of this characteristic
     * @returns this characteristic's weight
     */
    get weight(): number{
        return this._weight
    }
    
    /**
     * Sets a new weight for this characteristic
     * @param weight the new weight for this characteristic
     */
    public set weight(weight : number) {
        this._weight = weight;
    }

    /**
     * Returns the parent of this characteristic
     * @returns this characteristic's parent
     */
    get parent(): Characteristic | undefined {
        return this._parent;
    }
    
    /**
     * Sets a new parent for this characteristic
     * @param parent the new characteristic parent for this characteristic
     */
    public set parent(parent : Characteristic | undefined) {
        this._parent = parent;
    }

    get model(): QualityModel | undefined{
        return this._model;
    }

    set model(model: QualityModel | undefined){
        this._model = model;
    }

    get metrics(): Metric[]{
        return this._metrics;
    }

    /**
     * Adds a sub-characteristic to this characteristic.
     * @param characteristic the sub-characteristic to add to this characteristic
     */
    abstract addCharacteristic(characteristic: Characteristic): void;

    /**
     * Removes a sub-characteristic from this characteristic by name.
     * @param characteristicName the name of the sub-characteristic to remove from this characteristic
     */
    abstract removeCharacteristic(characteristicName: string): void;

    /**
     * Finds a sub-characteristic for this characteristic by name.
     * @param characteristicName the name of the sub-characteristic to return
     * @returns the sub-characteristic having this name or undefined
     */
    abstract findCharacteristicByName(characteristicName: string): Characteristic | undefined;

    /**
     * Checks if a sub-characteristic exists for this characteristic by name.
     * @param characteristicName the name of the sub-characteristic to check
     */
    abstract hasCharacteristic(characteristicName: string): boolean;

    /**
     * Clears all sub-characteristics of this characteristic
     */
    abstract clearCharacteristics(): void;

    /**
     * Displays the characteristic info, including its hierarchy.
     * @param depth The depth of the characteristic in the hierarchy, used for indentation.
     */
    abstract displayInfo(depth?: number): void;
    
    /**
     * Method to accept a mapper visitor implementing the IMetricsMapperVisitor interface.
     * @param visitor The mapper that will map the necessary metrics for this characteristic.
     */
    abstract accept(visitor: IMetricsMapperCharacteristicVisitor): void;
}

/**
 * A composite characteristic that can contain other sub-characteristics.
 */
export class CompositeCharacteristic extends Characteristic {
    private _characteristics: Characteristic[] = [];

    public get characteristics(){
        return this._characteristics;
    }

    addCharacteristic(characteristic: Characteristic): void {
        characteristic.parent = this; // set parent
        this._characteristics.push(characteristic);
    }

    removeCharacteristic(characteristicName: string): void {
        if (this.hasCharacteristic(characteristicName)){
            let target = this.findCharacteristicByName(characteristicName);
            target!!.parent = undefined; // remove parent

            // remove characteristic
            this._characteristics = this._characteristics.filter(char => char.name !== characteristicName);
        }
    }

    findCharacteristicByName(characteristicName: string): Characteristic | undefined {
        return this._characteristics.find(char => char.name === characteristicName);
    }

    hasCharacteristic(characteristicName: string): boolean {
        return this._characteristics.some(char => char.name === characteristicName);
    }

    clearCharacteristics(): void {
        // Clear parents of all sub-characteristics
        this._characteristics.forEach(char => char.parent = undefined);
        this._characteristics = [];
    }

    /**
     * Accepts a mapper visitor to map this composite characteristic to its associated metrics
     * @param visitor The mapper used to map this composite characteristic to its associated metrics
     */
    accept(visitor: IMetricsMapperCharacteristicVisitor): void {
        this._metrics = visitor.visitCompositeCharacteristic(this) ?? this._metrics;
        this._characteristics.forEach(child => child.accept(visitor));
    }

    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Composite Characteristic: ${this.name}`);
        this._characteristics.forEach(char => char.displayInfo(depth + 1));
    }
}

/**
 * A leaf characteristic that cannot contain sub-characteristics.
 */
export class LeafCharacteristic extends Characteristic {
    addCharacteristic(_characteristic: Characteristic): void {
        throw new Error('Leaf characteristics cannot contain sub-characteristics.');
    }

    removeCharacteristic(_characteristicName: string): void {
        // No operation for leaf characteristics.
    }

    findCharacteristicByName(_characteristicName: string): Characteristic | undefined {
        return undefined;
    }

    hasCharacteristic(_characteristicName: string): boolean {
        return false;
    }

    clearCharacteristics(): void {
        // No operation for leaf characteristics.
    }

    /**
     * Accepts a mapper visitor to map this leaf characteristic to its associated metrics
     * @param visitor The mapper used to map this leaf characteristic to its associated metrics
     */
    accept(visitor: IMetricsMapperCharacteristicVisitor): void {
        this._metrics = visitor.visitLeafCharacteristic(this) ?? this._metrics;
    }

    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Leaf Characteristic: ${this.name}`);
    }
}