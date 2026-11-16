/**
 * Interpretation semantics of the implemented metrics: direction (polarity) and definitional bounds.
 *
 * Polarity states how a measured value relates to the quality goal the metric is mapped to:
 * - `higher-is-better`: a larger value indicates better achievement of the goal;
 * - `lower-is-better`: a larger value indicates an undesirable amount (time, resource use, page weight,
 *   attack indicators); normalization is inverted so that an increase never improves the score;
 * - `unspecified`: the implemented computation does not support a justified direction (it measures load,
 *   volume or a host property rather than the goal). Such metrics are normalized directly (as before
 *   Pass 23), and their records carry `polarity: "unspecified"` so that the choice is visible.
 *
 * `bound` is a definitional upper bound of the value (ratio = 1, percentage = 100, EcoIndex = 100). It is
 * used as initial benchmark only for metrics without a configured initial benchmark. It is not an
 * empirically validated reference value.
 *
 * The classification follows the goal definitions in `src/core/models/iso-iec-25010.model.ts` and the
 * computations in `src/modules/metrics/**` (see docs: PASS23_NORMALIZATION_AND_POLARITY.md).
 */
export type MetricPolarity = 'higher-is-better' | 'lower-is-better' | 'unspecified';

export interface MetricSemantics {
    polarity: MetricPolarity;
    bound?: number;
    rationale: string;
}

const H = (rationale: string, bound?: number): MetricSemantics => ({ polarity: 'higher-is-better', rationale, bound });
const L = (rationale: string, bound?: number): MetricSemantics => ({ polarity: 'lower-is-better', rationale, bound });
const U = (rationale: string, bound?: number): MetricSemantics => ({ polarity: 'unspecified', rationale, bound });

export const METRIC_SEMANTICS: Readonly<Record<string, MetricSemantics>> = {
    /* Interaction Capability > User Engagement > Popularity ("popular among its users") */
    NoU: H('more distinct users indicate greater popularity'),
    NoV: H('more visits indicate greater popularity'),
    NoS: H('more sessions indicate greater popularity'),
    NoVu: H('more visits per user indicate greater popularity among users'),
    NoSu: H('more sessions per user indicate greater popularity among users'),
    NoSv: U('sessions per visit counts browser tabs opened within a fixed 30-minute visit window; no justified direction for popularity'),
    /* Interaction Capability > User Engagement > Activity ("actively engaged") */
    UIFu: H('more interactions per user indicate more active engagement'),
    UIFv: H('more interactions per visit indicate more active engagement'),
    UIFs: H('more interactions per session indicate more active engagement'),
    DTu: H('longer dwell time per user indicates more active engagement'),
    DTv: H('longer dwell time per visit indicates more active engagement'),
    DTs: H('longer dwell time per session indicates more active engagement'),
    NNCu: H('more navigation clicks per user indicate more active engagement'),
    NNCv: H('more navigation clicks per visit indicate more active engagement'),
    NNCs: H('more navigation clicks per session indicate more active engagement'),
    /* Interaction Capability > User Engagement > Loyalty ("loyal to the software") */
    AD: H('more active days indicate greater loyalty'),
    ADu: H('more active days per user indicate greater loyalty'),
    RR: H('more returns per user indicate greater loyalty'),
    DTRv: H('longer retained dwell time per visit indicates greater loyalty'),
    DTRs: H('longer retained dwell time per session indicates greater loyalty'),
    /* Performance Efficiency > Time Behavior ("response and processing times and throughput rates") */
    ART: L('longer average response time is worse time behaviour'),
    P95RT: L('longer tail response time is worse time behaviour'),
    RTVar: L('larger response-time dispersion is worse time behaviour'),
    LPI: L('mean of ART, P95RT and RTVar (all lower-is-better)'),
    NHR: U('number of HTTP requests measures workload volume, not time behaviour'),
    TPUT: U('observed request rate reflects offered load, not throughput capacity'),
    /* Performance Efficiency > Resource Utilization ("amounts of resources used") and Physical Footprint */
    Memory: L('more memory used is a larger resource amount'),
    'cpu.usage': L('higher CPU usage is a larger resource amount'),
    'cputime.usage': L('more CPU time is a larger resource amount'),
    Loadavg: L('higher load per core is a larger resource amount'),
    Network: U('weighted score of the host network-interface types; a host property, not resource use by the software'),
    uptime: U('process uptime does not measure resource use or footprint'),
    PhysicalFootprint: L('weighted CPU, memory and CPU-time use (all lower-is-better)'),
    /* Energy Consumption > Ecological Footprint */
    Dom: L('larger DOM is a larger ecological footprint (EcoIndex input)'),
    HTTPNb: L('more HTTP requests per navigation is a larger footprint (EcoIndex input)'),
    Weight: L('larger transferred content is a larger footprint (EcoIndex input)'),
    Econdex: H('EcoIndex-style score: 100 is the smallest footprint', 100),
    /* Security > Confidentiality ("accessible only to those authorized") */
    USQLM: L('share of data-modifying SQL statements without authentication', 1),
    SA: L('share of client IP addresses showing scanning behaviour', 1),
    XSSI: L('percentage of GET requests carrying XSS patterns', 100),
    SQLI: L('share of spans whose SQL statement matches injection patterns', 1),
    AR: U('refused authentications indicate access control working as well as attacks', 1),
    /* Security > Non-repudiation ("actions can be proven to have taken place") */
    Ip: U('count of HTTP spans carrying a peer IP; volume-driven count', undefined),
    LoginS: U('count of successful logins; authentication outcome, not provability of actions'),
    LoginE: U('count of failed logins; authentication outcome, not provability of actions'),
    LoginSS: U('login success ratio; authentication outcome, not provability of actions', 1),
    LoginES: U('failed logins per session; authentication outcome, not provability of actions'),
    LoginRatio: U('successes per failure; authentication outcome, not provability of actions'),
    LoginRatioS: U('per-session successes per failure; authentication outcome, not provability of actions'),
};

/**
 * Returns the semantics of a metric. Unknown acronyms are `unspecified` (direct normalization).
 */
export function semanticsOf(acronym: string): MetricSemantics {
    return METRIC_SEMANTICS[acronym] ?? U('not classified');
}
