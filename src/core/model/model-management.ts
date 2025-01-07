import { ISOIEC25010 } from "../../models/iso-iec-25010";
import { ApplicationMetadata } from "../application-core";
import { Characteristic } from "../characteristics/characteristics-core";
import { ICharacteristicsFilteringStrategy, NameBasedFilteringStrategy, ThresholdType, WeightBasedFilteringStrategy } from "../strategies/characteristics-filtering";
import { IModelSelectionStrategy, UserGoalKeywordMatchSelectionStrategy } from "../strategies/model-selection";
import { UserGoal } from "../users-core";
import { QualityModel } from "./model-core";

/**
 * Manages the selection and filtering of quality models based on user goals
 * and the metadata of the application being analyzed. This class facilitates
 * the interaction between the quality models and the rest of the system,
 * ensuring that the most relevant models and characteristics are selected
 * and utilized for quality assessment.
 */
export class QualityModelManager {
    private _qualityModels: QualityModel[] = [];
    private _selectedModel?: QualityModel | undefined;
    private modelSelectionStrategy?: IModelSelectionStrategy<any>;
    private characteristicsFilteringStrategy?: ICharacteristicsFilteringStrategy<any>;

    /**
     * Initializes the manager with default strategies and loads the quality models.
     * @param _applicationMetadata The metadata of the target application under analysis
     * @param _userGoal The current user goal driving model and characteristics selection.
     */
    constructor(
        private _applicationMetadata: ApplicationMetadata,
        private _userGoal: UserGoal) {
        // Default model selection and characteristics filtering strategies
        this.defaultModelSelectionStrategy();
        this.defaultCharacteristicsFilteringStrategy();

        // Loading the quality models and selecting a quality model
        // based on user-selected goal
        this.initializeQualityModels();

        // Upon changes to the user goal, update it locally and reload model selection
        this.userGoal.addGoalChangeListener(newGoal => this.handleUserGoalChange(newGoal));
    }

    private defaultModelSelectionStrategy(){
        this.modelSelectionStrategy = new UserGoalKeywordMatchSelectionStrategy();
    }

    private defaultCharacteristicsFilteringStrategy(){
        this.characteristicsFilteringStrategy = new WeightBasedFilteringStrategy(5, ThresholdType.LOWER_INCLUDED)
    }

    public get selectedModel(): QualityModel | undefined {
        return this._selectedModel;
    }
    
    public set selectedModel(selectedModel : QualityModel | undefined) {
        this._selectedModel = selectedModel;
    }

    public get applicationMetadata(): ApplicationMetadata {
        return this._applicationMetadata;
    }

    public get userGoal(): UserGoal{
        return this._userGoal;
    }

    public set userGoal(userGoal: UserGoal){
        this._userGoal = userGoal;
    }

    public setUserGoalName(userGoalName: string): void {
        this._userGoal.goal = userGoalName;
    }

    public setModelSelectionStrategy(strategy: IModelSelectionStrategy<any>): void {
        this.modelSelectionStrategy = strategy;
    }

    public setCharacteristicsFilteringStrategy(strategy: ICharacteristicsFilteringStrategy<any>): void {
        this.characteristicsFilteringStrategy = strategy;
    }

    /**
     * Initializes the building of all predefined quality models
     */
    private initializeQualityModels(): void {
        // This is where quality models are loaded
        this._qualityModels.push(new ISOIEC25010());
    }

    /**
     * Handles changes to the user goal, updating the selection and filtering
     * strategies accordingly.
     * @param newGoal The updated user goal.
     */
    private handleUserGoalChange(newGoal: string): void{
        this.setUserGoalName(newGoal);
        this.selectQualityModelForGoal();
    }

    /**
     * Reloads the building of predefined quality models
     */
    public reloadQualityModels(): void {
        this.initializeQualityModels();
    }

    /**
    * Lists the selected quality model's available characteristics
    */
    public listAvailableCharacteristics(): void {
        // Return if not model is selected
        if (!this._selectedModel){
            console.error("No quality model is selected by the quality model manager.");
            return;
        }

        console.log("Available Characteristics:");
        this._selectedModel.characteristics.forEach(char => char.displayInfo());
    }

    public getSelectedCharacteristics(): Characteristic[]{
        return this.selectedModel?.characteristics ?? [];
    }

    /**
     * Selects a quality model based on the provided user goal
     */
    public selectQualityModelForGoal(): void {
        // Load and apply default model selection strategy
        this.defaultModelSelectionStrategy();
        this._selectedModel = this.modelSelectionStrategy?.selectModel(this._qualityModels, {'name': 'userGoal', value: this._userGoal});
    }

    /**
     * Filters the (sub-)characteristics of the selected model
     * based on the selected user goal and
     * returns a boolean to indicate whether it suceeded or not
     * @returns true if the (sub-)characteristics of the selected model
     * were filtered for the selected user goal, false otherwise
     */
    public filterCharacteristicsForGoal(): boolean {
        // Return if not model is selected
        if (!this._selectedModel){
            console.error("No quality model is selected by the quality model manager.");
            return false;
        }

        // Load and apply default characteristics filtering strategy for the selected user goal
        this.defaultCharacteristicsFilteringStrategy();
        this._selectedModel.characteristics = this.characteristicsFilteringStrategy?.filterCharacteristics(
            this._selectedModel.characteristics,
            {'name': 'userGoal', 'value': this._userGoal}
        ) ?? this._selectedModel.characteristics;

        return true;
    }

    /**
     * Filters the (sub-)characteristics of the selected model
     * based on the provided list of (sub-)characteristic names
     * returns a boolean to indicate whether it suceeded or not
     * @param selectedNames A list of (sub-)characteristic names used to filter the selected model's (sub-)characteristics
     * @returns true if the (sub-)characteristics of the selected model
     * were filtered for based on the list of characteristic names, false otherwise
     */
    public filterCharacteristicsByNames(selectedNames: string[]): boolean {
        // Return if not model is selected
        if (!this._selectedModel){
            console.error("No quality model is selected by the quality model manager.");
            return false;
        }

        // Load and apply name-based characteristics filtering strategy
        // for the user-selected (sub-)characteristics
        this.characteristicsFilteringStrategy = new NameBasedFilteringStrategy();
        this._selectedModel.characteristics = this.characteristicsFilteringStrategy.filterCharacteristics(
            this._selectedModel.characteristics,
            {'name': 'name', 'value': selectedNames}
        );

        return true;
    }
}
