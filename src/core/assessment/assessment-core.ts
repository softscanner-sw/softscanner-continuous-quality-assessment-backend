import { ApplicationMetadata } from "../application/application-metadata";
import { Goal } from "../goals/goals";
import { BenchmarkResolution } from "../metrics/benchmarks";
import { Metric } from "../metrics/metrics-core";
import { BenchmarkKind } from "../metrics/metrics-interpreters";
import { MetricPolarity } from "../metrics/metric-semantics";
import { AssessmentStrategy, WeightedSumAssessmentStrategy } from "./assessment-strategy";

/**
 * Represents the result of an assessment for a quality goal.
 */
export class Assessment {
    goal: Goal;  // The goal being assessed
    assessments: MetricAssessment[];  // Collection of individual metric assessments
    globalScore: number;  // The overall score computed for the goal
    timestamp: string = '';  // Timestamp of when the assessment was computed
    status: 'completed' = 'completed';  // Only completed assessments are created; failed cycles produce no assessment
    cycle?: number;  // Number of the assessment cycle (1 = first telemetry flush)
    telemetryCount?: number;  // Number of telemetry items the metrics were computed from
    normalization?: NormalizationInfo;  // How the metric values were normalized

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
    addAssessment(metric: string, value: number, weight: number, timestamp: string, interpretation?: Omit<MetricAssessment, 'metric' | 'value' | 'weight' | 'timestamp'>) {
        this.assessments.push({ metric, value, weight, timestamp, ...(interpretation ?? {}) });
    }
}

/**
 * Represents an individual assessment result for a specific metric.
 */
export interface MetricAssessment {
    metric: string;  // The acronym of the assessed metric
    value: number;  // The normalized value of the metric, in [0, 1]
    weight: number;  // The weight assigned to the metric in the overall assessment
    timestamp: string;  // The timestamp of the assessment cycle
    rawValue?: number;  // The computed (raw) metric value m
    benchmark?: number;  // The benchmark b used for normalization
    initialBenchmark?: number;  // The initial benchmark b0
    benchmarkKind?: BenchmarkKind;  // Origin of b0
    polarity?: MetricPolarity;  // Direction used for normalization
    observed?: boolean;  // False when the metric had no qualifying observation (normalized value 0)
    observations?: number;  // Number of qualifying observations, when reported by the metric
}

/**
 * Describes how metric values were normalized in an assessment.
 */
export interface NormalizationInfo {
    method: 'ratio-to-benchmark';
    version: string;
    benchmarkMode: BenchmarkResolution['mode'] | 'legacy-history';
    benchmarkScope: string;
}

/**
 * Options of one assessment cycle.
 */
export interface AssessmentOptions {
    timestamp: string;  // One timestamp shared by all metric assessments and the goal assessment of the cycle
    cycle?: number;
    telemetryCount?: number;
    benchmarks?: Map<string, BenchmarkResolution>;  // Benchmark of each metric acronym
    normalization?: NormalizationInfo;
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
    assess(assessmentContext: AssessmentContext, computedMetrics: Metric[], options?: AssessmentOptions): Assessment[] {
        return assessmentContext.selectedGoals.map(goal => {
            const assessment = new Assessment(goal);
            const timestamp = options?.timestamp ?? new Date().toISOString();
            const goalMetrics = computedMetrics.filter(m => Array.from(goal.metrics).map(metric => metric.acronym)
                .includes(m.acronym));

            goalMetrics.forEach(metric => {
                const interpreter = metric.getInterpter(goal);
                if (interpreter) {
                    const benchmark = options?.benchmarks?.get(metric.acronym)?.benchmark;
                    if (options?.benchmarks && benchmark === undefined) {
                        throw new Error(`Assessment Engine: no benchmark resolved for metric ${metric.acronym}`);
                    }
                    const i = interpreter.interpretDetailed(benchmark);
                    const weight = interpreter.assignWeight();
                    assessment.addAssessment(metric.acronym, i.normalized, weight, timestamp, {
                        rawValue: i.raw, benchmark: i.benchmark, initialBenchmark: i.initialBenchmark, benchmarkKind: i.benchmarkKind,
                        polarity: i.polarity, observed: i.observed, observations: i.observations,
                    });
                } else {
                    console.warn(`Assessment Engine: No interpreter available for metric: ${metric.name}`);
                }
            });

            // Select the proper assessment strategy for the goal's assessment
            const strategy = this.getAssessmentStrategy(assessmentContext, assessment);

            // Compute the final assessment score for the goal and record the timestamp of computation
            assessment.globalScore = strategy.aggregate(assessmentContext);
            if (!Number.isFinite(assessment.globalScore)) {
                throw new Error(`Assessment Engine: non-finite score for goal ${goal.name}`);
            }
            assessment.timestamp = timestamp;
            assessment.cycle = options?.cycle;
            assessment.telemetryCount = options?.telemetryCount;
            assessment.normalization = options?.normalization;

            return assessment;
        });
    }
}