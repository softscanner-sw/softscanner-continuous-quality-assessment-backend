/*
 * Regression tests for the executable metric-observable registry (src/core/metrics/metric-observables.ts).
 *
 * Guards against: metrics without declared observation requirements; declarations that drift from the
 * metric computations (fields read, child metrics); composite metrics that omit the requirements of their
 * dependencies; non-deterministic or duplicated resolution results; silent cycles or dangling dependencies.
 *
 * Runs against the compiled output. Uses only node:test.
 *   SSNFA_DIST=/path/to/dist node --test test/
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
const { SSQMM } = req('core/models/ssqmm.model');
const { ApplicationMetadata } = req('core/application/application-metadata');
const obs = req('core/metrics/metric-observables');
console.log = () => {}; console.warn = () => {};

const APPS = [['frontend', 'Angular'], ['frontend', 'React'], ['backend', 'Node.js']];

/** Every metric instance mapped by the quality model, for every supported application type. */
function mappedMetrics() {
  const out = new Map();
  for (const [type, tech] of APPS) {
    const s = new SSQMM(new ApplicationMetadata('app', type, tech, '/x', 'http://x')); s.buildMap();
    const visit = (goal) => {
      (goal.metrics ? Array.from(goal.metrics) : []).forEach((m) => out.set(m.acronym, m));
      (goal.subGoals ? Array.from(goal.subGoals) : []).forEach(visit);
    };
    s.goals.forEach(visit);
  }
  return out;
}

/** Fields read by a compiled computeValue (attribute keys, span name and timestamps). */
function fieldsReadByComputation(metric) {
  const src = metric.computeValue.toString();
  const fields = new Set();
  for (const m of src.matchAll(/\[\s*["'`]((?:app|http|net|db)\.[^"'`]+|event_type)["'`]\s*\]/g)) fields.add(m[1]);
  for (const m of src.matchAll(/uniqueCount\([^,]+,\s*["'`]([^"'`]+)["'`]\)/g)) fields.add(m[1]);
  for (const m of src.matchAll(/identifiedInteractionSpans\)?\([^)]*\)/g)) {
    for (const k of m[0].matchAll(/["'`](app\.[a-z]+\.id)["'`]/g)) fields.add(k[1]);
  }
  if (/interactionSpans|identifiedInteractionSpans/.test(src)) fields.add('event_type');
  if (/\.startTime/.test(src)) fields.add('span.startTime');
  if (/\.endTime/.test(src)) fields.add('span.endTime');
  if (/\.duration\b/.test(src)) fields.add('span.duration');
  if (/\b(data|trace|navTrace)\.name\b|traceName/.test(src)) fields.add('span.name');
  return fields;
}

test('OR-01 every mapped metric has a declared requirement; dependsOn equals its child metrics', () => {
  const metrics = mappedMetrics();
  assert.equal(metrics.size, 49, 'all implemented metrics are mapped');
  for (const [acr, m] of metrics) {
    const r = obs.METRIC_OBSERVATION_REQUIREMENTS[acr];
    assert.ok(r, `requirement declared for ${acr}`);
    const children = Object.values(m.children ?? {}).map((c) => c.acronym).sort();
    assert.deepEqual([...(r.dependsOn ?? [])].sort(), children, `dependencies of ${acr}`);
  }
  assert.deepEqual(Object.keys(obs.METRIC_OBSERVATION_REQUIREMENTS).sort(), [...metrics.keys()].sort(), 'no undeclared or extra entry');
});

test('OR-02 declared fields cover every field read by the compiled computations, and only known fields', () => {
  for (const [acr, m] of mappedMetrics()) {
    const r = obs.METRIC_OBSERVATION_REQUIREMENTS[acr];
    const declared = new Set([...r.fields, ...(r.exclusionFields ?? [])]);
    for (const f of fieldsReadByComputation(m)) assert.ok(declared.has(f), `${acr} reads ${f}, which is not declared`);
    for (const f of declared) assert.ok(f in obs.OBSERVABLE_FIELDS, `${acr}: unknown field ${f}`);
    for (const c of r.spanClasses) assert.ok(obs.SPAN_CLASSES.includes(c), `${acr}: unknown span class ${c}`);
  }
});

test('OR-03 composite metrics inherit the requirements of their dependencies (direct vs inherited)', () => {
  const r = obs.resolveObservationRequirements(['Econdex', 'LPI', 'PhysicalFootprint', 'UIFu', 'NNCv']);
  const by = Object.fromEntries(r.metrics.map((m) => [m.acronym, m]));
  assert.deepEqual(by.Econdex.direct.fields, []);
  assert.deepEqual(by.Econdex.dependencies, ['Dom', 'HTTPNb', 'Weight']);
  assert.deepEqual(by.Econdex.inheritedSpanClasses, ['browser.document-load', 'browser.http-client', 'ui.navigation-click']);
  assert.ok(by.Econdex.inheritedFields.includes('app.system.domelement') && by.Econdex.inheritedFields.includes('http.response_content_length'));
  assert.deepEqual(by.LPI.inheritedFields, ['http.method', 'span.duration', 'span.endTime', 'span.startTime']);
  assert.ok(by.PhysicalFootprint.fields.includes('app.system.cpuusage') && by.PhysicalFootprint.fields.includes('app.system.uptime'));
  // UIFu: direct = recognized interaction type + user identifier; NoU (its dependency) adds nothing new
  assert.deepEqual([...by.UIFu.direct.fields].sort(), ['app.user.id', 'event_type']);
  assert.deepEqual(by.UIFu.dependencies, ['NoU']);
  assert.deepEqual(by.UIFu.inheritedFields, []);
  assert.ok(!by.UIFu.fields.includes('span.startTime') && !by.UIFu.fields.some((f) => f.startsWith('target')), 'UIFu reads no timestamp and no target');
  // NNCv: navigation clicks per visit; inherits nothing beyond its own fields from NoV
  assert.deepEqual(by.NNCv.spanClasses, ['ui.interaction', 'ui.navigation-click']);
  assert.deepEqual(by.NNCv.events, ['*', 'click']);
});

test('OR-04 union over several selected metrics is deduplicated', () => {
  const r = obs.resolveObservationRequirements(['UIFu', 'NoU', 'DTu', 'NoU', 'ART']);
  assert.deepEqual(r.metrics.map((m) => m.acronym), ['ART', 'DTu', 'NoU', 'UIFu']);
  assert.equal(new Set(r.fields).size, r.fields.length);
  assert.deepEqual(r.spanClasses, ['server.http', 'ui.interaction']);
  assert.ok(r.fields.includes('span.duration') && r.fields.includes('app.user.id'));
});

test('OR-05 resolution is deterministic (input order and repetition do not matter)', () => {
  const a = obs.resolveObservationRequirements(['NNCs', 'AD', 'Weight', 'SQLI']);
  const b = obs.resolveObservationRequirements(['SQLI', 'Weight', 'AD', 'NNCs', 'AD']);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

test('OR-06 cycles and dependencies on undeclared metrics are explicit errors', () => {
  const cyclic = { A: { spanClasses: [], fields: [], dependsOn: ['B'] }, B: { spanClasses: [], fields: [], dependsOn: ['A'] } };
  assert.throws(() => obs.resolveObservationRequirements(['A'], cyclic), (e) => e.code === 'DEPENDENCY_CYCLE' && /A -> B -> A/.test(e.message));
  const dangling = { A: { spanClasses: [], fields: [], dependsOn: ['Z'] } };
  assert.throws(() => obs.resolveObservationRequirements(['A'], dangling), (e) => e.code === 'UNKNOWN_DEPENDENCY');
});

test('OR-07 metrics without a declared requirement are reported, not ignored', () => {
  const r = obs.resolveObservationRequirements(['NoU', 'UnknownMetric']);
  assert.deepEqual(r.unresolved, ['UnknownMetric']);
  assert.deepEqual(r.metrics.map((m) => m.acronym), ['NoU']);
});
