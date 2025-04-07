import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import {CompositeMetric, LeafMetric, Metric} from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType, UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";
import {
    DTsMetric,
    DTuMetric, DTvMetric, NNCsMetric, NNCuMetric, NNCvMetric,
    UIFsMetric,
    UIFuMetric,
    UIFvMetric
} from "../../interaction-capability/user-engagement/activity/user-engagement-activity-metrics";


export class SuccessfulLoginMetric extends LeafMetric {

    _value: number = 0;

    constructor(
    ) {
        super(
            "Sucessful Login",
            "Number of successfull login",
            "security/confidentiality",
            "SL",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }
    computeValue(telemetryData: any[]): number {
        let totalSuccessfulConnexion = 0;
        telemetryData.forEach((data) => {
            if(data.attributes["http.route"] && data.attributes["http.status_code"]){
                if (data.attributes["http.status_code"]<400 && data.attributes["http.route"].includes("login")) {
                    totalSuccessfulConnexion ++;
                }
            }
        })
        this._value = totalSuccessfulConnexion;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new SuccessfulLoginMetricInterpreter(this,goal);
    }
}

export class SuccessfulLoginMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: SuccessfulLoginMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}


export class FailedLoginMetric extends LeafMetric {

    _value: number = 0;

    constructor(
        private _selectedEvents = ["login_success"],
    ) {
        super(
            "Failed Login",
            "number of failed login",
            "security/confidentiality",
            "FL",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }
    computeValue(telemetryData: any[]): number {
        let totalFailedConnexion = 0;
        telemetryData.forEach((data) => {
            if(data.attributes["http.route"] && data.attributes["http.status_code"]){
                if (!(data.attributes["http.status_code"]<400) && data.attributes["http.route"].includes("login")) {
                    totalFailedConnexion ++;
                }
            }
        })
        this._value = totalFailedConnexion;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new FailedLoginMetricInterpreter(this,goal);
    }
}

export class FailedLoginMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: FailedLoginMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}


export class FailedLoginPerSuccessfulMetric extends CompositeMetric {
    _value :number = 0;
    constructor(
        private _selectedEvent=["failed_connection","granted_connection"],) {
        super(
            "Failed Login per sucessfull connection",
            "number of failed login for each successfull connection",
            "security/confidentiality",
            "FLS",
            [TelemetryType.TRACING]
        );
        this.children = {
            "SL":new SuccessfulLoginMetric(),
            "FL" : new FailedLoginMetric()

        }
    }
    computeValue(telemetryData: any[]): number {
        let bruteForce = 0;
        let FLnb:number = this.children["FL"].computeValue(telemetryData);
        let SLnb:number = this.children["SL"].computeValue(telemetryData);
        bruteForce = FLnb/SLnb;
        return bruteForce;
    }

    getInterpter(goal: Goal): any {
        return new FailedLoginPerSuccessfulInterpreter(this,goal);
    }
}

export class FailedLoginPerSuccessfulInterpreter extends MetricInterpreter {
    constructor(
        metric: FailedLoginPerSuccessfulMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class NoIMetric extends LeafMetric{
    _value :number = 0;
    constructor() {
        super(
            "Number of IP",
            "Number of differents IPs ",
            "security/confidentiality",
            "BFU",
            [TelemetryType.TRACING]
        );
    }

    computeValue(data: any[]): any {
        const usersIp: { [userId: string]: number } = {};

        data.forEach((value) => {
            const userIp = value.attributes["http.client_ip"];
            usersIp[userIp] = (usersIp[userIp] || 0) + 1;
        })
    }

    getInterpter(goal: Goal): any {
        return new NoIInterpreter(this,goal);
    }
}

export class NoIInterpreter extends MetricInterpreter {
    constructor(
        metric: NoIMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }

}

export class BruteForcePerUserMetric extends CompositeMetric {
    _value :number = 0;
    constructor(private _selectedEvent=["login_failed","login_success"],) {
        super(
            "BruteForce per User",
            "number of failed login before a successfull for each user ",
            "security/confidentiality",
            "BFU",
            [TelemetryType.TRACING]
        );
        this.children = {"NoI":new NoIMetric()}
    }
    computeValue(telemetryData: any[]): number {
        const failedConnexion: { [key: string]: number } = {};
        const successFullConnexion :{ [key: string]: number } = {};
        let bruteForce = 0;
        telemetryData.forEach(data=> {
            if (data.attribute["http.route"] && data.attribute["http.status_code"] && data.attribute["http.client_ip"]){
                if (data.attribute["http.route"].includes("/login")) {
                        if (data.attribute["http.status_code"]<400) {
                            successFullConnexion[data.attribute["http.client_ip"]] = (successFullConnexion[data.attribute["http.client_ip"]] || 0) + 1;
                        } else {
                            failedConnexion[data.attribute["http.client_ip"]] = (failedConnexion[data.attribute["http.client_ip"]] || 0) + 1;
                        }
                }
            }
        })
        Object.keys(failedConnexion).forEach((key) => {
            if (failedConnexion[key]>=10){
                if (Object.keys(successFullConnexion[key]).includes(key)) {
                    bruteForce++;
                }
            }
        })
        return bruteForce/this.children["NoI"].computeValue(telemetryData);
    }

    getInterpter(goal: Goal): any {
        return new BruteForcePerUserInterpreter(this,goal);
    }
}

export class BruteForcePerUserInterpreter extends MetricInterpreter {
    constructor(
        metric: BruteForcePerUserMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class TestMetric extends LeafMetric {

    _value: number = 0;

    constructor(
        private _selectedEvents: any[],
    ) {
        super(
            "Test",
            "Test",
            "test/test",
            "TEST",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }
    computeValue(telemetryData: any[]): number {
        // Récupérer les logs de connexions ratées
        // Regarder celles qui ont la même IP
        // Faire un taux de tentative de bruteforce ? jsp ptn de merde
        const selectedEventsStr = "";
        let totalFailedConnexion = 0;
        telemetryData
            .map(data => data.attributes["event_type"])
            .forEach(name => {
                if (selectedEventsStr.includes(name))
                    totalFailedConnexion++;
            });


        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new TestMetricInterpreter(this,goal);
    }
}

export class TestMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: TestMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}




export class ConfidentialityMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('frontend')) {
            this.metrics.push(
                /* User Interaction Frequency metrics */
                new BruteForcePerUserMetric(),
                new FailedLoginPerSuccessfulMetric(),
                new FailedLoginMetric(),
                new SuccessfulLoginMetric()
            );
        }
    }

    /**
     * Maps the `Interaction Capability -> User Engagement -> Activity` goal to its metrics:
     *
     * 1. **User Interaction Frequency per User (UIFu)**;
     * 2. **User Interaction Frequency per Visit (UIFv)**;
     * 3. **User Interaction Frequency per Session (UIFs)**;
     * 4. **Dwell Time per User (DTu)**;
     * 5. **Dwell Time per Visit (DTv)**;
     * 6. **Dwell Time per Session (DTs)**;
     * 7. **Navigation Clicks per User (NNCu)**;
     * 8. **Navigation Clicks per Visit (NNCv)**;
     * 9. **Navigation Clicks per Session (NNCs)**.
     *
     * @param goal The goal to map.
     * @throws An error if the goal is not "Activity".
     * @see classes {@link UIFuMetric}, {@link UIFvMetric}, {@link UIFsMetric},
     * {@link DTuMetric}, {@link DTvMetric}, {@link DTsMetric},
     * {@link NNCuMetric}, {@link NNCvMetric}, and {@link NNCsMetric}.
     */
    map(goal: Goal) {
        if (goal.name !== "Confidentiality")
            throw new Error(`Confidentiality Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Activity"
        goal.weight = 0.35;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}