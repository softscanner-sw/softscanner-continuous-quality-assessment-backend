import { CompositeCharacteristic, LeafCharacteristic } from "../../core/characteristics/characteristics-core";
import { CharacteristicsSelector } from "../../core/characteristics/characteristics-selection";
import { Metric } from "../../core/metrics/metrics-core";
import { MetricsMapper } from "../../core/metrics/metrics-mappers";
import { NUUMetric, UIFMetric } from "./ux-metrics";

/**
 * A concrete implementation of MetricsMapper for User Experience (UX) metrics.
 * This class specifically handles mapping of UX-related characteristics in the quality model
 * to their corresponding UX metrics.
 */
export class UXMetricsMapper extends MetricsMapper {
    constructor(selector: CharacteristicsSelector) {
        super(selector);
    }

    map(){
        this.selector.getSelectedCharacteristics().forEach(char => {
            this.visitCompositeCharacteristic(char as CompositeCharacteristic);
        });
    }

    visitCompositeCharacteristic(characteristic: CompositeCharacteristic): Metric[] | void {
        // If the characteristic is "Interaction Capability"
        if (characteristic.name === "Interaction Capability") {
            characteristic.characteristics.forEach(subCharacteristic => {
                // Find "User Engagement"
                if (subCharacteristic.name === "User Engagement") {
                    /* NUU */
                    const nuu = new NUUMetric(); // NUU
                    this._selectedMetrics.push(nuu); // add to selected metrics
                    subCharacteristic.metrics.push(nuu); // map to sub-characteristic

                    /* UIF */
                    const uif = new UIFMetric(); // UIF
                    this._selectedMetrics.push(uif); // add to selected metrics
                    subCharacteristic.metrics.push(uif); // map to sub-characteristic
                }
            });
        }
    }

    visitLeafCharacteristic(characteristic: LeafCharacteristic): void {
        // No operation for leaf characteristics
    }
}
