import { UserEngagementMapper } from "../../modules/metrics/user-engagement/user-engagement-metrics";
import { CompositeGoal, GoalVisitor, LeafGoal } from "../goals/goals";
import { GoalMapper, Metric } from "./metrics-core";

/**
 * Defines the interface for a metrics mapper, capable of visiting goals
 * within a quality model and mapping them to corresponding metrics based on
 * user selection and the application's operational context.
 */
export class MetricsMapper implements GoalVisitor {
    protected _mapper?: GoalMapper;

    visitCompositeGoal(goal: CompositeGoal): Metric[] | void {
        goal.subGoals.forEach(subGoal => subGoal.accept(this));
        goal.subGoals.forEach(subGoal => goal.metrics.push(...subGoal.metrics));
    }

    visitLeafGoal(goal: LeafGoal): Metric[] | void {
        switch (goal.name) {
            case "User Engagement":
                this._mapper = new UserEngagementMapper();
                break;
            default:
                this._mapper = undefined;
        }

        this._mapper?.map(goal);
    }
}