import { CompositeGoal, Goal } from "../goals/goals";

/**
 * Represents a quality model that contains a set of quality goals for software assessment.
 * This class provides utility methods to manage and interact with the quality model.
 */
export class QualityModel {
    /**
     * Initializes a new instance of the QualityModel class.
     * @param _name The name of the quality model (e.g., "ISO/IEC 25010 (2023)"). 
     * @param _version The version of the quality model.
     * @param _goals An array of Goal instances representing quality goals in the model.
     * @param _purpose A description of the model's focus or application domain.
     * @param _assessmentMethodology Optional: Description or URL reference to the assessment methodology.
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

    // Getters and setters for the class properties.

    /**
     * Gets the name of the quality model
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Sets the name of the quality model
     */
    public set name(name: string) {
        this._name = name;
    }

    /**
     * Gets the version of the quality model
     */
    public get version(): string {
        return this._version;
    }

    /**
     * Sets the name of the quality model
     */
    public set version(version: string) {
        this._version = version;
    }

    /**
     * Gets the purpose of the quality model
     */
    public get purpose(): string {
        return this._purpose;
    }

    /**
     * Sets the purpose of the quality model
     */
    public set purpose(purpose: string) {
        this._purpose = purpose;
    }

    /**
     * Gets the assessment methodology description or URL of the quality model
     */
    public get assessmentMethodology(): string | undefined {
        return this._assessmentMethodology;
    }

    /**
     * Sets the assessment methodology description or URL of the quality model
     */
    public set assessmentMethodology(assessmentMethodology: string | undefined) {
        this._assessmentMethodology = assessmentMethodology;
    }

    /**
     * Gets the goals of the quality model
     */
    public get goals(): Goal[] {
        return this._goals;
    }

    /**
     * Sets the goals of the quality model
     */
    public set goals(goals: Goal[]) {
        this._goals = goals;
    }

    // Utility methods for goal management.

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
     * Recursively searches for a goal by its name.
     * @param goalName The name of the goal to search for.
     * @returns The matching Goal instance if found, otherwise undefined.
     */
    getGoalByName(goalName: string): Goal | undefined {
        for (const goal of this._goals) {
            if (goal.name === goalName) {
                return goal;
            }
            if (goal instanceof CompositeGoal) {
                const foundGoal = this.findGoalRecursive(goal, goalName);
                if (foundGoal) {
                    return foundGoal;
                }
            }
        }
        return undefined;
    }

    /**
     * Helper function to recursively search for a goal within composite goals.
     * @param compositeGoal The composite goal to search within.
     * @param goalName The name of the goal to find.
     * @returns The matching Goal instance if found, otherwise undefined.
     */
    private findGoalRecursive(compositeGoal: CompositeGoal, goalName: string): Goal | undefined {
        for (const subGoal of compositeGoal.subGoals) {
            if (subGoal.name === goalName) {
                return subGoal;
            }
            if (subGoal instanceof CompositeGoal) {
                const foundGoal = this.findGoalRecursive(subGoal, goalName);
                if (foundGoal) {
                    return foundGoal;
                }
            }
        }
        return undefined;
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
    clearSubGoals(parent: CompositeGoal) {
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

    /**
    * Converts the quality model to a JSON representation.
    */
    toJSON() {
        return {
            name: this.name,
            version: this.version,
            purpose: this.purpose,
            assessmentMethodology: this.assessmentMethodology,
            goals: this.goals.map(goal => goal.toJSON()) // Serialize goals
        };
    }
}
