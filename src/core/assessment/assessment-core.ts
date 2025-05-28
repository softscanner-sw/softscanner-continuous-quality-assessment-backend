import { ApplicationMetadata } from "../application/application-metadata";
import { Goal } from "../goals/goals";
import { Metric } from "../metrics/metrics-core";
import { AssessmentStrategy, WeightedSumAssessmentStrategy } from "./assessment-strategy";

/**
 * Represents the result of an assessment for a quality goal.
 */
export class Assessment {
    goal: Goal;  // The goal being assessed
    assessments: MetricAssessment[];  // Collection of individual metric assessments
    globalScore: number;  // The overall score computed for the goal
    timestamp: string = '';  // Timestamp of when the assessment was computed

    /**
     * Creates an assessment for the provided quality goal
     * @param goal The goal to be assessed
     */
    constructor(goal: Goal) {
        this.goal = goal;
        this.assessments = [];
        this.globalScore = 0;
    }

    /**
   * Adds an assessment entry with the given metric, its value, and weight.
   * @param metric - The name of the metric being assessed.
   * @param value - The computed value for the metric.
   * @param weight - The weight assigned to the metric in the assessment.
   * @param timestamp - The timestamp of when the assessment was made.
   */
    addAssessment(metric: string, value: number, weight: number, timestamp: string) {
        this.assessments.push({ metric, value, weight, timestamp });
    }
}

/**
 * Represents an individual assessment result for a specific metric.
 */
export interface MetricAssessment {
    metric: string;  // The name of the assessed metric
    value: number;  // The computed value for the metric
    weight: number;  // The weight assigned to the metric in the overall assessment
    timestamp: string;  // The timestamp when the metric was assessed
}

/**
 * Represents the context of an assessment, including the application metadata and selected goals.
 */
export interface AssessmentContext {
    metadata: ApplicationMetadata;  // Metadata about the application being assessed
    selectedGoals: Goal[];  // The goals selected for assessment
}

/**
 * Handles the process of assessing a set of quality goals.
 */
export class AssessmentEngine {
    /**
   * Selects an assessment strategy based on the specified goals.
   * @param goals - The goals being assessed.
   * @returns An instance of the selected assessment strategy.
   */
    private getAssessmentStrategy(assessmentContext: AssessmentContext, assessment: Assessment): AssessmentStrategy {
        // // Dynamically select an assessment strategy (example logic)
        // if (assessmentContext.selectedGoals.some(goal => goal.name === "User Engagement")) {
        //     return new WeightedSumAssessmentStrategy(assessment);
        // }

        return new WeightedSumAssessmentStrategy(assessment); // Default
    }

    /**
   * Assesses a list of quality goals based on the computed metrics.
   * @param assessmentContext - The assessment context containing application metadata and selected goals.
   * @param computedMetrics - The metrics computed from telemetry data.
   * @returns A list of assessments for each goal.
   */
    assess(assessmentContext: AssessmentContext, computedMetrics: Metric[]): Assessment[] {
        return assessmentContext.selectedGoals.map(goal => {
            const assessment = new Assessment(goal);
            const goalMetrics = computedMetrics.filter(m => Array.from(goal.metrics).map(metric => metric.acronym)
                .includes(m.acronym));

            goalMetrics.forEach(metric => {
                const interpreter = metric.getInterpter(goal);
                if (interpreter) {
                    const value = interpreter.interpret();
                    const weight = interpreter.assignWeight();
                    assessment.addAssessment(metric.acronym, value, weight, new Date().toISOString());
                } else {
                    console.warn(`Assessment Engine: No interpreter available for metric: ${metric.name}`);
                }
            });

            // Select the proper assessment strategy for the goal's assessment
            const strategy = this.getAssessmentStrategy(assessmentContext, assessment);

            // Compute the final assessment score for the goal and record the timestamp of computation
            assessment.globalScore = strategy.aggregate(assessmentContext);
            assessment.timestamp = new Date().toISOString();

            return assessment;
        });
    }
}