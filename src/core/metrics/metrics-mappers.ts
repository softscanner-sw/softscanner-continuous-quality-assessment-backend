import { ActivityMapper } from "../../modules/metrics/interaction-capability/user-engagement/activity/user-engagement-activity-metrics";
import { LoyaltyMapper } from "../../modules/metrics/interaction-capability/user-engagement/loyalty/user-engagement-loyalty-metrics";
import { PopularityMapper } from "../../modules/metrics/interaction-capability/user-engagement/popularity/user-engagement-popularity-metrics";
import { TimeBehaviorMapper } from "../../modules/metrics/performance-efficiency/time-behavior/time-behavior-metrics";
import { ApplicationMetadata } from "../application/application-metadata";
import { CompositeGoal, GoalMapper, GoalVisitor, LeafGoal } from "../goals/goals";
import { Metric } from "./metrics-core";
import {ConfidentialityMapper} from "../../modules/metrics/security/confidentiality/security-confidentiality-metrics";

/**
 * Class responsible for mapping goals to corresponding metrics.
 * Implements the `GoalVisitor` interface to traverse goals and associate them with metrics.
 */
export class MetricsMapper implements GoalVisitor {
    protected _mapper?: GoalMapper;

    constructor(public appMetadata: ApplicationMetadata) { }

    /**
     * Visits a composite goal and recursively visits its sub-goals.
     * @param goal - The composite goal to visit.
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void {
        goal.subGoals.forEach(subGoal => subGoal.accept(this));
        goal.subGoals.forEach(subGoal => subGoal.metrics.forEach(metric => goal.metrics.add(metric)));
    }

    /**
     * Visits a leaf goal and maps it to specific metrics based on the goal's name.
     * @param goal - The leaf goal to visit.
     */
    visitLeafGoal(goal: LeafGoal): Metric[] | void {
        switch (goal.name.toLowerCase()) {
            /* USER ENGAGEMENT Leaf Goals */
            case "activity":
                this._mapper = new ActivityMapper(this.appMetadata);
                break;
            case "loyalty":
                this._mapper = new LoyaltyMapper(this.appMetadata);
                break;
            case "popularity":
                this._mapper = new PopularityMapper(this.appMetadata);
                break;
            /* PERFORMANCE EFFICIENCY Leaf Goals */
            case "time behavior":
                this._mapper = new TimeBehaviorMapper(this.appMetadata);
                break;
            case "confidentiality":
                this._mapper = new ConfidentialityMapper(this.appMetadata);
            default:
                this._mapper = undefined;
        }

        this._mapper?.map(goal);
    }
}