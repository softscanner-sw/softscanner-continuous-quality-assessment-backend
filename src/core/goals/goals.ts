import { Assessment } from "../assessment/assessment-core";
import { Metric } from "../metrics/metrics-core";

/**
 * Abstract class representing a goal or sub-goal
 * in SSQMM. This follows the Composite design pattern.
 * @abstract
 */
export abstract class Goal {
    protected _metrics: Metric[] = [];
    assessments: Assessment[] = [];

    constructor(
        private _name: string,
        private _description: string,
        private _parent?: Goal,
        private _weight: number = 1) { }

    /**
     * Returns the name of this goal
     * @returns this goal's name
     */
    get name(): string {
        return this._name
    }

    set name(name: string) {
        this._name = name;
    }

    /**
     * Returns the description of this goal
     * @returns this goal's description
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

    get parent(): Goal | undefined {
        return this._parent;
    }

    set parent(_parent: Goal | undefined) {
        this._parent = _parent;
    }

    /**
     * Returns the weight of this goal
     * @returns this goal's weight
     */
    get weight(): number | undefined {
        return this._weight
    }

    /**
     * Sets a new weight for this goal
     * @param weight the new weight for this goal
     */
    set weight(weight: number) {
        this._weight = weight;
    }

    get metrics(): Metric[] {
        return this._metrics;
    }

    /**
     * Adds a new assessment to the list.
     */
    addAssessment(assessment: Assessment): void {
        this.assessments.push(assessment);
    }

    /**
     * Returns the latest assessment or null if none exist.
     */
    get latestAssessment(): Assessment | null {
        return this.assessments.length > 0 ? this.assessments[this.assessments.length - 1] : null;
    }

    /**
     * Displays the goal info, including its hierarchy.
     * @param depth The depth of the goal in the hierarchy, used for indentation.
     */
    abstract displayInfo(depth?: number): void;

    /**
     * Method to accept a mapper visitor implementing the IMetricsMapperVisitor interface.
     * @param visitor The mapper that will map the necessary metrics for this goal.
     */
    abstract accept(visitor: GoalVisitor): void;

    // Custom toJSON method to handle circular references
    abstract toJSON(): any;
}

/**
 * A composite goal that can contain other sub-goals.
 */
export class CompositeGoal extends Goal {
    private _subGoals: Goal[] = [];

    public get subGoals() {
        return this._subGoals;
    }

    addGoal(goal: Goal): void {
        goal.parent = this;
        this._subGoals.push(goal);
    }

    removeGoal(goalName: string): void {
        if (this.hasGoal(goalName))
            this._subGoals = this._subGoals.filter(goal => goal.name !== goalName);
    }

    hasGoal(goalName: string): boolean {
        return this._subGoals.some(goal => goal.name === goalName);
    }

    clearGoals(): void {
        // Clear parents of all sub-goals
        this._subGoals.forEach(goal => goal.parent = undefined);
        this._subGoals = [];
    }

    /**
     * Accepts a mapper visitor to map this composite goal to its associated metrics
     * @param visitor The mapper used to map this composite goal to its associated metrics
     */
    accept(visitor: GoalVisitor): void {
        visitor.visitCompositeGoal(this) ?? this._metrics;
    }

    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Composite Goal: ${this.name}`);
        this._subGoals.forEach(goal => goal.displayInfo(depth + 1));
    }

    // Custom toJSON method to handle circular references
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            weight: this.weight,
            metrics: this.metrics.map(metric => metric.name),
            subGoals: this._subGoals.map(goal => goal.toJSON()) // Recursively serialize sub-goals
        };
    }
}

/**
 * A leaf goal that cannot contain sub-goals.
 */
export class LeafGoal extends Goal {
    /**
     * Accepts a mapper visitor to map this leaf goal to its associated metrics
     * @param visitor The mapper used to map this leaf goal to its associated metrics
     */
    accept(visitor: GoalVisitor): void {
        visitor.visitLeafGoal(this) ?? this._metrics;
    }

    displayInfo(depth: number = 0): void {
        console.log(`${' '.repeat(depth * 2)}Leaf Goal: ${this.name}`);
    }

    // Custom toJSON method to handle circular references
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            weight: this.weight,
            metrics: this.metrics.map(metric => metric.name)
        };
    }
}

/**
 * An interface to be implemented by any visitor that can visit a hierarchy of
 * Goal instances in a Quality Model to map them to their
 * corresponding metrics to be computed, based on user selection
 * and operational context of the application
 * 
 */
export interface GoalVisitor {
    /**
     * Visits a composite goal to map it to its associated metrics
     * @param goal The composite goal visited by this metrics mapper
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void;

    /**
     * Visits a leaf goal to map it to its associated metrics
     * @param goal The leaf goal visited by this metrics mapper
     */
    visitLeafGoal(goal: LeafGoal): Metric[] | void;
}