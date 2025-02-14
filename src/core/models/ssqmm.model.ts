import { CompositeGoal, Goal } from "../goals/goals";
import { MetricsMapper } from "../metrics/metrics-mappers";
import { ISOIEC25010 } from "./iso-iec-25010.model";

/**
 * Represents the SoftScanner Quality Mapping Model (SSQMM).
 * It integrates the ISO/IEC 25010 quality model and maps goals to corresponding metrics.
 */
export class SSQMM {
    private _qualityModel: ISOIEC25010 = new ISOIEC25010();
    private _metricsMapper: MetricsMapper = new MetricsMapper();

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

    constructor() {
        this.map();
    }

    /**
     * Maps each goal in the quality model to its corresponding metrics.
     */
    private map() {
        this._qualityModel.goals.forEach(goal => {
            if (goal instanceof CompositeGoal)
                this._metricsMapper.visitCompositeGoal(goal)
            else
                this._metricsMapper.visitLeafGoal(goal);

        });
    }
}