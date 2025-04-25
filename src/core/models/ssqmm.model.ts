import { ApplicationMetadata } from "../application/application-metadata";
import { CompositeGoal, Goal, GoalMapper, GoalVisitor, LeafGoal } from "../goals/goals";
import { Metric } from "../metrics/metrics-core";
import { MetricsMapper } from "../metrics/metrics-mappers";
import { ISOIEC25010 } from "./iso-iec-25010.model";

/**
 * Represents the SoftScanner Quality Mapping Model (SSQMM).
 * It integrates the ISO/IEC 25010 quality model and maps goals to corresponding metrics.
 */
export class SSQMM implements GoalVisitor, GoalMapper {
    private _qualityModel: ISOIEC25010 = new ISOIEC25010();
    private _metricsMapper?: MetricsMapper;

    constructor(public appMetadata?: ApplicationMetadata) {
        if (appMetadata)
            this._metricsMapper = new MetricsMapper(appMetadata);
    }

    /**
     * Gets the current quality model (ISO/IEC 25010).
     */
    get qualityModel(): ISOIEC25010 {
        return this._qualityModel;
    }

    /**
     * Gets all goals defined in the quality model.
     */
    get goals(): Goal[] {
        return this._qualityModel.goals;
    }

    /**
     * Maps each goal in the quality model to its corresponding metrics.
     */
    buildMap() {
        this._qualityModel.goals.forEach(goal => this.map(goal));
    }

    /**
     * Maps the goal to the right method of the metrics mapper
     * @param goal The goal to map to its metrics
     */
    map(goal: Goal) {
        goal.accept(this);
    }


    /**
     * Visits the composite goal by delegating the visit to the metrics mapper.
     * @param goal The composite goal to visit using the metrics mapper's composite visit.
     * @returns The metrics mapped to the composite goal.
     */
    visitCompositeGoal(goal: CompositeGoal): Metric[] | void {
        return this._metricsMapper!.visitCompositeGoal(goal);
    }

    /**
     * Visits the leaf goal by delegating the visit to the metrics mapper.
     * @param goal The leaf goal to visit using the metrics mapper's leaf visit
     * @returns The metrics mapped to the leaf goal.
     */
    visitLeafGoal(goal: LeafGoal): Metric[] | void {
        this._metricsMapper!.visitLeafGoal(goal);
    }
}