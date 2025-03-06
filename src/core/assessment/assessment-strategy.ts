import { Assessment, AssessmentContext } from "./assessment-core";

/**
 * Abstract base class representing a strategy for aggregating metric assessments into a final score.
 */
export abstract class AssessmentStrategy {
    constructor(protected assessment: Assessment) { }

    /**
   * Aggregates a list of metric assessments to compute a final score.
   * @param assessmentContext - The assessment context
   * @returns The aggregated final score for in the goal's assessment
   */
    abstract aggregate(assessmentContext: AssessmentContext): number;
}

/**
 * Weighted sum strategy for aggregating metric assessments into a final score.
 * This strategy computes a weighted average of metric values.
 */
export class WeightedSumAssessmentStrategy extends AssessmentStrategy {
    constructor(assessment: Assessment) { 
        super(assessment) 
    }

    /**
   * Aggregates a list of metric assessments using a weighted sum formula.
   * @param assessments - The list of metric assessments.
   * @returns The computed weighted sum score.
   */
    aggregate(assessmentContext: AssessmentContext): number {
        let totalWeight = this.assessment.assessments.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
        let totalSum = this.assessment.assessments.reduce((sum, entry) => sum + entry.weight, 0);
        return totalSum > 0 ? totalWeight / totalSum : 0;  // Return 0 if totalSum is zero to avoid division by zero
    }
}
