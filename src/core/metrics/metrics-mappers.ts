import { CompositeGoal, Goal, GoalVisitor, LeafGoal } from "../goals/goals-core";
import { TelemetryType } from "../instrumentation/instrumentation-core";
import { Metric } from "./metrics-core";
import { NUUMetric, UIFMetric } from "./user-engagement/metrics-user-engagement";

interface GoalMapper {
    map(goal: Goal): any
}

class UserEngagementMapper implements GoalMapper{
    map(goal: Goal) {
        if (goal.name !== "User Engagement")
            throw new Error(`Incorrect Mapper for Goal ${goal.name}`);

        const nuu = new NUUMetric();
        nuu.setRequiredTelemetry([TelemetryType.TRACING]); // mapping metric to observable data
        const uif = new UIFMetric(); 
        uif.setRequiredTelemetry([TelemetryType.TRACING]); // mapping metric to observable data

        goal.metrics.push(nuu, uif);
    }

}

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
        switch(goal.name){
            case "User Engagement":
                this._mapper = new UserEngagementMapper();
                break;
            default:
                this._mapper = undefined;
        }

        this._mapper?.map(goal);
    }
}