import { Goal } from "../../../../../core/goals/goals";
import { GoalMapper } from "../../../../../core/metrics/metrics-core";

/**
 * Represents the **Active Days (AD)** metric.
 * This metric calculates **the number of days a user visited the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 */
// @TODO implement and identify what telemetry is required

/**
 * Provides interpretation logic for the **Active Days (AD)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `<@TODO>` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `<@TODO>` is used for the dynamic interpretation logic.
 */
// @TODO

/**
 * Represents the **Return Rate (RR)** metric.
 * This metric calculates **the number of times a user visited the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 */
// @TODO implement and identify what telemetry is required

/**
 * Provides interpretation logic for the **Return Rate (RR)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `<@TODO>` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `<@TODO>` is used for the dynamic interpretation logic.
 */
// @TODO

/**
 * Represents the **Dwell Time Loyalty (DTL)** metric.
 * This metric calculates **the average time a user spent on the app**
 * to measure `Interaction Capability -> User Engagement -> Loyalty`.
 */
// @TODO implement and identify what telemetry is required

/**
 * Provides interpretation logic for the **Dwell Time Loyalty (DTL)** metric.
 * This class assigns a weight to the metric based on the selected goals.
 * A default weight of `<@TODO>` is assigned in case no goals are selected.
 * An initial hardcoded max value for normalization of `<@TODO>` is used for the dynamic interpretation logic.
 */
// @TODO

/**
 * This class is responsible for mapping the `Interaction Capability -> User Engagement -> Loyalty`
 * goal to its corresponding metrics:
 * 1. **Active Days (AD)**
 * 2. **Return Rate (RR)**
 * 3. **Dwell Time Loyalty (DTL)**.
 */
export class LoyaltyMapper implements GoalMapper {

    /**
     * Maps the `Interaction Capability -> User Engagement -> Loyalty` goal to its metrics (AD, RR, and DTL).
     * @param goal The goal to map.
     * @throws An error if the goal is not "Loyalty".
     */
    map(goal: Goal) {
        if (goal.name !== "Loyalty")
            throw new Error(`Loyalty Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Loyalty"
        goal.weight = 0.25;
        goal.metrics.push(
            // @TODO include ADMetric implementation
            // @TODO include RRMetric implementation
            // @TODO include DTLMetric implementation
        );
    }
}