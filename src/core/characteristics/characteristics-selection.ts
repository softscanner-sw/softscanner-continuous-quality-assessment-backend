import { QualityModelManager } from "../model/model-management";
import { IUserInputValidation, SimpleTextValidation } from "../validation-core";
import { Characteristic } from "./characteristics-core";

/**
 * Facilitates the selection of characteristics by the user, applying validation and filtering logic.
 */
export class CharacteristicsSelector {
    private userInputValidation: IUserInputValidation<any> = new SimpleTextValidation();

    /**
     * Constructs a CharacteristicsSelector with a reference to QualityModelManager.
     * @param qualityModelManager Manages the underlying quality models and their characteristics.
     */
    constructor(private qualityModelManager: QualityModelManager) {
        
    }

    public setUserInputValidation(validationStrategy: IUserInputValidation<any>): void {
        this.userInputValidation = validationStrategy;
    }

    public getSelectedCharacteristics(): Characteristic[]{
        return this.qualityModelManager.getSelectedCharacteristics();
    }

    /**
     * 
     * @param selectedNames the (sub-)characteristic names selected by the user to define/update
     * the selected (sub-)characteristics in the selected quality model
     * @returns true if the selected (sub-)characteristic
     */
    public propagateUserSelection(selectedNames: string[]): boolean {
        // Validate user selections
        const isValid = selectedNames.every(name => this.userInputValidation.validate(name));

        if (!isValid){
            console.error(`Invalid input detected`);
            return false;
        }

        // Notify the QualityModelManager about the new selections
        return this.qualityModelManager.filterCharacteristicsByNames(selectedNames);
    }

    /**
     * Displays the characteristics available for selection based on the currently selected quality model.
     */
    public displayAvailableCharacteristics(): void {
        // Utilize qualityModelManager to fetch and display available characteristics
        this.qualityModelManager.listAvailableCharacteristics();
    }

    public displaySelectedCharacteristics(): void {
        console.log('Selected Characteristics:');
        this.getSelectedCharacteristics().forEach(char => char.displayInfo());
    }
}
