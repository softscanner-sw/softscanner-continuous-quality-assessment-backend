/**
 * Executable goal-to-metric-to-observable mapping (Stage A2 made operational for Stage B1).
 *
 * For every implemented metric, this registry declares what its computation actually consumes:
 * - the span classes (observation populations) it reads,
 * - the span fields it reads (attributes, name, timestamps),
 * - the interaction event types it requires (user-interaction spans only),
 * - the metrics it depends on (acronyms of its child metrics).
 *
 * The declarations are derived from the `computeValue` rules of the metric classes; a regression test
 * checks them against the compiled computations (fields read, child metrics). The Instrumentation Manager
 * consumes the resolved requirements to select instrumentation modules and span processors
 * (see `instrumentation-capabilities.ts`), without executing any metric computation.
 */

/** Classes of spans (observation populations) that metric computations consume. */
export type SpanClass =
    | 'ui.interaction'          // browser user-interaction spans (attribute event_type)
    | 'ui.navigation-click'     // user-interaction click spans named "Navigation: <path>" (route change)
    | 'browser.document-load'   // documentLoad / documentFetch / resourceFetch spans
    | 'browser.http-client'     // browser Fetch / XMLHttpRequest client spans
    | 'server.http'             // Node.js HTTP server spans
    | 'db.query'                // SQL client spans (db.statement)
    | 'any';                    // any span of the application (attributes attached by span processors)

export const SPAN_CLASSES: readonly SpanClass[] = [
    'ui.interaction', 'ui.navigation-click', 'browser.document-load', 'browser.http-client', 'server.http', 'db.query', 'any',
];

/** Categories of observable fields. */
export type ObservableCategory = 'context-identifier' | 'event' | 'temporal' | 'http' | 'database' | 'resource';

/** Span fields read by metric computations, with their category. */
export const OBSERVABLE_FIELDS = {
    // contextual identifiers (UserIdentitySpanProcessor)
    'app.user.id': 'context-identifier',
    'app.visit.id': 'context-identifier',
    'app.session.id': 'context-identifier',
    // interaction / span identity
    'event_type': 'event',
    'span.name': 'event',
    // temporal information (intrinsic to every span)
    'span.startTime': 'temporal',
    'span.endTime': 'temporal',
    'span.duration': 'temporal',
    // HTTP attributes (instrumentation modules)
    'http.method': 'http',
    'http.url': 'http',
    'http.target': 'http',
    'http.status_code': 'http',
    'http.response_content_length': 'http',
    'net.host.ip': 'http',
    'net.peer.ip': 'http',
    // database attributes
    'db.statement': 'database',
    // resource attributes (ResourceNodeSpanProcessor)
    'app.system.domelement': 'resource',
    'app.system.memory': 'resource',
    'app.system.cpuusage': 'resource',
    'app.system.cputime': 'resource',
    'app.system.uptime': 'resource',
    'app.system.loadavg': 'resource',
    'app.system.core': 'resource',
    'app.system.networkinterfaces': 'resource',
} as const satisfies Record<string, ObservableCategory>;

export type ObservableField = keyof typeof OBSERVABLE_FIELDS;

/** Interaction event requirement: a specific DOM event type, or any recognized interaction event ('*'). */
export type InteractionEventRequirement = '*' | 'click' | 'change' | 'select' | 'submit';

/** Direct observation requirements of one metric. */
export interface MetricObservationRequirement {
    spanClasses: readonly SpanClass[];
    fields: readonly ObservableField[];
    /** Fields read only to exclude spans (their absence qualifies a span); not required to be collected. */
    exclusionFields?: readonly ObservableField[];
    events?: readonly InteractionEventRequirement[];
    dependsOn?: readonly string[];  // acronyms of the metrics this metric computes from
}

const UE_EVENTS: readonly InteractionEventRequirement[] = ['*'];
const NAV_EVENTS: readonly InteractionEventRequirement[] = ['*', 'click'];
const ui = (fields: ObservableField[], dependsOn?: string[]): MetricObservationRequirement =>
    ({ spanClasses: ['ui.interaction'], fields: ['event_type', ...fields], events: UE_EVENTS, ...(dependsOn ? { dependsOn } : {}) });
const nav = (fields: ObservableField[], dependsOn: string[]): MetricObservationRequirement =>
    ({ spanClasses: ['ui.interaction', 'ui.navigation-click'], fields: ['event_type', 'span.name', ...fields], events: NAV_EVENTS, dependsOn });
const HTTP_TIMING: ObservableField[] = ['http.method', 'span.startTime', 'span.endTime', 'span.duration'];
const res = (...fields: ObservableField[]): MetricObservationRequirement => ({ spanClasses: ['any'], fields });

/**
 * Direct observation requirements of every implemented metric, keyed by acronym.
 * User Engagement metrics are computed over identified user-interaction spans (see
 * `user-engagement-population.ts`); every one of them therefore reads `event_type`.
 */
export const METRIC_OBSERVATION_REQUIREMENTS: Readonly<Record<string, MetricObservationRequirement>> = {
    // ---------------------------------------------------- User Engagement > Popularity
    'NoU': ui(['app.user.id']),
    'NoV': ui(['app.visit.id']),
    'NoS': ui(['app.session.id']),
    'NoVu': ui(['app.user.id', 'app.visit.id'], ['NoU']),
    'NoSu': ui(['app.user.id', 'app.session.id'], ['NoU']),
    'NoSv': ui(['app.visit.id', 'app.session.id'], ['NoV']),
    // ---------------------------------------------------- User Engagement > Activity
    'UIFu': ui(['app.user.id'], ['NoU']),
    'UIFv': ui(['app.visit.id'], ['NoV']),
    'UIFs': ui(['app.session.id'], ['NoS']),
    'DTu': ui(['app.user.id', 'span.startTime', 'span.endTime'], ['NoU']),
    'DTv': ui(['app.visit.id', 'span.startTime', 'span.endTime'], ['NoV']),
    'DTs': ui(['app.session.id', 'span.startTime', 'span.endTime'], ['NoS']),
    'NNCu': nav(['app.user.id'], ['NoU']),
    'NNCv': nav(['app.visit.id'], ['NoV']),
    'NNCs': nav(['app.session.id'], ['NoS']),
    // ---------------------------------------------------- User Engagement > Loyalty
    'AD': ui(['span.startTime']),
    'ADu': ui(['app.user.id', 'span.startTime'], ['NoU']),
    'RR': ui(['app.user.id', 'app.visit.id'], ['NoU']),
    'DTRv': ui(['app.user.id', 'app.visit.id', 'span.startTime', 'span.endTime'], ['NoU']),
    'DTRs': ui(['app.user.id', 'app.session.id', 'span.startTime', 'span.endTime'], ['NoU']),
    // ---------------------------------------------------- Energy Consumption > Ecological Footprint (frontend)
    'HTTPNb': { spanClasses: ['ui.navigation-click', 'browser.http-client'], fields: ['span.name', 'span.startTime', 'http.method', 'http.url'], events: ['click'] },
    'Dom': { spanClasses: ['browser.document-load'], fields: ['http.url', 'app.system.domelement'], exclusionFields: ['http.method'] },
    'Weight': { spanClasses: ['browser.document-load'], fields: ['span.name', 'http.url', 'http.response_content_length'] },
    'Econdex': { spanClasses: [], fields: [], dependsOn: ['Dom', 'HTTPNb', 'Weight'] },
    // ---------------------------------------------------- Physical Footprint / Resource Utilization (Node.js)
    'cpu.usage': res('app.system.cpuusage'),
    'cputime.usage': res('app.system.cputime'),
    'Memory': res('app.system.memory'),
    'uptime': res('app.system.uptime'),
    'Loadavg': res('app.system.loadavg', 'app.system.core'),
    'Network': res('app.system.networkinterfaces'),
    'PhysicalFootprint': { spanClasses: [], fields: [], dependsOn: ['cpu.usage', 'cputime.usage', 'Memory', 'uptime'] },
    // ---------------------------------------------------- Performance Efficiency > Time Behavior (Node.js)
    'NHR': { spanClasses: ['server.http'], fields: ['http.method'] },
    'ART': { spanClasses: ['server.http'], fields: HTTP_TIMING },
    'P95RT': { spanClasses: ['server.http'], fields: HTTP_TIMING },
    'RTVar': { spanClasses: ['server.http'], fields: HTTP_TIMING },
    'TPUT': { spanClasses: ['server.http'], fields: HTTP_TIMING },
    'LPI': { spanClasses: [], fields: [], dependsOn: ['ART', 'P95RT', 'RTVar'] },
    // ---------------------------------------------------- Security > Confidentiality (Node.js)
    'XSSI': { spanClasses: ['server.http'], fields: ['http.method', 'http.target'] },
    'SA': { spanClasses: ['server.http'], fields: ['net.host.ip', 'http.status_code', 'http.target'] },
    'AR': { spanClasses: ['server.http'], fields: ['http.target', 'http.status_code'] },
    'SQLI': { spanClasses: ['db.query'], fields: ['db.statement'] },
    'USQLM': { spanClasses: ['db.query'], fields: ['db.statement', 'app.user.id', 'http.status_code'] },
    // ---------------------------------------------------- Security > Non-repudiation (Node.js)
    'Ip': { spanClasses: ['server.http'], fields: ['http.method', 'net.peer.ip'] },
    'LoginS': { spanClasses: ['server.http'], fields: ['http.method', 'http.url', 'http.status_code'] },
    'LoginE': { spanClasses: ['server.http'], fields: ['http.method', 'http.url', 'http.status_code'] },
    'LoginSS': { spanClasses: ['server.http'], fields: ['http.method', 'http.url', 'http.status_code', 'app.session.id'] },
    'LoginES': { spanClasses: ['server.http'], fields: ['http.method', 'http.url', 'http.status_code', 'app.session.id'] },
    'LoginRatio': { spanClasses: [], fields: [], dependsOn: ['LoginS', 'LoginE'] },
    'LoginRatioS': { spanClasses: [], fields: [], dependsOn: ['LoginSS', 'LoginES'] },
};

/** Requirements of one metric after dependency closure. */
export interface ResolvedMetricRequirement {
    acronym: string;
    direct: MetricObservationRequirement;
    dependencies: string[];             // transitive dependency acronyms (sorted)
    inheritedSpanClasses: SpanClass[];  // from dependencies, not declared directly (sorted)
    inheritedFields: ObservableField[]; // from dependencies, not declared directly (sorted)
    spanClasses: SpanClass[];           // direct + inherited (sorted)
    fields: ObservableField[];          // direct + inherited (sorted)
    events: InteractionEventRequirement[];
}

/** Requirements of a set of selected metrics. */
export interface ResolvedObservationRequirements {
    metrics: ResolvedMetricRequirement[];      // one entry per requested acronym (sorted, deduplicated)
    spanClasses: SpanClass[];                  // union (sorted)
    fields: ObservableField[];                 // union (sorted)
    events: InteractionEventRequirement[];     // union (sorted)
    unresolved: string[];                      // acronyms without a declared requirement (sorted)
}

/** A cycle or a dangling dependency in the requirement registry. */
export class ObservationRequirementError extends Error {
    constructor(message: string, public readonly code: 'DEPENDENCY_CYCLE' | 'UNKNOWN_DEPENDENCY') {
        super(message);
        this.name = 'ObservationRequirementError';
    }
}

const sorted = <T extends string>(values: Iterable<T>): T[] => Array.from(new Set(values)).sort();

/**
 * Resolves the direct and inherited observation requirements of the given metrics (by acronym).
 * Deterministic (sorted output); unknown acronyms are reported in `unresolved`; cycles and dependencies
 * on undeclared metrics throw an `ObservationRequirementError`.
 */
export function resolveObservationRequirements(
    acronyms: Iterable<string>,
    registry: Readonly<Record<string, MetricObservationRequirement>> = METRIC_OBSERVATION_REQUIREMENTS,
): ResolvedObservationRequirements {
    const closure = new Map<string, string[]>();  // memoized transitive dependencies

    const dependenciesOf = (acronym: string, path: string[]): string[] => {
        if (path.includes(acronym)) {
            throw new ObservationRequirementError(`Metric dependency cycle: ${[...path, acronym].join(' -> ')}`, 'DEPENDENCY_CYCLE');
        }
        const cached = closure.get(acronym);
        if (cached) return cached;
        const requirement = registry[acronym];
        if (!requirement) {
            throw new ObservationRequirementError(
                `Metric ${path[path.length - 1]} depends on ${acronym}, which has no declared observation requirement`, 'UNKNOWN_DEPENDENCY');
        }
        const result = new Set<string>();
        for (const dependency of requirement.dependsOn ?? []) {
            result.add(dependency);
            dependenciesOf(dependency, [...path, acronym]).forEach((d) => result.add(d));
        }
        const value = sorted(result);
        closure.set(acronym, value);
        return value;
    };

    const unresolved: string[] = [];
    const metrics: ResolvedMetricRequirement[] = [];
    for (const acronym of sorted(acronyms)) {
        const direct = registry[acronym];
        if (!direct) { unresolved.push(acronym); continue; }
        const dependencies = dependenciesOf(acronym, []);
        const inheritedSpanClasses = new Set<SpanClass>();
        const inheritedFields = new Set<ObservableField>();
        const events = new Set<InteractionEventRequirement>(direct.events ?? []);
        for (const dependency of dependencies) {
            const d = registry[dependency];
            d.spanClasses.forEach((c) => { if (!direct.spanClasses.includes(c)) inheritedSpanClasses.add(c); });
            d.fields.forEach((f) => { if (!direct.fields.includes(f)) inheritedFields.add(f); });
            (d.events ?? []).forEach((e) => events.add(e));
        }
        metrics.push({
            acronym, direct, dependencies,
            inheritedSpanClasses: sorted(inheritedSpanClasses), inheritedFields: sorted(inheritedFields),
            spanClasses: sorted([...direct.spanClasses, ...inheritedSpanClasses]),
            fields: sorted([...direct.fields, ...inheritedFields]),
            events: sorted(events),
        });
    }
    return {
        metrics,
        spanClasses: sorted(metrics.flatMap((m) => m.spanClasses)),
        fields: sorted(metrics.flatMap((m) => m.fields)),
        events: sorted(metrics.flatMap((m) => m.events)),
        unresolved,
    };
}

/** Category of an observable field. */
export function categoryOf(field: ObservableField): ObservableCategory {
    return OBSERVABLE_FIELDS[field];
}
