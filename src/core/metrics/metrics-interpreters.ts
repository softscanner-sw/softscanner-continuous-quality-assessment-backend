import { CompositeGoal, Goal, GoalVisitor, LeafGoal } from "../goals/goals";
import { MetricPolarity, semanticsOf } from "./metric-semantics";
import { CompositeMetric, LeafMetric, Metric, MetricVisitor } from "./metrics-core";

/**
 * Origin of the initial benchmark b0 of a metric:
 * - `configured-default`: a value set in the interpreter (a configuration default, not a validated reference);
 * - `definitional-bound`: the definitional maximum of a bounded value (ratio 1, percentage 100);
 * - `none`: no initial benchmark (b0 = 0); the benchmark is the largest value observed so far.
 */
export type BenchmarkKind = 'configured-default' | 'definitional-bound' | 'none';

/**
 * Result of the interpretation of one metric value.
 */
export interface MetricInterpretation {
    normalized: number;          // v in [0, 1]
    raw: number;                 // m, the computed metric value
    benchmark: number;           // b, the benchmark used for this interpretation
    initialBenchmark: number;    // b0
    benchmarkKind: BenchmarkKind;
    polarity: MetricPolarity;
    observed: boolean;           // false when the metric reported 0 qualifying observations
    observations?: number;
}

/**
 * Raised when a metric value or benchmark cannot be interpreted (non-finite value or benchmark).
 * Such a failure is an error of the assessment cycle; it is never turned into a score of 0.
 */
export class MetricInterpretationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MetricInterpretationError';
    }
}

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
         * The initial benchmark b0 used to normalize the metric value during interpretation.
         * When undefined, the definitional bound of the metric is used if it has one, otherwise 0 (none).
         */
        protected _maxValue?: number,

        /**
         * The base weight assigned by the interpreter for the metric during interpretation
         */
        protected baseWeight: number = 1,
    ) {
        const bound = semanticsOf(metric.acronym).bound;
        if (typeof _maxValue === 'number' && Number.isFinite(_maxValue) && _maxValue >= 0) {
            this.initialBenchmark = _maxValue;
            this.benchmarkKind = 'configured-default';
        } else if (typeof bound === 'number') {
            this.initialBenchmark = bound;
            this.benchmarkKind = 'definitional-bound';
        } else {
            this.initialBenchmark = 0;
            this.benchmarkKind = 'none';
        }
        this._maxValue = this.initialBenchmark;
    }

    /** The initial benchmark b0 of the metric. */
    readonly initialBenchmark: number;

    /** The origin of b0. */
    readonly benchmarkKind: BenchmarkKind;

    /** The polarity of the metric (see metric-semantics.ts). */
    get polarity(): MetricPolarity {
        return semanticsOf(this.metric.acronym).polarity;
    }

    /** False when the metric reported 0 qualifying observations in its last computation. */
    get observed(): boolean {
        const n = this.metric.observations;
        return n === undefined || n > 0;
    }

    /**
     * Returns the initial hardcoded maximum value for normalization
     */
    get maxValue(): any {
        return this._maxValue;
    }

    /**
     * Interprets the metric's value by normalizing it against its benchmark.
     * @param benchmark The benchmark b to use (resolved by the assessment cycle for its benchmark scope).
     *                  When omitted, b = max(b0, values in the metric's history) (behaviour before Pass 23).
     * @returns The normalized metric value in [0, 1].
     */
    interpret(benchmark?: number): number {
        return this.interpretDetailed(benchmark).normalized;
    }

    /**
     * Normalizes the metric value m against the benchmark b, taking the metric polarity into account:
     *
     *   r = min(1, max(0, m / b))                 if b > 0
     *   r = (m > 0 ? 1 : 0)                       if b = 0 (no benchmark and nothing observed above 0)
     *   v = r          for higher-is-better and unspecified metrics
     *   v = 1 - r      for lower-is-better metrics
     *   v = 0          when the metric reported 0 qualifying observations (no evidence), whatever its polarity
     *
     * With b = max(b0, largest m observed in the benchmark scope), m <= b and r = m / b, so higher-is-better
     * values are unchanged with respect to the previous v = m / b. Non-finite m or b raise
     * MetricInterpretationError.
     */
    interpretDetailed(benchmark?: number): MetricInterpretation {
        const raw = this.metric.value;
        if (typeof raw !== 'number' || !Number.isFinite(raw)) {
            throw new MetricInterpretationError(`Metric ${this.metric.acronym} has a non-finite value: ${raw}`);
        }

        let b: number;
        if (benchmark === undefined) {
            // Update the benchmark dynamically based on the metric's history (behaviour before Pass 23)
            this.updateMaxValue();
            b = this._maxValue!;
        } else {
            b = benchmark;
        }
        if (typeof b !== 'number' || !Number.isFinite(b) || b < 0) {
            throw new MetricInterpretationError(`Metric ${this.metric.acronym} has an invalid benchmark: ${b}`);
        }

        const polarity = this.polarity;
        const observed = this.observed;
        let normalized: number;
        if (!observed) {
            normalized = 0;
        } else {
            const r = b > 0 ? Math.min(1, Math.max(0, raw / b)) : (raw > 0 ? 1 : 0);
            normalized = polarity === 'lower-is-better' ? 1 - r : r;
        }

        return {
            normalized, raw, benchmark: b,
            initialBenchmark: this.initialBenchmark, benchmarkKind: this.benchmarkKind,
            polarity, observed, observations: this.metric.observations,
        };
    }

    /**
     * Updates the maximum value dynamically based on the metric's historical values.
     */
    private updateMaxValue(): void {
        const values = this.metric.history.map(entry => entry.value).filter(v => typeof v === 'number' && Number.isFinite(v));
        this._maxValue = Math.max(...values, this._maxValue ?? 0);
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