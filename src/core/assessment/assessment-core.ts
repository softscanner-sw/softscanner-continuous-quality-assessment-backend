import { UIFInterpreter, UIFMetric } from "../../modules/metrics/interaction-capability/user-engagement/activity/user-engagement-activity-metrics";
import { NCPVInterpreter, NCPVMetric, NoVInterpreter, NoVMetric, NUUInterpreter, NUUMetric } from "../../modules/metrics/interaction-capability/user-engagement/popularity/user-engagement-popularity-metrics";
import { ARTInterpreter, ARTMetric, TPUTInterpreter, TPUTMetric } from "../../modules/metrics/performance-efficiency/time-behavior/time-behavior-metrics";
import { ApplicationMetadata } from "../application/application-metadata";
import { Goal } from "../goals/goals";
import { Metric } from "../metrics/metrics-core";
import { MetricInterpreter } from "../metrics/metrics-interpreters";
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

    /**
   * Computes the final score for the goal using a given assessment strategy.
   * @param strategy - The assessment strategy used to compute the global score.
   */
    computeFinalScore(strategy: AssessmentStrategy) {
        this.globalScore = strategy.aggregate(this.assessments);
        this.timestamp = new Date().toISOString(); // Record the time of final score computation
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
   * Retrieves the appropriate metric interpreter for a given metric.
   * @param metric - The metric to be interpreted.
   * @param selectedGoals - The list of goals being assessed.
   * @returns An instance of the corresponding metric interpreter, or null if not found.
   */
    private getMetricInterpreter(metric: Metric, selectedGoals: Goal[]): MetricInterpreter | null {
        switch (metric.acronym.toLowerCase()) {
            /* USER ENGAGEMENT Metrics */
            /* ======================= */
            /* Activity Metrics */
            case "uif":
                return new UIFInterpreter(metric as UIFMetric, selectedGoals);
            
            // @TODO add cases for Click Depth Average (CDA) and Dwell Time Average (DTA)

            /* Loyalty Metrics */
            // @TODO add cases for Return Rate (RR) and Active Days (AD)

            /* Popularity Metrics */
            case "nuu":
                return new NUUInterpreter(metric as NUUMetric, selectedGoals);
            case "nov":
                return new NoVInterpreter(metric as NoVMetric, selectedGoals);
            case "ncpv":
                return new NCPVInterpreter(metric as NCPVMetric, selectedGoals);

            /* PERFORMANCE EFFICIENCY Metrics */
            /* ============================== */
            /* Time Behavior Metrics */
            case "art":
                return new ARTInterpreter(metric as ARTMetric, selectedGoals);
            case "tput":
                return new TPUTInterpreter(metric as TPUTMetric, selectedGoals);
            default:
                console.warn(`Assessment Engine: No interpreter available for metric: ${metric.name}`);
                return null;
        }
    }

    /**
   * Selects an assessment strategy based on the specified goals.
   * @param goals - The goals being assessed.
   * @returns An instance of the selected assessment strategy.
   */
    private getAssessmentStrategy(goals: Goal[]): AssessmentStrategy {
        // Dynamically select an assessment strategy (example logic)
        if (goals.some(goal => goal.name === "User Engagement")) {
            return new WeightedSumAssessmentStrategy();
        }
        // Add other strategies as needed
        return new WeightedSumAssessmentStrategy(); // Default
    }

    /**
   * Assesses a list of quality goals based on the computed metrics.
   * @param goals - The goals to be assessed.
   * @param computedMetrics - The metrics computed from telemetry data.
   * @returns A list of assessments for each goal.
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
                    assessment.addAssessment(metric.acronym, value, weight, new Date().toISOString());
                } else {
                    console.warn(`Assessment Engine: No interpreter available for metric: ${metric.name}`);
                }
            });

            assessment.computeFinalScore(strategy);
            return assessment;
        });
    }
}