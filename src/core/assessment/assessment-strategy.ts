import { MetricAssessment } from "./assessment-core";

export interface AssessmentStrategy {
    aggregate(assessments: MetricAssessment[]): number;
}

export class WeightedSumAssessmentStrategy implements AssessmentStrategy {
    aggregate(assessments: MetricAssessment[]): number {
        let totalWeight = assessments.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
        let totalSum = assessments.reduce((sum, entry) => sum + entry.weight, 0);
        return totalWeight / totalSum;
    }
}
