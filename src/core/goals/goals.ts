import { Assessment } from "../assessment/assessment-core";
import { Metric } from "../metrics/metrics-core";

/**
 * Abstract class representing a goal or sub-goal in SSQMM (Structured Software Quality Measurement Model).
 * This class serves as the base class for both composite and leaf goals and implements the Composite design pattern.
 * 
 * Goals can contain associated metrics and assessments to measure and evaluate software quality.
 * @abstract
 */
export abstract class Goal {
    protected _metrics: Set<Metric> = new Set();  // List of associated metrics for this goal
    assessments: Assessment[] = [];     // List of assessments for this goal

    constructor(
        private _name: string,               // The name of the goal
        private _description: string,        // A brief description of the goal
        private _parent?: Goal,              // Reference to the parent goal (for hierarchical structure)
        private _weight: number = 1          // Weight used for scoring or prioritization
    ) { }

    // Getters and Setters for goal properties

    /**
     * Returns the name of the goal.
     */
    get name(): string {
        return this._name
    }

    /**
     * Sets a new name for the goal
     * @param name the new name for this goal
     */
    set name(name: string) {
        this._name = name;
    }

    /**
     * Returns the description of the goal.
     */
    get description(): string {
        return this._description
    }

    /**
     * Sets a new description for this goal
     * @param description the new description for this goal
     */
    set description(description: string) {
        this._description = description;
    }

    /**
     * Returns the parent goal, if any.
     */
    get parent(): Goal | undefined {
        return this._parent;
    }

    /**
     * Sets a new parent for this goal
     * @param parent the new parent for this goal
     */
    set parent(_parent: Goal | undefined) {
        this._parent = _parent;
    }

    /**
     * Returns the weight assigned to this goal.
     */
    get weight(): number | undefined {
        return this._weight
    }

    /**
     * Sets a new weight for the goal.
     * @param weight - New weight value.
     */
    set weight(weight: number) {
        this._weight = weight;
    }

    /**
     * Returns the list of metrics associated with this goal.
     */
    get metrics(): Set<Metric> {
        return this._metrics;
    }

    /**
     * Adds a new assessment to the goal's list of assessments.
     * @param assessment - The assessment to add.
     */
    addAssessment(assessment: Assessment): void {
        this.assessments.push(assessment);
    }

    /**
     * Returns the latest assessment for the goal, or null if no assessments exist.
     */
    get latestAssessment(): Assessment | null {
        return this.assessments.length > 0 ? this.assessments[this.assessments.length - 1] : null;
    }

    hasMetric(metric: Metric){
        return Array.from(this.metrics).some(m => m.acronym === metric.acronym);
    }

    /**
     * Abstract method to display goal information.
     * @param depth - Depth level in the goal hierarchy for indentation (used in composite goals).
     */
    abstract displayInfo(depth?: number): void;

    abstract isComposite(): boolean;

    /**
     * Abstract method to accept a visitor for mapping metrics to this goal.
     * @param visitor - The visitor implementing the GoalVisitor interface.
     */
    abstract accept(visitor: GoalVisitor): any;

    /**
     * Abstract method to convert the goal to JSON, handling circular references.
     */
    abstract toJSON(): any;
}

/**
 * Represents a composite goal that can contain sub-goals.
 * This is a node in the goal hierarchy and follows the Composite design pattern.
 */
export class CompositeGoal extends Goal {
    private _subGoals: Goal[] = [];  // List of sub-goals under this composite goal

    /**
     * Returns the list of sub-goals.
     */
    public get subGoals() {
        return this._subGoals;
    }

    isComposite(): boolean {
        return true;
    }

    /**
     * Adds a sub-goal to this composite goal and sets this as its parent.
     * @param goal - The sub-goal to add.
     */
    addGoal(goal: Goal): void {
        goal.parent = this;
        this._subGoals.push(goal);
    }

    /**
     * Removes a sub-goal with the given name.
     * @param goalName - Name of the sub-goal to remove.
     */
    removeGoal(goalName: string): void {
        if (this.hasGoal(goalName))
            this._subGoals = this._subGoals.filter(goal => goal.name !== goalName);
    }

    /**
     * Checks if this composite goal contains a sub-goal with the given name.
     * @param goalName - Name of the sub-goal to check.
     */
    hasGoal(goalName: string): boolean {
        return this._subGoals.some(goal => goal.name === goalName);
    }

    /**
     * Clears all sub-goals and removes their parent references.
     */
    clearGoals(): void {
        // Clear parents of all sub-goals
        this._subGoals.forEach(goal => goal.parent = undefined);
        this._subGoals = [];
    }

    /**
     * Accepts a visitor for mapping metrics to this composite goal and its sub-goals.
     * @param visitor - The visitor implementing the GoalVisitor interface.
     */
    accept(visitor: GoalVisitor): any {
        return visitor.visitCompositeGoal(this) ?? this._metrics;
    }

    /**
     * Displays information about this composite goal and its sub-goals.
     * @param depth - Depth level in the goal hierarchy for indentation.
     */
    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Composite Goal: ${this.name}`);
        this._subGoals.forEach(goal => goal.displayInfo(depth + 1));
    }

    /**
     * Converts the composite goal to a JSON representation, including its sub-goals.
     */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            weight: this.weight,
            metrics: Array.from(this.metrics).map(metric => metric.name),
            subGoals: this._subGoals.map(goal => goal.toJSON()) // Recursively serialize sub-goals
        };
    }
}

/**
 * Represents a leaf goal that cannot contain sub-goals.
 * This is a terminal node in the goal hierarchy.
 */
export class LeafGoal extends Goal {
    
    isComposite(): boolean {
        return false;
    }

    /**
     * Accepts a visitor for mapping metrics to this leaf goal.
     * @param visitor - The visitor implementing the GoalVisitor interface.
     */
    accept(visitor: GoalVisitor): any {
        return visitor.visitLeafGoal(this) ?? this._metrics;
    }

    /**
     * Displays information about this leaf goal.
     * @param depth - Depth level in the goal hierarchy for indentation.
     */
    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Leaf Goal: ${this.name}`);
    }

    /**
    * Converts the leaf goal to a JSON representation.
    */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            weight: this.weight,
            metrics: Array.from(this.metrics).map(metric => metric.name)
        };
    }
}

/**
 * Interface for a visitor that can traverse a hierarchy of goals and map them to metrics.
 * This interface follows the Visitor design pattern.
 */
export interface GoalVisitor {
    /**
     * Visits a composite goal and maps it to its associated metrics.
     * @param goal - The composite goal being visited.
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void;

    /**
     * Visits a leaf goal and maps it to its associated metrics.
     * @param goal - The leaf goal being visited.
     */
    visitLeafGoal(goal: LeafGoal): Metric[] | void;
}

/**
 * Interface for mapping goals to any other elements.
 */
export interface GoalMapper {
    map(goal: Goal): any
}