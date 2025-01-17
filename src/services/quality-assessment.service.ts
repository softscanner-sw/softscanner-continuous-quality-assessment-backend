
import { ApplicationMetadata } from "../core/application/application-metadata";
import { ProgressTracker } from "./progress-tracker.service";
import { QualityModelService } from "./quality-model.service";

/**
 * Service to handle telemetry collection and storage and metric computation for quality assessment.
 */
export class QualityAssessmentService {
    private progressListener: ProgressTracker = new ProgressTracker();

    constructor() {
    }

    /**
         * Triggers the quality assessment process.
         * It starts by generating a configuration to establish a telemetry collector
         * based on the selected goals and application metadata.
         * It then extracts metrics to compute based on the selected goals and
         * application metadata.
         * Then, for every newly flushed telemetry data, it notifies the
         * metric computer to compute the new metric values
         * @param appMetadata The metadata of the application being instrumented.
         * @param selectedGoals The selected quality goals.
         */
    async assess(appMetadata: ApplicationMetadata, selectedGoals: string[]): Promise<void> {
        console.log('Starting assessment...');
        this.progressListener.notifyProgress('Starting assessment...');

        // Extract the required metrics from SSQMM based on the selected goals
        const modelService = new QualityModelService();
        const metrics = modelService.extractRequiredMetrics(modelService.ssqmm.goals, selectedGoals);

        console.log('Mapped Metrics:', metrics.map(metric => metric.name));

        // Check if metrics are available
        if (metrics.length === 0)
            throw new Error('No metrics found for the selected goals.');

        // @TODO we'll implement this later
    }
}