import { CompositeGoal, Goal} from "../goals/goals-core";

/**
 * Represents a software quality model, containing a set of goals.
 */
export class QualityModel {
    /**
     * Initializes a new instance of the QualityModel class.
     * @param _name The name of the quality model (e.g., "ISO/IEC 25010 (2023)").
     * @param _goals An array of Goal instances associated with this model.
     */
    constructor(
        private _name: string,
        private _version: string,
        private _goals: Goal[],
        /**
         * Indicates the primary focus or application domain of the quality model
         */
        private _purpose: string,
        /**
         * A high-level overview or reference to the methodology used 
         * for assessing goals based on the model.
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
    
    public get goals() : Goal[] {
        return this._goals;
    }

    public set goals(goals: Goal[]){
        this._goals = goals;
    }

    // Utility methods
    /**
     * Adds a new goal to the quality model.
     * @param goal The Goal instance to be added.
     */
    addGoal(goal: Goal): void {
        this._goals.push(goal);
    }

    /**
     * Adds a sub-goal for a given goal in the model.
     * @param subGoal The sub-goal to be added.
     * @param parent The parent goal.
     */
    addSubGoal(subGoal: Goal, parent: CompositeGoal): void {
        parent.addGoal(subGoal);
    }

    /**
     * Finds and returns a goal by its name.
     * @param goalName The name of the goal to find.
     * @returns The Goal instance if found, or undefined.
     */
    getGoalByName(goalName: string): Goal | undefined {
        return this._goals.find(goal => goal.name === goalName);
    }

    /**
     * Checks if a goal exists for this model by name.
     * @param goalName the name of the goal to check
     * @returns true if the goal with the given name is found, false otherwise
     */
    hasGoal(goalName: string): boolean {
        return this._goals.some(goal => goal.name === goalName);
    }

    /**
     * Verifies the existence of a sub-goal by its name in the model.
     * @param goalName The name of the sub-goal to check.
     * @returns true if the sub-goal exists, false otherwise.
     */
    hasSubGoal(goalName: string): boolean {
        return this.goals.some(goal => goal instanceof CompositeGoal && goal.hasGoal(goalName));
    }

    /**
     * Removes a goal from this model by name.
     * @param goalName the name of the goal to remove from this model
     */
    removeGoal(goalName: string): void {
        let goal = this.getGoalByName(goalName);
        if (goal)
            this._goals = this._goals.filter(g => g.name !== goalName);
    }

    /**
     * Clears all goals for this model
     */
    clearGoals(): void {
        this._goals = [];
    }

    /**
     * Clears all sub-goals for the provided parent goal in this model
     * @param parent the parent goal to clear from its sub-goals
     */
    clearSubGoals(parent: CompositeGoal){
        parent.clearGoals();
    }

    /**
     * Displays information about the quality model, including its goals
     * and their hierarchy.
     */
    displayInfo(): void {
        console.log(`Quality Model: ${this.name}, Version: ${this.version}`);
        if (this.purpose)
            console.log(`Purpose: ${this.purpose}`);
        if (this.assessmentMethodology)
            console.log(`Assessment Methodology: ${this.assessmentMethodology}`);
        this.goals.forEach(goal => goal.displayInfo());
    }
}
