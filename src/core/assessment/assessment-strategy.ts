export interface AssessmentStrategy {
    aggregate(assessments: { metric: string; value: number, weight: number }[]): number;
}

export class WeightedSumAssessmentStrategy implements AssessmentStrategy {
    aggregate(assessments: { metric: string; value: number, weight: number }[]): number {
        let totalWeight = assessments.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
        let totalSum = assessments.reduce((sum, entry) => sum + entry.weight, 0);
        return totalWeight / totalSum;
    }
}
