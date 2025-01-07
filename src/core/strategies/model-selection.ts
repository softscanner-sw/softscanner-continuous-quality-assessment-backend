import { QualityModel } from "../model/model-core";
import { UserGoal } from "../users-core";
import { TextProcessor } from "../util/text-processing";

/**
 * A generic type for criteria used by strategy algorithms
 */
export type StrategyCriteria<T> = {
    'name': string,
    'value': T
}

/**
 * Interface for model selection strategy based on selection strategy criteria.
 */
export interface IModelSelectionStrategy<T> {
    selectModel(models: QualityModel[], criteria: StrategyCriteria<T>): QualityModel | undefined;
}

/**
 * Selects the model whose purpose's content exactly includes the user goal
 */
export class UserGoalExactMatchSelectionStrategy implements IModelSelectionStrategy<UserGoal> {
    public selectModel(models: QualityModel[], criteria: StrategyCriteria<UserGoal>): QualityModel | undefined {
        return models.find(model => model.purpose?.includes(criteria.value.goal));
    }
}

/**
 * Selects the model whose purpose's content closely matches the user goal.
 */
export class UserGoalKeywordMatchSelectionStrategy implements IModelSelectionStrategy<UserGoal> {
    public selectModel(models: QualityModel[], criteria: StrategyCriteria<UserGoal>): QualityModel | undefined {
        // extracts keywords from the selected user goal by tokenizing and removing stop words
        const keywords = TextProcessor.extractKeywords(criteria.value.goal);
        
        // check the model's purpose for any matches from the list of keywords
        return models.find(model => TextProcessor.matchesKeywords(keywords, model.purpose));
    }
}