import { BenchmarkKind } from "./metrics-interpreters";

/**
 * Benchmark management for the normalization of metric values.
 *
 * Modes:
 * - `dynamic-max` (default; the semantics used before Pass 23): b = max(b0, largest value of the metric
 *   observed so far in the benchmark scope). The benchmark can only rise, so the same raw value can be
 *   normalized differently over time; scores are comparable over time only together with the recorded b.
 * - `fixed`: b = b0. Requires a configured b0 > 0 for every metric; values above b0 normalize to the bound.
 *
 * Scope: one benchmark per (application, metric acronym). The scope is the normalized application name, so
 * benchmarks are no longer shared between applications assessed by the same backend process, are kept across
 * instrumentation bundles of the same application, and survive a backend restart when a persistence is configured.
 *
 * Every assessment record stores, per metric, the raw value, b, b0, the benchmark kind and mode, so that a score
 * can be recomputed and interpreted later (see PASS23_BENCHMARK_AND_ASSESSMENT_SEMANTICS.md).
 */
export type BenchmarkMode = 'dynamic-max' | 'fixed';

export interface BenchmarkState {
    acronym: string;
    initial: number;        // b0 at the last update
    maxObserved: number;    // largest observed raw value in the scope (dynamic mode)
    updates: number;        // number of cycles that updated the state
    updatedAt: string;
}

export interface BenchmarkEntry {
    acronym: string;
    raw: number;
    observed: boolean;
    initial: number;
    kind: BenchmarkKind;
}

export interface BenchmarkResolution {
    benchmark: number;
    initial: number;
    kind: BenchmarkKind;
    maxObserved: number;
    mode: BenchmarkMode;
    scope: string;
}

export class BenchmarkConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BenchmarkConfigurationError';
    }
}

/**
 * Storage of benchmark states, per scope.
 */
export interface BenchmarkPersistence {
    load(scope: string): Promise<BenchmarkState[]>;
    save(scope: string, states: BenchmarkState[]): Promise<void>;
}

/**
 * In-memory persistence (no durability). Used when no database is configured and in tests.
 */
export class InMemoryBenchmarkPersistence implements BenchmarkPersistence {
    readonly data = new Map<string, Map<string, BenchmarkState>>();

    async load(scope: string): Promise<BenchmarkState[]> {
        return Array.from(this.data.get(scope)?.values() ?? []).map(s => ({ ...s }));
    }

    async save(scope: string, states: BenchmarkState[]): Promise<void> {
        const m = this.data.get(scope) ?? new Map<string, BenchmarkState>();
        states.forEach(s => {
            const prev = m.get(s.acronym);
            m.set(s.acronym, { ...s, maxObserved: Math.max(prev?.maxObserved ?? 0, s.maxObserved) });
        });
        this.data.set(scope, m);
    }
}

/**
 * Resolves the benchmark of each metric of an assessment cycle and keeps the benchmark state per scope.
 */
export class BenchmarkStore {
    private cache = new Map<string, Map<string, BenchmarkState>>();
    private loading = new Map<string, Promise<Map<string, BenchmarkState>>>();
    private chain = new Map<string, Promise<unknown>>();

    constructor(
        private persistence: BenchmarkPersistence = new InMemoryBenchmarkPersistence(),
        readonly mode: BenchmarkMode = 'dynamic-max') { }

    private async stateOf(scope: string): Promise<Map<string, BenchmarkState>> {
        const cached = this.cache.get(scope);
        if (cached) return cached;
        if (!this.loading.has(scope)) {
            this.loading.set(scope, this.persistence.load(scope).then(states => {
                const m = new Map(states.map(s => [s.acronym, s] as [string, BenchmarkState]));
                this.cache.set(scope, m);
                return m;
            }));
        }
        return this.loading.get(scope)!;
    }

    /**
     * Updates the benchmark state of the scope with the values of one cycle and returns the benchmark of each metric.
     * Calls for the same scope are serialized.
     */
    async resolve(scope: string, entries: BenchmarkEntry[], timestamp: string): Promise<Map<string, BenchmarkResolution>> {
        const previous = this.chain.get(scope) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(() => this.resolveNow(scope, entries, timestamp));
        this.chain.set(scope, run);
        return run;
    }

    private async resolveNow(scope: string, entries: BenchmarkEntry[], timestamp: string): Promise<Map<string, BenchmarkResolution>> {
        const state = await this.stateOf(scope);
        const touched = new Map<string, BenchmarkState>();
        const result = new Map<string, BenchmarkResolution>();

        for (const e of entries) {
            if (!Number.isFinite(e.raw) || !Number.isFinite(e.initial) || e.initial < 0) {
                throw new BenchmarkConfigurationError(`Invalid value or initial benchmark for ${e.acronym}: m=${e.raw}, b0=${e.initial}`);
            }
            const s: BenchmarkState = state.get(e.acronym) ?? { acronym: e.acronym, initial: e.initial, maxObserved: 0, updates: 0, updatedAt: timestamp };
            if (!touched.has(e.acronym)) {
                s.updates += 1;
                s.updatedAt = timestamp;
            }
            s.initial = e.initial;
            if (this.mode === 'dynamic-max' && e.observed) s.maxObserved = Math.max(s.maxObserved, e.raw);
            state.set(e.acronym, s);
            touched.set(e.acronym, s);

            let benchmark: number;
            if (this.mode === 'fixed') {
                if (!(e.initial > 0)) {
                    throw new BenchmarkConfigurationError(`Fixed benchmark mode requires a configured initial benchmark > 0 for ${e.acronym}`);
                }
                benchmark = e.initial;
            } else {
                benchmark = Math.max(e.initial, s.maxObserved);
            }
            result.set(e.acronym, { benchmark, initial: e.initial, kind: e.kind, maxObserved: s.maxObserved, mode: this.mode, scope });
        }

        await this.persistence.save(scope, Array.from(touched.values()).map(s => ({ ...s })));
        return result;
    }
}
