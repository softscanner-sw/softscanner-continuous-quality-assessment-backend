import path from 'path';
import { AssessmentEngine } from "../core/assessment/assessment-core";
import { Goal } from "../core/goals/goals";
import { ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { Metric } from "../core/metrics/metrics-core";
import { TelemetryCollector } from "../core/telemetry/telemetry";
import { MetricsService } from "./metrics.service";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/**
 * Service to manage the telemetry collection, metric computation, and quality assessment process.
 */
export class QualityAssessmentService implements IProgressTrackable {
    /**
     * Engine responsible for performing assessments on quality goals using computed metrics.
     */
    private assessmentEngine: AssessmentEngine = new AssessmentEngine();

    /**
     * Listeners that will be notified when new assessments are available.
     * Each listener is a callback function that receives the updated list of goals.
     */
    private assessmentUpdateListeners: ((goals: Goal[]) => void)[] = [];

    /**
     * Service responsible for computing metrics from telemetry data.
     */
    private metricsService: MetricsService = new MetricsService();

    /**
     * Metadata about the application being instrumented, including its name, type, and bundle information.
     */
    private appInstrumentationMetadata?: ApplicationInstrumentationMetadata;

    /**
     * Collector responsible for gathering telemetry data from the instrumented application.
     */
    private collector?: TelemetryCollector;

    /**
     * List of quality goals selected for assessment. Each goal contains associated metrics and assessments.
     */
    private selectedGoals: Goal[] = [];

    /**
     * The progress tracker for reporting progress during the quality assessment process.
     * It is used to send updates about the different stages of assessment, such as metric computation and assessment completion.
     */
    private progressTracker!: ProgressTracker;

    constructor() {
        // Register a handler to process new metrics when they are computed by the MetricsService.
        this.metricsService.onMetricsUpdated(this.handleNewMetrics.bind(this));
    }

    /**
     * Sets the progress tracker for reporting progress during the quality assessment process.
     * @param progressTracker - An instance of the ProgressTracker.
     */
    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
        this.metricsService.setProgressTracker(progressTracker);
    }

    /**
     * Sets the context for the quality assessment process, including application instrumentation metadata,
     * selected goals, and the telemetry collector.
     * @param appInstrumentationMetadata - Metadata for the instrumented application.
     * @param goals - List of selected quality goals for assessment.
     * @param collector - The telemetry collector responsible for gathering telemetry data.
     */
    setContext(appInstrumentationMetadata: ApplicationInstrumentationMetadata, goals: Goal[], collector: TelemetryCollector) {
        this.appInstrumentationMetadata = appInstrumentationMetadata;
        this.selectedGoals = goals;
        this.collector = collector;
    }

    /**
     * Handles newly computed metrics by performing assessments and updating the associated quality goals.
     * @param metrics - The list of newly computed metrics.
     */
    private async handleNewMetrics(metrics: Metric[]) {
        if (!this.progressTracker) {
            throw new Error('Quality Assessment Service: Progress tracker not set in QualityAssessmentService.');
        }

        if (!this.selectedGoals || this.selectedGoals.length === 0) {
            console.warn('Quality Assessment Service: No goals set for assessment.');
            return;
        }

        this.progressTracker.notifyProgress('Quality Assessment Service: Computing new assessments...');
        console.log('Quality Assessment Service: Computing new assessments...');

        // Perform assessment for each goal using the newly computed metrics.
        const assessments = this.assessmentEngine.assess({ 
            metadata: this.appInstrumentationMetadata?.appMetadata!, 
            selectedGoals: this.selectedGoals 
        }, metrics);

        // Attach the computed assessments to the respective goals.
        this.selectedGoals.forEach(goal => {
            const assessment = assessments.find(a => a.goal.name === goal.name);
            if (assessment) {
                goal.addAssessment(assessment);  // Attach assessment to the goal
            }
        });

        // Store the assessments in the telemetry data source of the collector.
        const appInstrumentationMetadata = this.appInstrumentationMetadata;
        const bundleName = path.basename(appInstrumentationMetadata?.bundleName!);

        try {
            await this.collector?.storeAssessments(assessments, { appInstrumentationMetadata });
        } catch (error) {
            console.error(`Quality Assessment Service: Failed to store assessments in the collector's data source for bundle ${bundleName}`);
        }

        console.log(`Quality Assessment Service: Assessments stored in the collector's data source for bundle ${bundleName}`);

        // Notify listeners about the updated goals.
        this.notifyAssessmentUpdated(assessments.map(a => a.goal));
    }

    /**
     * Initiates the assessment process by computing metrics and assessing quality goals.
     * @returns A promise that resolves with the list of updated goals.
     */
    async assessQualityGoals(): Promise<Goal[]> {
        if (!this.progressTracker) {
            throw new Error('Quality Assessment Service: Progress tracker not set in QualityAssessmentService.');
        }

        if (!this.collector || this.selectedGoals.length === 0) {
            throw new Error("Quality Assessment Service: Collector or goals not set.");
        }

        this.progressTracker.notifyProgress('Quality Assessment Service: Starting quality goal assessment...');
        console.log('Quality Assessment Service: Starting quality goal assessment...');

        // Extract (unique) metrics associated with the selected goals.
        const metricSet = new Set<Metric>();
        this.selectedGoals.forEach(goal => goal.metrics.forEach(metric => metricSet.add(metric)));
        const selectedMetrics = Array.from(metricSet);

        // Compute the metrics using the metrics service.
        const computedMetrics = await this.metricsService.computeMetrics(this.collector, this.appInstrumentationMetadata!, selectedMetrics);

        // Perform assessments based on the computed metrics.
        const assessments = this.assessmentEngine.assess({ 
            metadata: this.appInstrumentationMetadata?.appMetadata!, 
            selectedGoals: this.selectedGoals 
        }, computedMetrics);

        // Attach assessments to the respective goals.
        this.selectedGoals.forEach(goal => {
            const assessment = assessments.find(a => a.goal.name === goal.name);
            if (assessment) {
                goal.addAssessment(assessment);  // Attach assessment to the goal
            }
        });

        // Store the assessments in the collector's telemetry data source.
        const appInstrumentationMetadata = this.appInstrumentationMetadata;
        const bundleName = path.basename(appInstrumentationMetadata?.bundleName!);

        try {
            await this.collector?.storeAssessments(assessments, { appInstrumentationMetadata });
        } catch (error) {
            console.error(`Quality Assessment Service: Failed to store assessments in the collector's data source for bundle ${bundleName}`);
        }

        console.log(`Quality Assessment Service: Assessments stored in the collector's data source for bundle ${bundleName}`);

        // Notify listeners about the updated goals.
        this.notifyAssessmentUpdated(this.selectedGoals);
        console.log('Quality Assessment Service: Quality goal assessment completed.');
        this.progressTracker.notifyProgress('Quality Assessment Service: Quality goal assessment completed.');
        return this.selectedGoals;
    }

    /**
     * Registers an event listener to notify when new assessments are available.
     * @param listener - The callback function to execute when assessments are updated.
     */
    onAssessmentUpdated(listener: (goals: Goal[]) => void): void {
        this.assessmentUpdateListeners.push(listener);
    }

    /**
     * Notifies all registered listeners about new assessments for the selected goals.
     * @param goals - The list of updated goals with new assessments.
     */
    private notifyAssessmentUpdated(goals: Goal[]): void {
        console.log('Quality Assessment Service: New assessments available, notifying listeners...');
        this.assessmentUpdateListeners.forEach(listener => listener(goals));
    }
}