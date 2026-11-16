import { ApplicationMetadata } from '../core/application/application-metadata';
import { Goal } from '../core/goals/goals';
import { AssessmentCycleEvent } from '../services/quality-assessment.service';

/**
 * Builds the payload of an assessment-stream (SSE) message for a completed assessment cycle.
 * The payload shape read by the dashboard (metadata, selectedGoals[].metrics/assessments) is unchanged;
 * `cycle` and the additional record fields (status, cycle, normalization, raw values, benchmarks) are additive.
 */
export function buildAssessmentEventData(metadata: ApplicationMetadata, goals: Goal[], event: AssessmentCycleEvent) {
    return {
        metadata,
        cycle: event,
        selectedGoals: goals.map(goal => ({
            name: goal.name,
            description: goal.description,
            weight: goal.weight,
            parent: goal.parent,
            metrics: Array.from(goal.metrics).map(metric => ({
                name: metric.name,
                acronym: metric.acronym,
                description: metric.description,
                value: metric.value,
                unit: metric.unit,
                history: metric.history
            })),
            assessments: goal.assessments.map(assessment => ({
                timestamp: assessment.timestamp,
                globalScore: assessment.globalScore,
                status: assessment.status,
                cycle: assessment.cycle,
                normalization: assessment.normalization,
                details: assessment.assessments
            }))
        }))
    };
}
