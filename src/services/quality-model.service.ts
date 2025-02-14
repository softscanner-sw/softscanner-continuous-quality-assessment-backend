import { CompositeGoal, Goal } from "../core/goals/goals";
import { Metric } from "../core/metrics/metrics-core";
import { SSQMM } from "../core/models/ssqmm.model";

/**
 * Service responsible for managing and interacting with the quality model.
 * Provides methods for extracting required metrics based on selected quality goals.
 */
export class QualityModelService {
    // Instance of SSQMM representing the quality model
    private _ssqmm: SSQMM = new SSQMM();

    /**
     * Getter for accessing the SSQMM instance.
     * @returns {SSQMM} The current quality model.
     */
    get ssqmm(): SSQMM {
        return this._ssqmm;
    }

    /**
     * Extracts the required metrics from the provided list of goals based on the selected goal names.
     * @param {Goal[]} goals - The list of goals to process (can contain composite and leaf goals).
     * @param {string[]} selectedGoals - The list of selected goal names.
     * @returns {Metric[]} An array of metrics required for the selected goals.
     */
    extractRequiredMetrics(goals: Goal[], selectedGoals: string[]): Metric[] {
        let metrics: Metric[] = [];

        goals.forEach(goal => {
            // Recursively process sub-goals for composite goals
            if (goal instanceof CompositeGoal)
                metrics.push(...this.extractRequiredMetrics(goal.subGoals, selectedGoals));

            // Collect metrics for leaf goals that match the selected goal names
            if (selectedGoals.includes(goal.name))
                metrics.push(...goal.metrics);
        });

        return metrics;
    }
}