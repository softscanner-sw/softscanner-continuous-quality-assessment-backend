import { NUUInterpreter, NUUMetric, UIFInterpreter, UIFMetric } from "../../modules/metrics/user-engagement/user-engagement-metrics";
import { ApplicationMetadata } from "../application/application-metadata";
import { Goal } from "../goals/goals";
import { Metric } from "../metrics/metrics-core";
import { MetricInterpreter } from "../metrics/metrics-interpreters";
import { AssessmentStrategy, WeightedSumAssessmentStrategy } from "./assessment-strategy";

/**
 * Represents the result of an assessment for a quality goal.
 */
export class Assessment {
    goal: Goal;
    assessments: { metric: string, value: number, weight: number }[];
    globalScore: number;

    constructor(goal: Goal) {
        this.goal = goal;
        this.assessments = [];
        this.globalScore = 0;
    }

    /**
     * Adds an assessment entry with its computed value and weight.
     */
    addAssessment(metric: string, value: number, weight: number) {
        this.assessments.push({ metric, value, weight });
    }

    /**
     * Computes the final goal score using the provided assessment strategy.
     */
    computeFinalScore(strategy: AssessmentStrategy) {
        this.globalScore = strategy.aggregate(this.assessments);
    }
}

/**
 * Represents the assessment context storing metadata and selected goals.
 */
export interface AssessmentContext {
    metadata: ApplicationMetadata;
    selectedGoals: Goal[];
}

/**
 * Handles the process of assessing quality goals.
 */
export class AssessmentEngine {
    private getMetricInterpreter(metric: Metric, selectedGoals: Goal[]): MetricInterpreter | null {
        switch (metric.acronym) {
            case "NUU":
                return new NUUInterpreter(metric as NUUMetric, selectedGoals);
            case "UIF":
                return new UIFInterpreter(metric as UIFMetric, selectedGoals);
            default:
                console.warn(`No interpreter available for metric: ${metric.name}`);
                return null;
        }
    }

    private getAssessmentStrategy(goals: Goal[]): AssessmentStrategy {
        // Dynamically select an assessment strategy (example logic)
        if (goals.some(goal => goal.name === "User Engagement")) {
            return new WeightedSumAssessmentStrategy();
        }
        // Add other strategies as needed
        return new WeightedSumAssessmentStrategy(); // Default
    }

    /**
     * Assesses a list of quality goals based on computed metrics.
     */
    assessGoals(goals: Goal[], computedMetrics: Metric[]): Assessment[] {
        const strategy = this.getAssessmentStrategy(goals);

        return goals.map(goal => {
            const assessment = new Assessment(goal);
            const goalMetrics = computedMetrics.filter(m => goal.metrics.map(metric => metric.acronym).includes(m.acronym));

            goalMetrics.forEach(metric => {
                const interpreter = this.getMetricInterpreter(metric, goals);
                if (interpreter) {
                    const value = interpreter.interpret();
                    const weight = interpreter.assignWeight();
                    assessment.addAssessment(metric.acronym, value, weight);
                } else {
                    console.warn(`No interpreter found for metric: ${metric.acronym}`);
                }
            });

            assessment.computeFinalScore(strategy);
            return assessment;
        });
    }
}