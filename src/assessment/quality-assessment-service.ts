import { ApplicationMetadata } from "../core/application-core";
import { CompositeGoal, Goal } from "../core/goals/goals-core";
import { BundleInjector } from "../core/instrumentation/injection-management";
import { InstrumentationManager } from "../core/instrumentation/instrumentation-management";
import { Metric } from "../core/metrics/metrics-core";
import { SSQMM } from "../core/model/model-mapping";

/**
 * Service to handle the entire quality assessment process.
 */
export class QualityAssessmentService {
    private _ssqmm: SSQMM;
    private _instrumentationManager: InstrumentationManager;
    private _bundleInjector: BundleInjector;
    private progressListeners: ((message: string) => void)[] = [];

    constructor() {
        this._ssqmm = new SSQMM();
        this._instrumentationManager = new InstrumentationManager();
        this._bundleInjector = new BundleInjector();
    }

    get ssqmm(): SSQMM {
        return this._ssqmm;
    }

    public onProgress(listener: (message: string) => void) {
        this.progressListeners.push(listener);
    }

    private notifyProgress(message: string) {
        this.progressListeners.forEach(listener => listener(message));
    }

    /**
     * Triggers the entire quality assessment process, from mapping goals to generating and injecting instrumentation.
     * @param appMetadata The metadata of the application being assessed.
     * @param selectedGoals The selected quality goals.
     */
    public async performQualityAssessment(appMetadata: ApplicationMetadata, selectedGoals: string[]): Promise<void> {
        console.log('Starting quality assessment...');
        this.notifyProgress('Starting quality assessment...');

        // Map the selected goals to metrics using SSQMM
        const metrics = this.extractRequiredMetrics(this._ssqmm.goals, selectedGoals);

        console.log('Mapped Metrics:', metrics.map(metric => metric.name));

        // Check if metrics are available
        if (metrics.length === 0)
            throw new Error('No metrics found for the selected goals.');

        // Generate instrumentation files based on the mapped metrics and retrieve the generated bundle
        this.notifyProgress('Generating instrumentation files...');
        const bundle = await this._instrumentationManager.generateInstrumentation(appMetadata, metrics);

        // Inject the retrieved bundle into the project
        this.notifyProgress('Injecting instrumentation bundle...');
        await this._bundleInjector.injectBundle(appMetadata, bundle);

        this.notifyProgress('Instrumentation bundle injection completed successfully!');
        console.log('Instrumentation bundle injection completed successfully!');
    }

    extractRequiredMetrics(goals: Goal[], selectedGoals: string[]): Metric[] {
        let metrics: Metric[] = [];

        goals.forEach(goal => {
            if (goal instanceof CompositeGoal)
                metrics.push(...this.extractRequiredMetrics(goal.subGoals, selectedGoals));

            // Collect metrics for the current leaf goal
            if (selectedGoals.includes(goal.name))
                metrics.push(...goal.metrics);
        });

        return metrics;
    }
}
