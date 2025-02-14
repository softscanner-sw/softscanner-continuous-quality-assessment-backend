import { UserEngagementMapper } from "../../modules/metrics/user-engagement/user-engagement-metrics";
import { CompositeGoal, GoalVisitor, LeafGoal } from "../goals/goals";
import { GoalMapper, Metric } from "./metrics-core";

/**
 * Class responsible for mapping goals to corresponding metrics.
 * Implements the `GoalVisitor` interface to traverse goals and associate them with metrics.
 */
export class MetricsMapper implements GoalVisitor {
    protected _mapper?: GoalMapper;

    /**
     * Visits a composite goal and recursively visits its sub-goals.
     * @param goal - The composite goal to visit.
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void {
        goal.subGoals.forEach(subGoal => subGoal.accept(this));
        goal.subGoals.forEach(subGoal => goal.metrics.push(...subGoal.metrics));
    }

    /**
     * Visits a leaf goal and maps it to specific metrics based on the goal's name.
     * @param goal - The leaf goal to visit.
     */
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