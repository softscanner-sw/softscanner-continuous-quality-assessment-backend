import { CompositeGoal, Goal, GoalVisitor, LeafGoal } from "../goals/goals";
import { CompositeMetric, LeafMetric, Metric, MetricVisitor } from "./metrics-core";

/**
 * Abstract class representing a metric interpreter.
 * Interprets a metric's value and assigns a weight based on the selected goals.
 */
export abstract class MetricInterpreter implements GoalVisitor, MetricVisitor {
    // Candidate weights (and dependency multipliers) will be gathered from leaf goals.
    protected candidateWeights: number[] = [];
    protected candidateDepMultipliers: number[] = [];

    /**
     * Constructs a new `MetricInterpreter` instance.
     * Instead of passing the entire assessment context, we pass the selected goal (which is the root
     * of the branch we want to use for weight assignment).
     * The assessment engine still holds the full context.
     * @param metric - The metric to interpret.
     * @param goal - The selected quality goal mapped to the metric to interpret.
     * @param initialMaxValue - An initial hardcoded maximum value for normalization.
     * @param baseWeight - The initial weight assigned by the interpreter for the metric to interpret.
     */
    constructor(
        /**
         * The metric to interpret
         */
        protected metric: Metric,

        /**
         * The selected quality goal mapped to the metric to interpret.
         */
        protected goal: Goal,

        /**
         * The maximum value to normalize the metric value during interpretation.
         */
        protected _maxValue: any,

        /**
         * The base weight assigned by the interpreter for the metric during interpretation
         */
        protected baseWeight: number = 1,
    ) {

    }

    /**
     * Returns the initial hardcoded maximum value for normalization
     */
    get maxValue(): any {
        return this._maxValue;
    }

    /**
     * Interprets the metric's value by normalizing it against the maximum value.
     * @returns The normalized metric value.
     */
    interpret(): number {
        // Update the maxValue dynamically based on the metric's history
        this.updateMaxValue();

        // Normalize the metric value using the current maxValue
        return this.metric.value / this._maxValue;
    }

    /**
     * Updates the maximum value dynamically based on the metric's historical values.
     */
    private updateMaxValue(): void {
        const maxHistoricalValue = Math.max(
            ...this.metric.history.map(entry => entry.value),
            this._maxValue
        );
        this._maxValue = maxHistoricalValue;
    }

    /**
     * In a composite goal, we simply traverse its children.
     * @param goal - The composite goal being visited.
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void {
        // For a composite goal, recursively visit its sub-goals.
        goal.subGoals.forEach((subGoal) => subGoal.accept(this));
    }

    /**
     * In a leaf goal, if the metric is mapped there, add a candidate weight.
     * @param goal - The leaf goal being visited.
     */
    visitLeafGoal(goal: LeafGoal): Metric[] | void {
        if (goal.hasMetric(this.metric)) {
            // Candidate weight: the leaf goal’s weight divided by its number of metrics.
            const candidate = (goal.weight || 1) / (goal.metrics.size || 1);
            this.candidateWeights.push(candidate);
            // Compute a dependency multiplier for this candidate.
            const depMult = this.metric.accept(this);
            this.candidateDepMultipliers.push(depMult);
        }
    }

    /**
     * When visiting a composite metric, recursively compute the average dependency multiplier
     * of its children.
     */
    visitCompositeMetric(metric: CompositeMetric) {
        // If the composite has children, get the average multiplier from them.
        const childKeys = Object.keys(metric.children);
        let childMultiplier = 1;
        if (childKeys.length > 0) {
            // Recursively compute dependency multipliers for child metrics.
            const childMultipliers = childKeys.map(key => metric.children[key].accept(this));
            
            // Get the average multiplier from the child metrics
            childMultiplier = childMultipliers.reduce((sum, m) => sum + m, 0) / childMultipliers.length;
        }
        // Get dependency bonus (if available) for this metric.
        const dependencyBonus = this.dependencyBonus(metric);

        // Return the average child multiplier scaled by the dependencyBonus
        return dependencyBonus * childMultiplier;
    }

    /**
     * Check how many composite metrics in the current goal
     * depend on this metric and return a multiplier
     * (e.g., 1 plus 5% per dependent composite metric).
     * @param metric The metric whose goal metrics depend on it
     * @returns a multiplier for the metric's weight based on the dependencies
     */
    private dependencyBonus(metric: Metric) {
        // Count metrics in the current goal that list this metric as a child.
        const dependents = Array.from(this.goal.metrics).filter(
            (m) =>
                m.isComposite() &&
                (m as CompositeMetric).children.hasOwnProperty(metric.acronym)
        );

        // Increase its multiplier by 5%
        return 1 + dependents.length * 0.05;
    }

    /**
     * When visiting a leaf metric, check how many composite metrics in the current goal
     * depend on it and return a multiplier.
     */
    visitLeafMetric(metric: LeafMetric) {
        return this.dependencyBonus(metric);
    }

    /**
     * Traverses the selected goal’s subtree and combines the candidate weight values
     * and dependency multipliers to compute the final weight.
     */
    assignWeight(): number {
        // Clear any previous candidates.
        this.candidateWeights = [];
        this.candidateDepMultipliers = [];

        // Traverse the selected goal's subtree.
        this.goal.accept(this);

        // Initialize the final weight as the base weight
        let finalWeight: number = this.baseWeight;
        if (this.candidateWeights.length > 0) { // If we have multiple weight candidates
            const avgCandidate =
                this.candidateWeights.reduce((sum, w) => sum + w, 0) /
                this.candidateWeights.length;
            finalWeight = avgCandidate;
        }
        if (this.candidateDepMultipliers.length > 0) {  // If we have multiple dependency multiplier candidates
            const avgDep =
                this.candidateDepMultipliers.reduce((sum, d) => sum + d, 0) /
                this.candidateDepMultipliers.length;
            finalWeight *= avgDep;
        }
        return finalWeight;
    }
}