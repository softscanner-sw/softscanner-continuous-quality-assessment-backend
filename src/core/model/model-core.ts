import { Characteristic} from "../characteristics/characteristics-core";

/**
 * Represents a software quality model, containing a set of characteristics.
 */
export class QualityModel {
    /**
     * Initializes a new instance of the QualityModel class.
     * @param _name The name of the quality model (e.g., "ISO/IEC 25010 (2023)").
     * @param _characteristics An array of Characteristic instances associated with this model.
     */
    constructor(
        private _name: string,
        private _version: string,
        private _characteristics: Characteristic[],
        /**
         * Indicates the primary focus or application domain of the quality model
         */
        private _purpose: string,
        /**
         * A high-level overview or reference to the methodology used 
         * for assessing characteristics based on the model.
         * This could be a URL to a document or a brief description.
         */
        private _assessmentMethodology?: string,
    ) { }

    // Getters & setters
    public get name() : string {
        return this._name;
    }
    
    public set name(name : string) {
        this._name = name;
    }
 
    public get value() : string {
        return this._version;
    }

    public set version(version: string){
        this._version = version;
    }

    public get purpose(): string{
        return this._purpose;
    }
    
    public set purpose(purpose : string) {
        this._purpose = purpose;
    }
    
    public get assessmentMethodology() : string | undefined {
        return this._assessmentMethodology;
    }
    
    public set assessmentMethodology(assessmentMethodology : string | undefined) {
        this._assessmentMethodology = assessmentMethodology;
    }
    
    public get characteristics() : Characteristic[] {
        return this._characteristics;
    }

    public set characteristics(characteristics: Characteristic[]){
        this._characteristics = characteristics;
    }

    // Utility methods
    /**
     * Adds a new characteristic to the quality model.
     * @param characteristic The Characteristic instance to be added.
     */
    addCharacteristic(characteristic: Characteristic): void {
        characteristic.model = this;
        this._characteristics.push(characteristic);
    }

    /**
     * Adds a sub-characteristic for a given characteristic in the model.
     * @param subCharacteristic The sub-characteristic to be added.
     * @param parent The parent characteristic.
     */
    addSubCharacteristic(subCharacteristic: Characteristic, parent: Characteristic): void {
        subCharacteristic.model = this;
        parent.addCharacteristic(subCharacteristic);
    }

    /**
     * Finds and returns a characteristic by its name.
     * @param characteristicName The name of the characteristic to find.
     * @returns The Characteristic instance if found, or undefined.
     */
    getCharacteristicByName(characteristicName: string): Characteristic | undefined {
        return this._characteristics.find(char => char.name === characteristicName);
    }

    /**
     * Finds and returns a sub-characteristic by its name for the given characteristic in the model.
     * @param subCharacteristicName The name of the sub-characteristic to get.
     * @param parent The parent characteristic of the sub-characteristic to get
     * @returns The Characteristic instance if found, or undefined.
     */
    getSubCharacteristicByName(subCharacteristicName: string, parent: Characteristic): Characteristic | undefined {
        return this._characteristics.find(char => char.name === subCharacteristicName);
    }

    /**
     * Checks if a characteristic exists for this model by name.
     * @param characteristicName the name of the characteristic to check
     * @returns true if the characteristic with the given name is found, false otherwise
     */
    hasCharacteristic(characteristicName: string): boolean {
        return this._characteristics.some(char => char.name === characteristicName);
    }

    /**
     * Checks if a parent characteristic in this model has a sub-characteristic with the provided name.
     * @param subCharacteristicName the name of the sub-characteristic to check
     * @param parent the parent characteristic of the sub-characteristic to check
     * @returns true if the sub-characteristic with the provided name is found for the parent, false otherwise
     */
    hasSubCharacteristicForParent(subCharacteristicName: string, parent: Characteristic): boolean {
        return parent.hasCharacteristic(subCharacteristicName);
    }

    /**
     * Verifies the existence of a sub-characteristic by its name in the model.
     * @param characteristicName The name of the sub-characteristic to check.
     * @returns true if the sub-characteristic exists, false otherwise.
     */
    hasSubCharacteristic(characteristicName: string): boolean {
        return this.characteristics.some(char => char.hasCharacteristic(characteristicName));
    }

    /**
     * Removes a characteristic from this model by name.
     * @param characteristicName the name of the characteristic to remove from this model
     */
    removeCharacteristic(characteristicName: string): void {
        let characteristic = this.getCharacteristicByName(characteristicName);
        if (characteristic){
            characteristic.model = undefined;
            this._characteristics = this._characteristics.filter(char => char.name !== characteristicName);
        }
    }

    /**
     * Removes a sub-characteristic by its name for the provided parent characteristic in this model.
     * @param subCharacteristicName the name of the sub-characteristic to remove for the provided parent characteristic in this model
     */
    removeSubCharacteristic(subCharacteristicName: string, parent: Characteristic): void {
        let subCharacteristic = this.getSubCharacteristicByName(subCharacteristicName, parent);
        if (subCharacteristic){
            subCharacteristic.model = undefined;
            parent.removeCharacteristic(subCharacteristicName);
        }
    }

    /**
     * Clears all characteristics for this model
     */
    clearCharacteristics(): void {
        this._characteristics = [];
    }

    /**
     * Clears all sub-characteristics for the provided parent characteristic in this model
     * @param parent the parent characteristic to clear from its sub-characteristics
     */
    clearSubCharacteristics(parent: Characteristic){
        parent.clearCharacteristics();
    }

    /**
     * Displays information about the quality model, including its characteristics
     * and their hierarchy.
     */
    displayInfo(): void {
        console.log(`Quality Model: ${this.name}, Version: ${this.version}`);
        if (this.purpose)
            console.log(`Purpose: ${this.purpose}`);
        if (this.assessmentMethodology)
            console.log(`Assessment Methodology: ${this.assessmentMethodology}`);
        this.characteristics.forEach(char => char.displayInfo());
    }
}
