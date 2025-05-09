import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { LeafMetric, CompositeMetric, Metric } from "../../../../core/metrics/metrics-core";

export class IpMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average ip by span method",
            "Average number of ip per span method",
            "ip/method",
            "Ip",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Retrieve all traces with "http.method"

        const tracesWithHttpMethod = telemetryData.filter(data => data.attributes["http.method"]);
        // Calculate the average of traces that have both an HTTP method and an IP address
        let tracesWithIp = tracesWithHttpMethod.filter(data => data.attributes["net.peer.ip"]);

        let totalTraces = tracesWithHttpMethod.length;
        let tracesWithIpCount = tracesWithIp.length;

        // Calculate the average: traces with an HTTP method and an IP / total traces with an HTTP method
        let averageWithIp = tracesWithIpCount / totalTraces;

        this._value = tracesWithIpCount

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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link IpInterpreter}.
     */
    getInterpter(goal: Goal): IpInterpreter {
        return new IpInterpreter(this, goal);
    }
}
/**
 * Interpreter for the **Average Visits per User (NoVu)** metric.
 *
 * Normalizes the computed value using a benchmark (10 visits/user, by default)
 * and assigns a weight (0.4, by default) based on the selected goals.
 * 
 * @see {@link IpMetric}
 */
export class IpInterpreter extends MetricInterpreter {
    constructor(
        metric: IpMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class LoginSMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average success by login",
            "Average number of sucess per login",
            "Sucess/login",
            "Login",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces où la méthode est POST et l'URL contient "login" ou "auth"
        const loginOrAuthTraces = telemetryData.filter(data => {
            return data.attributes["http.method"] === "POST" &&
                (data.attributes["http.url"]?.includes("login") || data.attributes["http.url"]?.includes("auth"));
        });
        console.log("HEHUEZFHOEZFHOEZFIOHZEFIOHEFJ" + loginOrAuthTraces)
        // Compter le nombre de réponses avec un code de statut 200
        const successfulResponses = loginOrAuthTraces.filter(data => data.attributes["http.status_code"] === 200).length;
        console.log("successfulResponses" + successfulResponses)

        // Calculer la moyenne des réponses réussies
        const totalResponses = loginOrAuthTraces.length;

        if (totalResponses === 0) {
            return 0; // Aucun enregistrement trouvé
        }

        // La moyenne des réponses avec statut 200
        const authenticityScore = successfulResponses / totalResponses;
        console.log("authenticityScore" + authenticityScore)

        this._value = authenticityScore

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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link IpInterpreter}.
     */
    getInterpter(goal: Goal): LoginSInterpreter {
        return new LoginSInterpreter(this, goal);
    }
}
export class LoginSInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginSMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class LoginSSMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average tentative login by sessions",
            "Average number of tentative per login",
            "Sucess/login",
            "LoginS",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Regrouper les traces par session ID
        const sessions: { [sessionId: string]: { total: number, successful: number } } = {};

        // Filtrer les traces où la méthode est POST et l'URL contient "login" ou "auth"
        const loginOrAuthTraces = telemetryData.filter(data => {
            return data.attributes["http.method"] === "POST" &&
                (data.attributes["http.url"]?.includes("login") || data.attributes["http.url"]?.includes("auth"));
        });

        // Parcourir les traces filtrées pour compter les tentatives et les succès par session
        loginOrAuthTraces.forEach(data => {
            const sessionId = data.attributes["app.session.id"];

            // Si la session n'existe pas encore, l'initialiser
            if (!sessions[sessionId]) {
                sessions[sessionId] = { total: 0, successful: 0 };
            }

            // Incrémenter le nombre total de tentatives pour cette session
            sessions[sessionId].total++;

            // Si la réponse est un succès (code 200), incrémenter le nombre de succès pour cette session
            if (data.attributes["http.status_code"] === 200) {
                sessions[sessionId].successful++;
            }
        });

        // Calculer la moyenne des tentatives réussies
        let totalSuccessful = 0;
        let totalAttempts = 0;

        for (const sessionId in sessions) {
            totalSuccessful += sessions[sessionId].successful;
            totalAttempts += sessions[sessionId].total;
        }

        // Si aucune trace n'est trouvée, retourner 0
        if (totalAttempts === 0) {
            return 0;
        }

        // Calculer le score d'authenticité comme la moyenne des réussites
        const authenticityScore = totalSuccessful / totalAttempts;
        this._value = authenticityScore
        console.log("authenticityScoreLOGINS" + authenticityScore)

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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link IpInterpreter}.
     */
    getInterpter(goal: Goal): LoginSSInterpreter {
        return new LoginSSInterpreter(this, goal);
    }
}
export class LoginSSInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginSSMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}
export class LoginEMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average success by login",
            "Average number of sucess per login",
            "Sucess/login",
            "Login",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces où la méthode est POST et l'URL contient "login" ou "auth"
        const loginOrAuthTraces = telemetryData.filter(data => {
            return data.attributes["http.method"] === "POST" &&
                (data.attributes["http.url"]?.includes("login") || data.attributes["http.url"]?.includes("auth"));
        });
        console.log("Traces de connexion : " + loginOrAuthTraces);

        // Compter le nombre de réponses avec un code de statut différent de 200 (connexion échouée)
        const failedResponses = loginOrAuthTraces.filter(data => data.attributes["http.status_code"] !== 200).length;
        console.log("Nombre de connexions échouées : " + failedResponses);

        // Calculer la moyenne des réponses échouées
        const totalResponses = loginOrAuthTraces.length;

        if (totalResponses === 0) {
            return 0; // Aucun enregistrement trouvé
        }

        // La moyenne des réponses échouées
        const failureScore = failedResponses / totalResponses;
        console.log("Taux d'échecs des connexions : " + failureScore);

        this._value = failureScore;

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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link IpInterpreter}.
     */
    getInterpter(goal: Goal): LoginEInterpreter {
        return new LoginEInterpreter(this, goal);
    }
}
export class LoginEInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginEMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class LoginESMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average tentative login by sessions",
            "Average number of tentative per login",
            "Sucess/login",
            "LoginS",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Regrouper les traces par session ID
        const sessions: { [sessionId: string]: { total: number, failed: number } } = {};

        // Filtrer les traces où la méthode est POST et l'URL contient "login" ou "auth"
        const loginOrAuthTraces = telemetryData.filter(data => {
            return data.attributes["http.method"] === "POST" &&
                (data.attributes["http.url"]?.includes("login") || data.attributes["http.url"]?.includes("auth"));
        });

        // Parcourir les traces filtrées pour compter les tentatives et les échecs par session
        loginOrAuthTraces.forEach(data => {
            const sessionId = data.attributes["app.session.id"];

            // Si la session n'existe pas encore, l'initialiser
            if (!sessions[sessionId]) {
                sessions[sessionId] = { total: 0, failed: 0 };
            }

            // Incrémenter le nombre total de tentatives pour cette session
            sessions[sessionId].total++;

            // Si la réponse est un échec (code différent de 200), incrémenter le nombre d'échecs pour cette session
            if (data.attributes["http.status_code"] !== 200) {
                sessions[sessionId].failed++;
            }
        });

        // Calculer la moyenne des tentatives échouées par session
        let totalFailed = 0;
        let totalSessions = 0;

        for (const sessionId in sessions) {
            totalFailed += sessions[sessionId].failed;
            totalSessions += 1;  // Compter le nombre de sessions traitées
        }

        // Si aucune session n'est trouvée, retourner 0
        if (totalSessions === 0) {
            return 0;
        }

        // Calculer la moyenne des échecs par session
        const failureScore = totalFailed / totalSessions;
        this._value = failureScore;

        console.log("Moyenne des connexions échouées par session : " + failureScore);

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
     * @returns - An instance of `NoVuInterpreter` to interpret this metric for the provided goal.
     * @see {@link IpInterpreter}.
     */
    getInterpter(goal: Goal): LoginESInterpreter {
        return new LoginESInterpreter(this, goal);
    }
}
export class LoginESInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginESMetric,
        goal: Goal,
        // Assume a default weight of 0.4
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
export class LoginRatioMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "LoginRatio ",
            "LoginRatio ",
            "LoginRatio ",
            "LoginRatio",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "LoginS": new LoginSMetric(),
            "LoginE": new LoginEMetric(),

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
        const LoginS = this.children["LoginS"].computeValue(telemetryData);
        const LoginE = this.children["LoginE"].computeValue(telemetryData);
        this._value = LoginS / LoginE
        if (LoginE === 0) {
            return this._value === 0 ? 0 : Infinity; // Si les deux sont zéro, retourner 0, sinon Infinity (indiquant un succès parfait)
        }

        this._value = LoginS / LoginE;
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
    getInterpter(goal: Goal): LoginRatioInterpreter {
        return new LoginRatioInterpreter(this, goal);
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
export class LoginRatioInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginRatioMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/user
        // Assume a default weight of 0.3
        baseWeight = 0.3
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
export class LoginSRatioMetric extends CompositeMetric {
    _value: number = 0;

    constructor() {
        super(
            "LoginRatio ",
            "LoginRatio ",
            "LoginRatio ",
            "LoginRatio",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );

        this.children = { // setup the metric children dependencies
            "LoginSS": new LoginSSMetric(),
            "LoginES": new LoginESMetric(),

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
        const LoginS = this.children["LoginSS"].computeValue(telemetryData);
        const LoginE = this.children["LoginES"].computeValue(telemetryData);
        this._value = LoginS / LoginE
        if (LoginE === 0) {
            return this._value === 0 ? 0 : Infinity; // Si les deux sont zéro, retourner 0, sinon Infinity (indiquant un succès parfait)
        }

        this._value = LoginS / LoginE;
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
    getInterpter(goal: Goal): LoginSRatioInterpreter {
        return new LoginSRatioInterpreter(this, goal);
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
export class LoginSRatioInterpreter extends MetricInterpreter {
    constructor(
        metric: LoginSRatioMetric,
        goal: Goal,
        // Assume a maximum of 500 interactions/user
        // Assume a default weight of 0.3
        baseWeight = 0.3
    ) {
        super(metric, goal, baseWeight);
    }
}

/**
 * This class is responsible for mapping `Interaction Capability -> User Engagement -> Popularity`
 * goal to its corresponding metrics:
 * 
 * 1. **Number of Users (NoU)**;
 * 2. **Number of Visits (NoV)**;
 * 3. **Number of Sessions (NoS)**;
 * 4. **Average Visits per User (NoVu)**;
 * 5. **Average Sessions per User (NoSu)**;
 * 6. **Average Sessions per Visit (NoSv)**.
 * 
 * @see classes {@link NoUMetric}, {@link NoVMetric}, {@link NoSMetric},
 * {@link NoVuMetric}, {@link NoSuMetric}, and {@link NoSvMetric}
 */
export class RepudiationMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('backend')) {
            this.metrics.push(
                new IpMetric(),
                new LoginSMetric(),
                new LoginEMetric(),
                new LoginSSMetric(),
                new LoginESMetric(),
                new LoginRatioMetric(),
                new LoginSRatioMetric(),

            );
        }
    }

    /**
     * Maps the `Interaction Capability -> User Engagement -> Popularity` goal to its metrics:
     * 
     * @param goal The goal to map.
     * @throws An error if the goal is not "Popularity".
     * @see classes {@link NoUMetric}, {@link NoVMetric}, {@link NoSMetric},
     * {@link NoVuMetric}, {@link NoSuMetric}, and {@link NoSvMetric}
     */
    map(goal: Goal) {
        if (goal.name !== "Non-repudiation")
            throw new Error(`IP Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Popularity"
        goal.weight = 0.4; // @TODO remove this later when the weight assignment is finalized on the frontend

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}