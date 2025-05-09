import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { Goal, GoalMapper } from "../../../../core/goals/goals";
import { MetricInterpreter } from "../../../../core/metrics/metrics-interpreters";
import { TelemetryType } from "../../../../core/telemetry/telemetry";
import { LeafMetric, Metric } from "../../../../core/metrics/metrics-core";


export class MemoryMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average memory ",
            "Average memory of all span",
            "memory all span",
            "Memory",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces ayant un attribut "app.memory"
        const tracememory = telemetryData.filter(data => data.attributes["app.system.memory"]);

        // Si aucune trace de mémoire n'est trouvée, retourner 0
        if (tracememory.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Calculer la somme totale de la mémoire utilisée
        const totalMemory = tracememory.reduce((sum, data) => {
            const memoryValue = data.attributes["app.system.memory"];
            return sum + (memoryValue ? parseFloat(memoryValue) : 0); // Assurer que la valeur est un nombre
        }, 0);

        // Calculer la moyenne de la mémoire utilisée
        this._value = totalMemory / tracememory.length;

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
    getInterpter(goal: Goal): MemoryInterpreter {
        return new MemoryInterpreter(this, goal);
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
export class MemoryInterpreter extends MetricInterpreter {
    constructor(
        metric: MemoryMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class CpuUsageMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average cpu.usage ",
            "Average cpu.usage of all span",
            "cpu.usage all span",
            "cpu.usage",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces ayant un attribut "app.memory"
        const tracememory = telemetryData.filter(data => data.attributes["app.system.cpuusage"]);

        // Si aucune trace de mémoire n'est trouvée, retourner 0
        if (tracememory.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Calculer la somme totale de la mémoire utilisée
        const totalMemory = tracememory.reduce((sum, data) => {
            const memoryValue = data.attributes["app.system.cpuusage"];
            return sum + (memoryValue ? parseFloat(memoryValue) : 0); // Assurer que la valeur est un nombre
        }, 0);

        // Calculer la moyenne de la mémoire utilisée
        this._value = totalMemory / tracememory.length;

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
    getInterpter(goal: Goal): CpuUsageInterpreter {
        return new CpuUsageInterpreter(this, goal);
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
export class CpuUsageInterpreter extends MetricInterpreter {
    constructor(
        metric: CpuUsageMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}
export class CpuTimeUsageMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average cputime.cputime ",
            "Average cputime.usage of all span",
            "cputime.usage all span",
            "cputime.usage",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces ayant un attribut "app.memory"
        const tracememory = telemetryData.filter(data => data.attributes["app.system.cputime"]);

        // Si aucune trace de mémoire n'est trouvée, retourner 0
        if (tracememory.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Calculer la somme totale de la mémoire utilisée
        const totalMemory = tracememory.reduce((sum, data) => {
            const memoryValue = data.attributes["app.system.cputime"];
            return sum + (memoryValue ? parseFloat(memoryValue) : 0); // Assurer que la valeur est un nombre
        }, 0);

        // Calculer la moyenne de la mémoire utilisée
        this._value = totalMemory / tracememory.length;

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
    getInterpter(goal: Goal): CpuTimeUsageInterpreter {
        return new CpuTimeUsageInterpreter(this, goal);
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
export class CpuTimeUsageInterpreter extends MetricInterpreter {
    constructor(
        metric: CpuTimeUsageMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class NetworkMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "estimate Network Energy Impact ",
            "estimateNetworkEnergyImpact",
            "Network Energy Impact",
            "Network",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces contenant des interfaces réseau
        const tracesWithNetwork = telemetryData.filter(data => data.attributes["app.system.networkinterfaces"]);

        if (tracesWithNetwork.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Accumuler les scores pour toutes les traces
        let totalScore = 0;
        let ifaceCount = 0;

        tracesWithNetwork.forEach((trace) => {
            const raw = trace.attributes["app.system.networkinterfaces"];
            let parsed: Record<string, any>;

            try {
                // Si les interfaces réseau sont sous forme de chaîne JSON, les analyser
                parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                console.warn("Échec de l'analyse des interfaces réseau :", e);
                return;
            }

            let score = 0;
            // Parcourir les interfaces et attribuer des scores selon le type
            for (const ifaceName in parsed) {
                ifaceCount++;

                if (ifaceName.startsWith("wl")) {
                    score += 2; // Wi-Fi
                } else if (ifaceName.startsWith("en")) {
                    score += 1; // Ethernet
                } else if (ifaceName.startsWith("ww")) {
                    score += 1.5; // Cellulaire
                } else if (ifaceName.startsWith("lo")) {
                    score += 0.2; // Loopback
                } else {
                    score += 0.5; // Inconnu ou autre
                }
            }

            totalScore += score;
        });

        // Calculer la moyenne du score pour toutes les traces
        this._value = ifaceCount > 0 ? totalScore / ifaceCount : 0;

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
    getInterpter(goal: Goal): NetworkInterpreter {
        return new NetworkInterpreter(this, goal);
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
export class NetworkInterpreter extends MetricInterpreter {
    constructor(
        metric: NetworkMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}

export class LoadavgMetric extends LeafMetric {
    _value: number = 0;

    constructor() {
        super(
            "Average Loadavg by core",
            "Average Loadavg by core",
            "Loadavg/core",
            "Loadavg",
            [TelemetryType.TRACING] // The metric requires tracing telemetry
        );
    }

    /**
     * Computes the value for **Average Visits per User (NoVu)**.
     * @param telemetryData An array of telemetry data objects to analyze.
     * @returns The average number of visits per user.
     */
    computeValue(telemetryData: any[]): number {
        // Filtrer les traces ayant un attribut "app.system.loadavg" et "app.system.core"
        const traceLoadAvg = telemetryData.filter(data =>
            data.attributes["app.system.loadavg"] && data.attributes["app.system.core"]
        );

        if (traceLoadAvg.length === 0) {
            this._value = 0;
            return this._value;
        }

        // Calculer la somme des scores de loadavg pondérés, normalisés par le nombre de cœurs
        const totalScore = traceLoadAvg.reduce((sum, data) => {
            const loadavg = data.attributes["app.system.loadavg"];
            const cores = data.attributes["app.system.core"];

            // S'assurer que nous avons des valeurs valides pour loadavg et cores
            if (!loadavg || !cores || cores === 0) return sum;

            // Assume loadavg is an array with three values: [1min, 5min, 15min]
            const loadavg1 = loadavg[0] || 0;
            const loadavg5 = loadavg[1] || 0;
            const loadavg15 = loadavg[2] || 0;

            // Moyenne pondérée (1 min, 5 min, 15 min) avec normalisation par le nombre de cœurs
            const score = (
                (1 * loadavg1 + 0.6 * loadavg5 + 0.3 * loadavg15) /
                (1 + 0.6 + 0.3)
            ) / cores;  // Normaliser par le nombre de cœurs

            return sum + score;
        }, 0);

        // Calculer la moyenne des scores
        this._value = totalScore / traceLoadAvg.length;

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
    getInterpter(goal: Goal): loadavgInterpreter {
        return new loadavgInterpreter(this, goal);
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
export class loadavgInterpreter extends MetricInterpreter {
    constructor(
        metric: LoadavgMetric,
        goal: Goal,
        // Assume a default weight of 0.4
        baseWeight = 0.4
    ) {
        super(metric, goal, baseWeight);
    }
}
export class UptimeMetric extends LeafMetric {
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
        const uptimes = telemetryData
            .map(data => data.attributes?.["app.system.uptime"])
            .filter(uptime => typeof uptime === "number");

        if (uptimes.length === 0) {
            this._value = 0;
            return this._value;
        }

        const maxUptime = Math.max(...uptimes);
        this._value = maxUptime;

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
    getInterpter(goal: Goal): UptimeInterpreter {
        return new UptimeInterpreter(this, goal);
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
export class UptimeInterpreter extends MetricInterpreter {
    constructor(
        metric: UptimeMetric,
        goal: Goal,
        baseWeight = 0.4
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
export class RessourceMapper implements GoalMapper {
    metrics: Metric[] = [];

    constructor(public appMetadata: ApplicationMetadata) {
        this.prepareMetrics();
    }

    private prepareMetrics() {
        if (this.appMetadata.type.toLowerCase().includes('backend')) {
            this.metrics.push(
                new CpuUsageMetric(),
                new CpuTimeUsageMetric(),
                new MemoryMetric(),
                new UptimeMetric(),
                new LoadavgMetric(),// a voir, faire telecharger systeminformation et autre api via npm install pour avoir metric en +, le span ressource a lancer 
                new NetworkMetric(),
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
        if (goal.name !== "Resource Utilization")
            throw new Error(`Resource Utilization Mapper: Incorrect Mapper for Goal ${goal.name}`);

        // Set overall weight for "Popularity"
        goal.weight = 0.4; // @TODO remove this later when the weight assignment is finalized on the frontend

        // Map the metrics to their goal
        this.metrics.forEach(metric => goal.metrics.add(metric));
    }
}