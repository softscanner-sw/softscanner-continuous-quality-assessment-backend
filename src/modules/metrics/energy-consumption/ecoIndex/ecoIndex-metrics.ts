import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import { CompositeMetric, LeafMetric, Metric } from "../../../../core/metrics/metrics-core";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType, UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryWebTracingInstrumentationAdapter } from "../../../instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters";

/**
 * Metric: **Average Sessions per Visit (NoSv)**
 *
 * Computes the average number of sessions per visit.
 * It groups telemetry data by visit, counts unique sessions per visit, and averages these values.
 *
 * **Unit:** `sessions/visit`
 * **Acronym:** `NoSv`
 * **Required Telemetry:** `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoVMetric}
 */
export class HTTPNbMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "HTTP requete number",
            "HTTP requete number",
            "HTTP number",
            "HTTPNb",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }

    /**
     * Computes the value for **Average Sessions per Visit (NoSv)**.
     * 
     * It initializes the visit-to-sessionCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of sessions for all visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of sessions and number of visits to compute NoSv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of sessions per visit.
     */
    computeValue(telemetryData: any[]): number {
        const navigationTraces = telemetryData.filter(data =>
            data.name?.startsWith("Navigation: ")
        );

        const httpTraces = telemetryData.filter(data =>
            data.attributes["http.method"]
        );

        if (navigationTraces.length === 0) {
            this._value = 0;
            return this._value;
        }

        let totalHttpRequests = 0;

        for (const navTrace of navigationTraces) {
            const path = navTrace.name?.split("Navigation: ")[1];
            const navStart = navTrace.startTime?.[0];

            if (!navStart || !path) continue;

            const count = httpTraces.filter(httpTrace =>
                httpTrace.startTime?.[0] === navStart &&
                httpTrace.attributes["http.url"]?.includes(path)
            ).length;

            totalHttpRequests += count;
        }

        // Moyenne des requêtes par navigation
        this._value = totalHttpRequests / navigationTraces.length;

        return this._value;
    }


    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `NoSvInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSvInterpreter}.
     */
    getInterpter(goal: Goal): HTTPNbInterpreter {
        return new HTTPNbInterpreter(this, goal);
    }
}
/**
 * Interpreter for the **Average Sessions per Visit (NoSv)** metric.
 *
 * Normalizes the computed value using a benchmark (10 sessions/visit, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSvMetric}
 */
export class HTTPNbInterpreter extends MetricInterpreter {
    constructor(
        metric: HTTPNbMetric,
        goal: Goal,
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class DomMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Dom size average",
            "Dom size average",
            "Dom size",
            "Dom",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }

    /**
     * Computes the value for **Average Sessions per Visit (NoSv)**.
     * 
     * It initializes the visit-to-sessionCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of sessions for all visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of sessions and number of visits to compute NoSv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of sessions per visit.
     */
    computeValue(telemetryData: any[]): number {
        const urlDomMap = new Map<string, number>();

        for (const trace of telemetryData) {
            // Ignorer les traces HTTP
            if (trace.attributes["http.method"]) continue;

            const url = trace.attributes["http.url"];
            const domValue = trace.attributes["app.dom.element"];

            if (url && typeof domValue === "number") {
                // Si l'URL est déjà vue, garder le maximum
                if (urlDomMap.has(url)) {
                    const currentMax = urlDomMap.get(url)!;
                    urlDomMap.set(url, Math.max(currentMax, domValue));
                } else {
                    urlDomMap.set(url, domValue);
                }
            }
        }

        const values = Array.from(urlDomMap.values());

        this._value = values.length > 0
            ? values.reduce((sum, val) => sum + val, 0) / values.length
            : 0;

        return this._value;
    }



    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `NoSvInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSvInterpreter}.
     */
    getInterpter(goal: Goal): DomInterpreter {
        return new DomInterpreter(this, goal);
    }
}
/**
 * Interpreter for the **Average Sessions per Visit (NoSv)** metric.
 *
 * Normalizes the computed value using a benchmark (10 sessions/visit, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSvMetric}
 */
export class DomInterpreter extends MetricInterpreter {
    constructor(
        metric: DomMetric,
        goal: Goal,
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class WeightMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Dom size average",
            "Dom size average",
            "Dom size",
            "Dom",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

    }

    /**
     * Computes the value for **Average Sessions per Visit (NoSv)**.
     * 
     * It initializes the visit-to-sessionCount map.
     * Then, it populates this map using the provided telemetry.
     * Then, it uses the map to compute the total number of sessions for all visits.
     * Afterwards, it computes the number of visits using the `NoV` metric.
     * Finally, it uses the total number of sessions and number of visits to compute NoSv.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of sessions per visit.
     */
    computeValue(telemetryData: any[]): number {
        // Liste pour stocker les URLs uniques
        const urls: string[] = [];

        // Variable pour cumuler la somme des longueurs de réponse
        let totalContentLength = 0;

        // Parcourir les traces de télémétrie
        telemetryData.forEach((trace) => {
            // Vérifier si la trace est de type "resourceFetch" et contient les informations nécessaires
            if (trace.name === "resourceFetch" && trace.attributes["http.url"] && trace.attributes["http.response_content_length"]) {
                const url = trace.attributes["http.url"];
                const responseContentLength = parseInt(trace.attributes["http.response_content_length"], 10);

                // Si l'URL n'est pas déjà dans la liste, l'ajouter et cumuler la taille de la réponse
                if (!urls.includes(url)) {
                    urls.push(url);
                    totalContentLength += responseContentLength;
                }
            }
        });

        // Calculer la moyenne
        const urlCount = urls.length;

        // Retourner la moyenne
        if (urlCount === 0) {
            return 0;  // Si aucune donnée n'a été trouvée, retourner 0
        }
        this._value = totalContentLength / urlCount;
        return this._value;
    }




    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
        this._value = 0;
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `NoSvInterpreter` to interpret this metric for the provided goal.
     * @see {@link NoSvInterpreter}.
     */
    getInterpter(goal: Goal): WeightInterpreter {
        return new WeightInterpreter(this, goal);
    }
}
/**
 * Interpreter for the **Average Sessions per Visit (NoSv)** metric.
 *
 * Normalizes the computed value using a benchmark (10 sessions/visit, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link NoSvMetric}
 */
export class WeightInterpreter extends MetricInterpreter {
    constructor(
        metric: WeightMetric,
        goal: Goal,
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

/**
 * Metric: **User Interaction Frequency per User (UIFu)**
 *
 * Computes the average number of user interactions with the target instrumented application per user.
 * Its value is computed from user interaction traces
 * by dividing the total number of user interactions by the number of unique users.
 *
 * **Unit**: `interactions/user`
 * **Acronym**: `UIFu`
 * **Required Telemetry**: `TRACING`
 * 
 * @requires {@link OpenTelemetryWebTracingInstrumentationAdapter}
 * @requires {@link TelemetryType}
 * @see {@link NoUMetric}
 */
export class EcoindexMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "Econdex calcul",
            "Econdex calcul",
            "Econdex calcul",
            "Econdex",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "Dom": new DomMetric(),
            "HTTPNb": new HTTPNbMetric(),
            "Weight": new WeightMetric(),

        }
    }

    /**
     * Computes the value for **User Interaction Frequency per User (UIFu)**.
     * 
     * It retireves the array of events considered for user interaction.
     * It then uses this array to compute the total number of interactions from the telemetry data.
     * Afterwards, it computes the number of users using the `NoU` metric.
     * Finally, it uses the total number of interactions and number of users to compute UIFu.
     * 
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The rate of user interactions per user.
     */
    computeValue(telemetryData: any[]): number {
        const Dom = this.children["Dom"].computeValue(telemetryData);
        const HTTPNb = this.children["HTTPNb"].computeValue(telemetryData);
        const Weight = this.children["Weight"].computeValue(telemetryData);
        this._value = (3 * Dom + 2 * HTTPNb + Weight) / 6
        return this._value;
    }

    /**
     * Resets the metric value to its initial state.
     */
    resetValue(): void {
        super.resetValue();
    }

    /**
     * Returns a new interpreter for this metric for the provided goal.
     * @param goal - The goal in the context of which the metric is interpreted.
     * @returns - An instance of `UIFuInterpreter` to interpret this metric for the provided goal.
     * @see {@link UIFuInterpreter}.
     */
    getInterpter(goal: Goal): EcoindexInterpreter {
        return new EcoindexInterpreter(this, goal);
    }
}

/**
 * Interpreter for the **User Interaction Frequency per User (UIFu)** metric.
 *
 * Normalizes the computed value using a benchmark (500 interactions/user, by default)
 * and assigns a weight (0.3, by default) based on the selected goals.
 * 
 * @see {@link UIFuMetric}
 */
export class EcoindexInterpreter extends MetricInterpreter {
    constructor(
        metric: EcoindexMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/user
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, baseWeight);
    }
}

/**
 * This class is responsible for mapping the `Performance Efficiency -> Time Behavior`
 * goal to its corresponding metrics:
 * 
 * 1. **Number of HTTP Requests (NHR)**;
 * 2. **Average Response Time (ART)**;
 * 3. **95th Percentile Response Time (P95RT)**;
 * 4. **Response Time Variability (RTVar)**;
 * 5. **Latency Performance Index (LPI)**;
 * 6. **Throughput (TPUT)**.
 * 
 * @see classes {@link NHRMetric}, {@link ARTMetric}, {@link P95RTMetric}, {@link RTVarMetric},
 * {@link LPIMetric}, and {@link TPUTMetric} and {@link IpMetric}
 */
export class EcoIndexMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('frontend')) {
            this.metrics.push(
                new HTTPNbMetric(),
                new DomMetric(),
                new WeightMetric(),
                new EcoindexMetric(),

            );
        }
    }

    /**
     * Maps the `Performance Efficiency -> Time Behavior` goal to its metrics:
     * 
     * 1. **Number of HTTP Requests (NHR)**;
     * 2. **Average Response Time (ART)**;
     * 3. **95th Percentile Response Time (P95RT)**;
     * 4. **Response Time Variability (RTVar)**;
     * 5. **Latency Performance Index (LPI)**;
     * 6. **Throughput (TPUT)**.
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Time Behavior".
     * @see classes {@link NHRMetric}, {@link ARTMetric}, {@link P95RTMetric}, {@link RTVarMetric},
     * {@link LPIMetric}, and {@link TPUTMetric}
     */
    map(goal: Goal): void {
        if (goal.name !== "EcoIndex") {
            throw new Error(`EcoIndex Mapper: Incorrect mapper for goal ${goal.name}`);
        }

        // Set overall weight for "Time Behavior"
        goal.weight = 1 / 3;

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}