import { ActivityMapper } from "../../modules/metrics/interaction-capability/user-engagement/activity/user-engagement-activity-metrics";
import { LoyaltyMapper } from "../../modules/metrics/interaction-capability/user-engagement/loyalty/user-engagement-loyalty-metrics";
import { PopularityMapper } from "../../modules/metrics/interaction-capability/user-engagement/popularity/user-engagement-popularity-metrics";
import { TimeBehaviorMapper } from "../../modules/metrics/performance-efficiency/time-behavior/time-behavior-metrics";
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
            /* USER ENGAGEMENT Leaf Goals */
            case "Activity":
                this._mapper = new ActivityMapper();
                break;
            case "Loyalty":
                this._mapper = new LoyaltyMapper();
                break;
            case "Popularity":
                this._mapper = new PopularityMapper();
                break;
            /* PERFORMANCE EFFICIENCY Leaf Goals */
            case "Time Behavior":
                this._mapper = new TimeBehaviorMapper();
                break;
            default:
                this._mapper = undefined;
        }

        this._mapper?.map(goal);
    }
}