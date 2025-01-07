import { Characteristic, CompositeCharacteristic } from "../characteristics/characteristics-core";
import { UserGoal } from "../users-core";
import { TextProcessor } from "../util/text-processing";
import { StrategyCriteria } from "./model-selection";

/**
 * Interface for filtering characteristics within a model based on user goals.
 */
export interface ICharacteristicsFilteringStrategy<T> {
    filterCharacteristics(characteristics: Characteristic[], criteria: StrategyCriteria<T>): Characteristic[];
}

/**
 * Filters characteristics based on a list of provided characteristic names
 */
export class NameBasedFilteringStrategy implements ICharacteristicsFilteringStrategy<string[]> {
    public filterCharacteristics(characteristics: Characteristic[], criteria: StrategyCriteria<string[]>): Characteristic[] {
        let target: Characteristic[] = [];

        characteristics.forEach(char => {
            if (criteria.value.includes(char.name)){
                if (char instanceof CompositeCharacteristic){
                    const filteredSubCharacteristics = this.filterCharacteristics(char.characteristics, criteria);
                    char.clearCharacteristics();
                    filteredSubCharacteristics.forEach(filteredSub => char.addCharacteristic(filteredSub));
                }
                target.push(char);
            }
        });

        return target;
    }
}

/**
 * Filters characteristics based on a weight threshold.
 */
export class WeightBasedFilteringStrategy implements ICharacteristicsFilteringStrategy<UserGoal> {
    constructor(private threshold: number, private thresholdType: ThresholdType) {}

    public filterCharacteristics(characteristics: Characteristic[], criteria: StrategyCriteria<UserGoal>): Characteristic[] {
        // Assign a dynamic weight to characteristics based on criteria
        characteristics.forEach(char => {
            let score = 0;

            // Extracts keywords from the selected user goal by tokenizing and removing stop words
            const keywords = TextProcessor.extractKeywords(criteria.value.goal);

            // Check the characteristic's name for any matches from the list of keywords
            if (TextProcessor.matchesKeywords(keywords, char.name))
                score += 4; // great score

            // Check the characteristic's description for any matches from the list of keywords
            if (TextProcessor.matchesKeywords(keywords, char.description))
                score += 2; // good score

            char.weight = score / 2; // the weight is the total score divided by the number of checks

            // Repeat the process recursively if it's a composite characteristic
            if (char instanceof CompositeCharacteristic){
                const filteredSubCharacteristics = this.filterCharacteristics(char.characteristics, criteria);
                char.clearCharacteristics();
                filteredSubCharacteristics.forEach(filteredSub => char.addCharacteristic(filteredSub));

                // Compute the new weight of the composite characteristic
                // as the average of its weight summed with the weights of
                // its sub-characteristics
                const sum = filteredSubCharacteristics.reduce((weightAccumulator, subCharacteristic) => {
                    return weightAccumulator + subCharacteristic.weight;
                }, char.weight);
                char.weight = sum / (filteredSubCharacteristics.length + 1);
            }
        });

        // Filter characteristics based on the computed weights and the specified threshold
        return characteristics.filter(char => {
            switch(this.thresholdType){
                case ThresholdType.LOWER_INCLUDED:
                    return char.weight >= this.threshold;
                case ThresholdType.LOWER_EXCLUDED:
                    return char.weight > this.threshold;
                case ThresholdType.UPPER_INCLUDED:
                    return char.weight <= this.threshold;
                case ThresholdType.UPPER_EXCLUDED:
                    return char.weight < this.threshold;
            }
        });
    }
}

export enum ThresholdType {
    UPPER_EXCLUDED,
    UPPER_INCLUDED,
    LOWER_INCLUDED,
    LOWER_EXCLUDED
}