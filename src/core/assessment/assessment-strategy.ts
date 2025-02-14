import { MetricAssessment } from "./assessment-core";

/**
 * Interface representing a strategy for aggregating metric assessments into a final score.
 */
export interface AssessmentStrategy {
    /**
   * Aggregates a list of metric assessments to compute a final score.
   * @param assessments - The list of metric assessments to aggregate.
   * @returns The aggregated final score.
   */
    aggregate(assessments: MetricAssessment[]): number;
}

/**
 * Weighted sum strategy for aggregating metric assessments into a final score.
 * This strategy computes a weighted average of metric values.
 */
export class WeightedSumAssessmentStrategy implements AssessmentStrategy {
    /**
   * Aggregates a list of metric assessments using a weighted sum formula.
   * @param assessments - The list of metric assessments.
   * @returns The computed weighted sum score.
   */
    aggregate(assessments: MetricAssessment[]): number {
        let totalWeight = assessments.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
        let totalSum = assessments.reduce((sum, entry) => sum + entry.weight, 0);
        return totalSum > 0 ? totalWeight / totalSum : 0;  // Return 0 if totalSum is zero to avoid division by zero
    }
}
