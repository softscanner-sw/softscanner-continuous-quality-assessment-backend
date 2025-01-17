import { CompositeGoal, Goal } from "../goals/goals-core";
import { Metric } from "../metrics/metrics-core";
import { SSQMM } from "./model-mapping";

export class QualityModelService {
    private _ssqmm: SSQMM = new SSQMM();

    get ssqmm(): SSQMM {
        return this._ssqmm;
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