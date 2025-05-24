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


    export class UnauthenticatedSQLModificationMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Unauthenticated SQL Modifications",
            "Ratio of modifying SQL queries executed without authentication",
            "security/integrity",
            "SA",
            [TelemetryType.TRACING]
        );
    }

    computeValue(telemetryData: any[]): number {
        const modifyingCommands = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER"];
        let totalModifyingQueries = 0;
        let unauthModifyingQueries = 0;

        telemetryData.forEach((data) => {
            const sql = data.attributes["db.statement"]?.toUpperCase() || "";

            const isModifyingQuery = modifyingCommands.some(cmd => sql.includes(cmd));
            const isAuthenticated = !!(data.attributes["app.user.id"]);

            const httpStatus = data.attributes["http.status_code"];
            const isRejected = httpStatus === 401 || httpStatus === 403;

            if (isModifyingQuery) {
                totalModifyingQueries++;
                if (!isAuthenticated || isRejected) {
                    unauthModifyingQueries++;
                }
            }
        });

        this._value = totalModifyingQueries === 0 ? 0 : unauthModifyingQueries / totalModifyingQueries;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new UnauthenticatedSQLModificationMetricInterpreter(this, goal);
    }
}

export class UnauthenticatedSQLModificationMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: UnauthenticatedSQLModificationMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class ScanAPIMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Scan API Login",
            "Number of supposed tentative of API scan (high 404 ratio or high endpoint diversity)",
            "security/confidentiality",
            "SA",
            [TelemetryType.TRACING]
        );
    }

    computeValue(telemetryData: any[]): number {
        let requestsByIp: { [ip: string]: { count: number, errors404: number, targets: Set<string> } } = {};

        telemetryData.forEach((data) => {
            const ip = data.attributes["net.host.ip"] || "unknown";
            const status = data.attributes["http.status_code"];
            const target = data.attributes["http.target"] || "unknown";

            if (!requestsByIp[ip]) {
                requestsByIp[ip] = { count: 0, errors404: 0, targets: new Set<string>() };
            }

            requestsByIp[ip].count++;
            if (status === 404) {
                requestsByIp[ip].errors404++;
            }
            requestsByIp[ip].targets.add(target);
        });

        let susIP = 0;
        let totalIP = Object.keys(requestsByIp).length;

        for (const ip in requestsByIp) {
            const { count, errors404, targets } = requestsByIp[ip];

            if (count > 10 && (errors404 / count > 0.5 || targets.size > 20)) {
                susIP++;
            }
        }
        this._value = totalIP === 0 ? 0 : susIP / totalIP;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new ScanAPIMetricInterpreter(this, goal);
    }
}

export class ScanAPIMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: ScanAPIMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class XSSMetric extends LeafMetric {

    _value: number = 0;

    constructor(
    ) {
        super(
            "XSS injection",
            "Number of xss injection",
            "security/confidentiality",
            "SA",
            [TelemetryType.TRACING]
        );

    }
    computeValue(telemetryData: any[]): number {
        const suspiciousPatterns = ["<script", "%3Cscript", "onerror=", "javascript:"];
        let totalRequest = 0;
        let xssRequest = 0;

        for (const data of telemetryData) {
            const target = data.attributes?.["http.target"];
            if (typeof target !== "string") continue;

            totalRequest++;

            const hasXSSPattern = suspiciousPatterns.some(pattern =>
                target.toLowerCase().includes(pattern)
            );

            if (hasXSSPattern) {
                xssRequest++;
            }
        }

        this._value = totalRequest === 0 ? 0 : xssRequest / totalRequest;
        return this._value;

    }

    getInterpter(goal: Goal): any {
        return new XSSMetricInterpreter(this,goal);
    }
}

export class XSSMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: XSSMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class AuthRefusedMetric extends LeafMetric {
    _value: number = 0;
    constructor(
    ) {
        super(
            "XSS injection",
            "Number of xss injection",
            "security/confidentiality",
            "SA",
            [TelemetryType.TRACING]
        );

    }
    computeValue(telemetryData: any[]): number {
        let totalRequest = 0;
        let authrefusedRequest = 0;
        telemetryData.forEach((data) => {
            totalRequest++;
            if(data.attributes["http.target"]){
                if (data.attributes["http.status_code"] == 401 || data.attributes["http.status_code"] == 403) {
                    authrefusedRequest ++;
                }
            }
        })
        this._value = totalRequest === 0 ? 0 :authrefusedRequest/totalRequest;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new AuthRefusedMetricInterpreter(this,goal);
    }
}

export class AuthRefusedMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: AuthRefusedMetric,
        goal: Goal,
        initialMaxValue: number = 0,
        baseWeight = 1
    ) {
        super(metric, goal, initialMaxValue, baseWeight);
    }
}

export class SQLInjectionMetric extends LeafMetric {
    _value: number = 0;
    constructor(
    ) {
        super(
            "SQL injection",
            "Number of sql injection",
            "security/confidentiality",
            "SA",
            [TelemetryType.TRACING]
        );

    }
    computeValue(telemetryData: any[]): number {
        function isSuspicious(input: string): boolean {
            let suspiciousPatterns = [
                /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/,
                /--|#|\/\*/,
                /(;.*)/,
                /\b(UNION|SELECT|DROP|INSERT|DELETE|UPDATE|EXEC|XP_)\b.*\b(SELECT|FROM|WHERE)?/,
            ];
            return suspiciousPatterns.some(pattern => pattern.test(input));
        }

        let totalRequest = 0;
        let sqlInjectionRequest = 0;
        telemetryData.forEach((data) => {
            totalRequest++;
            if(data.attributes["db.statement"]){
                if (isSuspicious(data.attributes["db.statement"])) {
                    sqlInjectionRequest ++;
                }
            }
        })
        this._value = totalRequest === 0 ? 0 : sqlInjectionRequest/totalRequest;
        return this._value;
    }

    getInterpter(goal: Goal): any {
        return new SQLInjectionMetricInterpreter(this,goal);
    }
}

export class SQLInjectionMetricInterpreter extends MetricInterpreter {
    constructor(
        metric: SQLInjectionMetric,
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
        if (this.appMetadata.type.toLowerCase().includes('backend')) {
            this.metrics.push(
                /* User Interaction Frequency metrics */
                new XSSMetric(),
                new ScanAPIMetric(),
                new AuthRefusedMetric(),
                new SQLInjectionMetric(),
                new UnauthenticatedSQLModificationMetric(),
            );
        }
    }

    map(goal: Goal) {
        if (goal.name !== "Confidentiality")
            throw new Error(`Confidentiality Mapper: Incorrect Mapper for Goal ${goal.name}`);

        goal.weight = 0.3;

        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}