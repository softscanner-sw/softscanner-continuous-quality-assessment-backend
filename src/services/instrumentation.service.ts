import { ApplicationMetadata } from "../core/application/application-metadata";
import { BundleInjector } from "../core/instrumentation/instrumentation-bundle-injector";
import { InstrumentationManager } from "../core/instrumentation/instrumentation-manager";
import { ProgressTracker } from "./progress-tracker.service";
import { QualityModelService } from "./quality-model.service";

/**
 * Service to handle the instrumentation process.
 */
export class InstrumentationService {
    private progressTracker: ProgressTracker = new ProgressTracker();

    constructor(
        private _instrumentationManager: InstrumentationManager = new InstrumentationManager(),
        private _bundleInjector: BundleInjector = new BundleInjector()) {
    }

    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
    }

    /**
     * Triggers the instrumentation process.
     * It starts with extracting metrics from the selected goals and based on application metadata
     * to generate and inject instrumentation agents.
     * @param appMetadata The metadata of the application being instrumented.
     * @param selectedGoals The selected quality goals.
     * @returns the instrumentation bundle file name
     */
    async instrument(appMetadata: ApplicationMetadata, selectedGoals: string[]): Promise<string> {
        console.log('Instrumentation service: Starting instrumentation...');
        this.progressTracker.notifyProgress('Instrumentation service: Starting instrumentation...');

        // Extract the required metrics from SSQMM based on the selected goals
        const modelService = new QualityModelService();
        const metrics = modelService.extractRequiredMetrics(modelService.ssqmm.goals, selectedGoals);

        console.log('Instrumentation service: Mapped Metrics:', metrics.map(metric => metric.name));

        // Check if metrics are available
        if (metrics.length === 0)
            throw new Error('Instrumentation service: No metrics found for the selected goals.');

        // Generate instrumentation files based on the mapped metrics and retrieve the generated bundle
        this.progressTracker.notifyProgress('Instrumentation service: Generating instrumentation files...');
        const bundle = await this._instrumentationManager.generateInstrumentation(appMetadata, metrics);

        // Inject the retrieved bundle into the project
        this.progressTracker.notifyProgress('Instrumentation service: Injecting instrumentation bundle...');
        await this._bundleInjector.injectBundle(appMetadata, bundle);

        this.progressTracker.notifyProgress('Instrumentation service: Instrumentation bundle injection completed successfully!');
        console.log('Instrumentation service: Instrumentation bundle injection completed successfully!');
        return bundle.path!!;
    }
}