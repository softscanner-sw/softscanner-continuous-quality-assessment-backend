/*
 * Regression tests for metric polarity and normalization.
 *
 * Guards against: lower-is-better measurements (response times, resource use, page weight, attack indicators)
 * raising goal scores; normalized values outside [0, 1] or non-finite; unobserved metrics receiving a perfect
 * score; base weights of the expanded interpreters being used as benchmarks; unclassified metrics.
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
const { METRIC_SEMANTICS, semanticsOf } = req('core/metrics/metric-semantics');
const { BenchmarkStore, InMemoryBenchmarkPersistence } = req('core/metrics/benchmarks');
console.log = () => {}; console.warn = () => {};

function allRelations() {
  const out = [];
  for (const [type, tech] of [['frontend', 'Angular'], ['backend', 'Node.js']]) {
    const s = new SSQMM(new ApplicationMetadata('t', type, tech, '/x', 'http://x')); s.buildMap();
    for (const g of ['Popularity', 'Activity', 'Loyalty', 'Ecological Footprint', 'Time Behavior', 'Resource Utilization', 'Physical Footprint', 'Confidentiality', 'Non-repudiation']) {
      const goal = s.qualityModel.getGoalByName(g);
      goal.metrics.forEach((m) => out.push({ type, goal, metric: m }));
    }
  }
  return out;
}
const withValue = (metric, value, observations) => { metric._value = value; metric._observations = observations; return metric; };

test('NP-01 every implemented metric has an explicit polarity classification (49 acronyms)', () => {
  const acronyms = new Set(allRelations().map((r) => r.metric.acronym));
  assert.equal(acronyms.size, 49);
  for (const a of acronyms) assert.ok(METRIC_SEMANTICS[a], `${a} classified`);
  const count = (p) => [...acronyms].filter((a) => semanticsOf(a).polarity === p).length;
  assert.deepEqual([count('higher-is-better'), count('lower-is-better'), count('unspecified')], [20, 16, 13]);
});

test('NP-02 lower-is-better: an increase in the measured value never raises the normalized value', () => {
  for (const { goal, metric } of allRelations()) {
    const pol = semanticsOf(metric.acronym).polarity;
    let prev;
    for (const m of [0, 1, 5, 10, 50, 100, 500, 1000, 5000]) {
      withValue(metric, m, 1);
      const cur = metric.getInterpter(goal).interpretDetailed(5000).normalized;
      if (prev !== undefined) {
        if (pol === 'lower-is-better') assert.ok(cur <= prev, `${metric.acronym}: m=${m} v=${cur} > ${prev}`);
        else assert.ok(cur >= prev, `${metric.acronym}: m=${m} v=${cur} < ${prev}`);
      }
      prev = cur;
    }
  }
});

test('NP-03 normalized values are finite and in [0, 1] for all metrics, benchmarks and boundary values', () => {
  for (const { goal, metric } of allRelations()) {
    for (const [m, b, n] of [[0, 0, 1], [0, 10, 1], [10, 10, 1], [20, 10, 1], [5, 0, 1], [3, 7, 0], [0, 0, 0]]) {
      withValue(metric, m, n);
      const v = metric.getInterpter(goal).interpretDetailed(b).normalized;
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, `${metric.acronym} m=${m} b=${b} n=${n}: ${v}`);
    }
  }
});

test('NP-04 lower-is-better formula v = 1 - m/b; higher-is-better v = m/b (unchanged)', () => {
  const rel = allRelations();
  const art = rel.find((r) => r.metric.acronym === 'ART');
  withValue(art.metric, 250, 4);
  const i = art.metric.getInterpter(art.goal).interpretDetailed(1000);
  assert.equal(i.normalized, 0.75); assert.equal(i.polarity, 'lower-is-better'); assert.equal(i.benchmark, 1000);
  const nou = rel.find((r) => r.metric.acronym === 'NoU');
  withValue(nou.metric, 50, undefined);
  assert.equal(nou.metric.getInterpter(nou.goal).interpretDetailed(200).normalized, 0.25);
});

test('NP-05 zero-benchmark behaviour: b = 0 and m = 0 gives 0 (higher) and 1 (lower) when observed', () => {
  const rel = allRelations();
  const mem = rel.find((r) => r.metric.acronym === 'Memory');
  withValue(mem.metric, 0, 3);
  assert.equal(mem.metric.getInterpter(mem.goal).interpretDetailed(0).normalized, 1);
  const nou = rel.find((r) => r.metric.acronym === 'NoU');
  withValue(nou.metric, 0, undefined);
  assert.equal(nou.metric.getInterpter(nou.goal).interpretDetailed(0).normalized, 0);
});

test('NP-06 unobserved metrics score 0 whatever their polarity (no evidence never improves a score)', () => {
  for (const { goal, metric } of allRelations()) {
    withValue(metric, 0, 0);
    const i = metric.getInterpter(goal).interpretDetailed(10);
    assert.equal(i.normalized, 0, metric.acronym); assert.equal(i.observed, false);
  }
});

test('NP-07 initial benchmarks: configured defaults kept; expanded metrics no longer use their base weight as b0', () => {
  const rel = allRelations();
  const b0 = (a) => { const r = rel.find((x) => x.metric.acronym === a); return r.metric.getInterpter(r.goal); };
  assert.equal(b0('NoU').initialBenchmark, 200); assert.equal(b0('NoU').benchmarkKind, 'configured-default');
  assert.equal(b0('ART').initialBenchmark, 1000);
  assert.equal(b0('USQLM').initialBenchmark, 1); assert.equal(b0('USQLM').benchmarkKind, 'definitional-bound');
  assert.equal(b0('XSSI').initialBenchmark, 100);
  assert.equal(b0('Econdex').initialBenchmark, 100);
  assert.equal(b0('Memory').initialBenchmark, 0); assert.equal(b0('Memory').benchmarkKind, 'none');
  for (const a of ['Dom', 'HTTPNb', 'Weight', 'Memory', 'cpu.usage', 'Loadavg', 'Ip', 'LoginS', 'PhysicalFootprint']) {
    assert.notEqual(b0(a).initialBenchmark, 0.4); assert.notEqual(b0(a).initialBenchmark, 0.3);
  }
});

test('NP-08 dependencies: LPI (composite of ART, P95RT, RTVar) is lower-is-better like its children', () => {
  for (const a of ['ART', 'P95RT', 'RTVar', 'LPI']) assert.equal(semanticsOf(a).polarity, 'lower-is-better');
  for (const a of ['Memory', 'cpu.usage', 'cputime.usage', 'PhysicalFootprint']) assert.equal(semanticsOf(a).polarity, 'lower-is-better');
  assert.equal(semanticsOf('uptime').polarity, 'unspecified');
});

test('NP-09 non-finite metric values or benchmarks raise an interpretation error', () => {
  const r = allRelations().find((x) => x.metric.acronym === 'ART');
  withValue(r.metric, NaN, 1);
  assert.throws(() => r.metric.getInterpter(r.goal).interpretDetailed(10), (e) => e.name === 'MetricInterpretationError');
  withValue(r.metric, 5, 1);
  assert.throws(() => r.metric.getInterpter(r.goal).interpretDetailed(Infinity), (e) => e.name === 'MetricInterpretationError');
});

test('NP-10 dynamic benchmark: b = max(b0, largest observed m in scope); fixed mode: b = b0', async () => {
  const store = new BenchmarkStore(new InMemoryBenchmarkPersistence());
  const e = (raw, observed = true) => [{ acronym: 'ART', raw, observed, initial: 1000, kind: 'configured-default' }];
  assert.equal((await store.resolve('app', e(200), 't1')).get('ART').benchmark, 1000);
  assert.equal((await store.resolve('app', e(1500), 't2')).get('ART').benchmark, 1500);
  assert.equal((await store.resolve('app', e(100), 't3')).get('ART').benchmark, 1500, 'the benchmark never decreases');
  assert.equal((await store.resolve('app', e(9999, false), 't4')).get('ART').benchmark, 1500, 'unobserved values do not move it');
  const fixed = new BenchmarkStore(new InMemoryBenchmarkPersistence(), 'fixed');
  assert.equal((await fixed.resolve('app', e(1500), 't')).get('ART').benchmark, 1000);
  await assert.rejects(fixed.resolve('app', [{ acronym: 'Memory', raw: 5, observed: true, initial: 0, kind: 'none' }], 't'),
    (err) => err.name === 'BenchmarkConfigurationError');
});

test('NP-11 Econdex without any observed EcoIndex input is unobserved (formula value 100 is not scored as best)', () => {
  const r = allRelations().find((x) => x.metric.acronym === 'Econdex');
  r.metric.resetValue(); r.metric.computeValue([]);
  assert.equal(r.metric.value, 100);
  const i = r.metric.getInterpter(r.goal).interpretDetailed(100);
  assert.equal(i.observed, false); assert.equal(i.normalized, 0);
  const spans = [{ name: 'Navigation: /a', startTime: [1, 0], endTime: [2, 0], attributes: { 'http.url': 'http://x/a', 'app.system.domelement': 300 } }];
  r.metric.resetValue(); r.metric.computeValue(spans);
  assert.ok(r.metric.observations > 0);
});
