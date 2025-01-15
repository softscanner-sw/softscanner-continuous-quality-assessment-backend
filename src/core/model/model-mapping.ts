import { ISOIEC25010 } from "../../models/iso-iec-25010";
import { CompositeGoal, Goal } from "../goals/goals-core";
import { MetricsMapper } from "../metrics/metrics-mappers";

export class SSQMM {
    private _qualityModel: ISOIEC25010 = new ISOIEC25010();
    private _metricsMapper: MetricsMapper = new MetricsMapper();

    get qualityModel(): ISOIEC25010{
        return this._qualityModel;
    }

    get goals(): Goal[]{
        return this._qualityModel.goals;
    }

    constructor(){
        this.map();
    }

    private map(){
        this._qualityModel.goals.forEach(goal => {
            if (goal instanceof CompositeGoal)
                this._metricsMapper.visitCompositeGoal(goal)
            else
                this._metricsMapper.visitLeafGoal(goal);

        });
    }
}