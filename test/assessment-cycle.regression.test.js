/*
 * Regression tests for the assessment cycle (telemetry flush -> metrics -> benchmarks -> normalization ->
 * aggregation -> one persisted record -> published event).
 *
 * Guards against: the one-cycle lag (scores computed from the previous flush), duplicate first records,
 * inconsistent timestamps, stale metric state, benchmark sharing between applications, benchmark loss on
 * restart, missing benchmark information in records, and failures published as completed assessments.
 *
 * Uses an in-memory collector, telemetry data source and benchmark persistence (no database, no network).
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
const { MetricsService } = req('services/metrics.service');
const { QualityAssessmentService } = req('services/quality-assessment.service');
const { ProgressTracker } = req('services/progress-tracker.service');
const { BenchmarkStore, InMemoryBenchmarkPersistence } = req('core/metrics/benchmarks');
const { buildAssessmentEventData } = req('api/assessment-events');
console.log = () => {}; console.warn = () => {}; console.error = () => {};

const ENDPOINT = { type: 1, name: 'test-db', uri: 'mongodb://in-memory' };
const T0 = 1700000000;
const ids = (u, v, s) => ({ 'app.user.id': u, 'app.visit.id': v, 'app.session.id': s });
const click = (i, u) => ({ name: 'click', startTime: [T0 + i, 0], endTime: [T0 + i + 1, 0], attributes: { event_type: 'click', ...ids(u, `v-${u}`, `s-${u}`) } });
const http = (i, ms) => ({ name: 'GET', startTime: [T0 + i, 0], endTime: [T0 + i, ms * 1e6], duration: [0, ms * 1e6], attributes: { 'http.method': 'GET', ...ids('srv', 'srv', 'srv') } });

/** In-memory telemetry store shared by the fake collector and the fake data sources. */
function world() {
  const db = {}; let readFailure = null;
  const factory = () => ({
    connect: async () => {}, disconnect: async () => {},
    read: async ({ appInstrumentationMetadata }) => {
      if (readFailure) throw readFailure;
      return [...(db[path.basename(appInstrumentationMetadata.bundleName)] ?? [])];
    },
  });
  const collector = {
    listeners: [], stored: [], storeFailure: null,
    on(ev, l) { this.listeners.push(l); },
    async storeAssessments(assessments, { appInstrumentationMetadata }) {
      if (this.storeFailure) throw this.storeFailure;
      assessments.forEach((a) => this.stored.push({ bundle: path.basename(appInstrumentationMetadata.bundleName), record: JSON.parse(JSON.stringify({
        goal: a.goal.name, globalScore: a.globalScore, timestamp: a.timestamp, status: a.status, cycle: a.cycle,
        telemetryCount: a.telemetryCount, normalization: a.normalization, details: a.assessments })) }));
    },
    /** persists the batch, then notifies (as TelemetryCollector.flushData does) */
    flush(batch) {
      batch.forEach(({ bundle, spans }) => { db[bundle] = [...(db[bundle] ?? []), ...spans]; });
      this.listeners.forEach((l) => l([ENDPOINT], batch.map((b) => b.bundle)));
    },
  };
  return { db, factory, collector, failRead: (e) => { readFailure = e; } };
}

function session(w, { app, bundle, type = 'frontend', goals = ['Popularity', 'Activity'], store }) {
  const md = new ApplicationMetadata(app, type, type === 'frontend' ? 'Angular' : 'Node.js', '/x', 'http://x');
  const s = new SSQMM(md); s.buildMap();
  const selected = goals.map((g) => s.qualityModel.getGoalByName(g));
  const qas = new QualityAssessmentService({ metricsService: new MetricsService(w.factory), benchmarkStore: store });
  qas.setProgressTracker(new ProgressTracker());
  qas.setContext({ appMetadata: md, bundleName: `/tmp/${bundle}` }, selected, w.collector);
  const events = [];
  qas.onAssessmentUpdated((g, e) => events.push(e));
  qas.onAssessmentFailed((e) => events.push(e));
  const first = qas.assessQualityGoals();
  first.catch(() => {});
  return { qas, selected, events, first, settle: () => new Promise((r) => setImmediate(() => setImmediate(r))).then(() => qas['queue']) };
}
const recordsOf = (w, bundle, goal) => w.collector.stored.filter((x) => x.bundle === bundle && x.record.goal === goal).map((x) => x.record);
const detail = (rec, acr) => rec.details.find((d) => d.metric === acr);

test('AC-01 first flush: exactly one record per goal, computed from the telemetry of that flush (no lag)', async () => {
  const w = world();
  const store = new BenchmarkStore(new InMemoryBenchmarkPersistence());
  const S = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store });
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1'), click(1, 'u1'), click(2, 'u2')] }]);
  await S.settle(); await S.first;
  const pop = recordsOf(w, 'appa_1.bundle.js', 'Popularity');
  assert.equal(pop.length, 1, 'one record (previously two records, both valued 0)');
  assert.equal(detail(pop[0], 'NoU').rawValue, 2, 'NoU of this flush (previously the reset value 0)');
  assert.equal(detail(recordsOf(w, 'appa_1.bundle.js', 'Activity')[0], 'UIFu').rawValue, 1.5);
  assert.equal(pop[0].cycle, 1); assert.equal(pop[0].status, 'completed'); assert.equal(pop[0].telemetryCount, 3);
  assert.deepEqual(S.events.map((e) => e.status), ['completed']);
});

test('AC-02 subsequent flushes: one record per cycle; values follow the cumulative bundle telemetry; consistent timestamps', async () => {
  const w = world();
  const S = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store: new BenchmarkStore() });
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1')] }]); await S.settle();
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(1, 'u2'), click(2, 'u3')] }]); await S.settle();
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(3, 'u3')] }]); await S.settle();
  const pop = recordsOf(w, 'appa_1.bundle.js', 'Popularity');
  assert.deepEqual(pop.map((r) => r.cycle), [1, 2, 3]);
  assert.deepEqual(pop.map((r) => detail(r, 'NoU').rawValue), [1, 3, 3]);
  for (const r of pop) r.details.forEach((d) => assert.equal(d.timestamp, r.timestamp, 'detail and record share the cycle timestamp'));
  const act = recordsOf(w, 'appa_1.bundle.js', 'Activity');
  pop.forEach((r, i) => assert.equal(act[i].timestamp, r.timestamp, 'all goals of a cycle share its timestamp'));
  const nou = S.selected[0].metrics.values().next().value;
  assert.deepEqual(nou.history.map((h) => h.timestamp), pop.map((r) => r.timestamp), 'metric history uses the cycle timestamps');
});

test('AC-03 two concurrent applications on one collector: no cross-triggering, no shared benchmarks', async () => {
  const w = world();
  const store = new BenchmarkStore(new InMemoryBenchmarkPersistence());
  const A = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store });
  const B = session(w, { app: 'appb', bundle: 'appb_1.bundle.js', store });
  const many = Array.from({ length: 300 }, (_, i) => click(i, `u${i}`));
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: many }]); await A.settle(); await B.settle();
  assert.equal(B.events.length, 0, 'a flush of application A does not trigger B');
  w.collector.flush([{ bundle: 'appb_1.bundle.js', spans: [click(0, 'x1'), click(1, 'x2')] }]); await A.settle(); await B.settle();
  assert.equal(A.events.length, 1);
  const bNoU = detail(recordsOf(w, 'appb_1.bundle.js', 'Popularity')[0], 'NoU');
  assert.equal(bNoU.benchmark, 200, "B's benchmark is not raised by A's 300 users");
  assert.equal(detail(recordsOf(w, 'appa_1.bundle.js', 'Popularity')[0], 'NoU').benchmark, 300);
  assert.equal(recordsOf(w, 'appb_1.bundle.js', 'Popularity')[0].normalization.benchmarkScope, 'application:appb');
});

test('AC-04 service restart: the benchmark state is restored from persistence', async () => {
  const w = world();
  const persistence = new InMemoryBenchmarkPersistence();
  const S1 = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store: new BenchmarkStore(persistence) });
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: Array.from({ length: 250 }, (_, i) => click(i, `u${i}`)) }]); await S1.settle();
  // "restart": new collector listeners, new services and a new store over the same persistence
  const w2 = world();
  const S2 = session(w2, { app: 'appa', bundle: 'appa_2.bundle.js', store: new BenchmarkStore(persistence) });
  w2.collector.flush([{ bundle: 'appa_2.bundle.js', spans: [click(0, 'z1')] }]); await S2.settle();
  const d = detail(recordsOf(w2, 'appa_2.bundle.js', 'Popularity')[0], 'NoU');
  assert.equal(d.benchmark, 250, 'previously reset to b0 = 200 by a restart');
  assert.equal(d.value, 1 / 250);
});

test('AC-05 distinct instrumentation bundles: each assessment only reacts to its own bundle', async () => {
  const w = world();
  const store = new BenchmarkStore();
  const S1 = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store });
  const S2 = session(w, { app: 'appa', bundle: 'appa_2.bundle.js', store });
  w.collector.flush([{ bundle: 'appa_2.bundle.js', spans: [click(0, 'u1')] }]); await S1.settle(); await S2.settle();
  assert.equal(S1.events.length, 0); assert.equal(S2.events.length, 1);
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1')] }, { bundle: 'appa_2.bundle.js', spans: [click(1, 'u2')] }]);
  await S1.settle(); await S2.settle();
  assert.equal(S1.events.length, 1); assert.equal(S2.events.length, 2);
  assert.equal(detail(recordsOf(w, 'appa_1.bundle.js', 'Popularity')[0], 'NoU').rawValue, 1, 'bundle 1 telemetry only');
});

test('AC-06 missing telemetry (read failure): failed cycle, nothing persisted or published as completed', async () => {
  const w = world();
  const S = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store: new BenchmarkStore() });
  w.failRead(new Error('MongoServerSelectionError: connect ECONNREFUSED'));
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1')] }]); await S.settle();
  await assert.rejects(S.first, /ECONNREFUSED/);
  assert.equal(w.collector.stored.length, 0);
  assert.deepEqual(S.events.map((e) => e.status), ['failed']);
  assert.equal(S.qas.status.status, 'failed');
  assert.equal(S.selected[0].assessments.length, 0, 'no assessment attached to the goal');
});

test('AC-07 storage failure: the cycle is failed and not published as completed', async () => {
  const w = world();
  const S = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store: new BenchmarkStore() });
  w.collector.storeFailure = new Error('write conflict');
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1')] }]); await S.settle();
  assert.deepEqual(S.events.map((e) => e.status), ['failed']);
  w.collector.storeFailure = null;
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(1, 'u2')] }]); await S.settle();
  assert.deepEqual(S.events.map((e) => e.status), ['failed', 'completed'], 'the next cycle recovers');
  assert.equal(recordsOf(w, 'appa_1.bundle.js', 'Popularity')[0].cycle, 2);
});

test('AC-08 metric change between cycles and monotonicity: slower responses lower the Time Behavior score', async () => {
  const w = world();
  const S = session(w, { app: 'srv', bundle: 'srv_1.bundle.js', type: 'backend', goals: ['Time Behavior'], store: new BenchmarkStore() });
  w.collector.flush([{ bundle: 'srv_1.bundle.js', spans: [http(0, 100), http(1, 100)] }]); await S.settle();
  w.collector.flush([{ bundle: 'srv_1.bundle.js', spans: [http(2, 900), http(3, 900)] }]); await S.settle();
  const [r1, r2] = recordsOf(w, 'srv_1.bundle.js', 'Time Behavior');
  assert.equal(detail(r1, 'ART').rawValue, 100); assert.equal(detail(r2, 'ART').rawValue, 500);
  assert.ok(detail(r2, 'ART').value < detail(r1, 'ART').value, 'higher ART -> lower normalized value');
  assert.equal(detail(r1, 'ART').polarity, 'lower-is-better');
  assert.ok(r2.globalScore < r1.globalScore, `score ${r1.globalScore} -> ${r2.globalScore}`);
});

test('AC-09 record consistency: every normalized value is recomputable from raw value, benchmark and polarity', async () => {
  const w = world();
  const S = session(w, { app: 'srv', bundle: 'srv_1.bundle.js', type: 'backend', goals: ['Time Behavior'], store: new BenchmarkStore() });
  w.collector.flush([{ bundle: 'srv_1.bundle.js', spans: [http(0, 120), http(1, 480), http(2, 60)] }]); await S.settle();
  const [r] = recordsOf(w, 'srv_1.bundle.js', 'Time Behavior');
  let num = 0, den = 0;
  for (const d of r.details) {
    for (const k of ['rawValue', 'benchmark', 'initialBenchmark', 'benchmarkKind', 'polarity', 'observed']) assert.ok(d[k] !== undefined, `${d.metric}.${k}`);
    const ratio = d.benchmark > 0 ? Math.min(1, Math.max(0, d.rawValue / d.benchmark)) : (d.rawValue > 0 ? 1 : 0);
    const expected = !d.observed ? 0 : d.polarity === 'lower-is-better' ? 1 - ratio : ratio;
    assert.equal(d.value, expected, d.metric);
    num += d.value * d.weight; den += d.weight;
  }
  assert.equal(r.globalScore, num / den);
  assert.deepEqual(r.normalization, { method: 'ratio-to-benchmark', version: 'pass23-polarity-v1', benchmarkMode: 'dynamic-max', benchmarkScope: 'application:srv' });
});

test('AC-10 event stream: the published payload carries the completed, persisted assessment', async () => {
  const w = world();
  const S = session(w, { app: 'appa', bundle: 'appa_1.bundle.js', store: new BenchmarkStore() });
  let payload;
  S.qas.onAssessmentUpdated((goals, event) => { payload = JSON.parse(JSON.stringify(buildAssessmentEventData({ name: 'appa' }, goals, event))); });
  w.collector.flush([{ bundle: 'appa_1.bundle.js', spans: [click(0, 'u1'), click(1, 'u2')] }]); await S.settle();
  const goal = payload.selectedGoals.find((g) => g.name === 'Popularity');
  const last = goal.assessments[goal.assessments.length - 1];
  const stored = recordsOf(w, 'appa_1.bundle.js', 'Popularity')[0];
  assert.equal(payload.cycle.status, 'completed');
  assert.equal(last.timestamp, stored.timestamp); assert.equal(last.globalScore, stored.globalScore);
  assert.deepEqual(last.details, stored.details);
  assert.equal(goal.metrics.find((m) => m.acronym === 'NoU').value, detail(stored, 'NoU').rawValue, 'metric values equal the stored raw values (no lag)');
  for (const k of ['name', 'description', 'weight', 'metrics', 'assessments']) assert.ok(k in goal, `dashboard field ${k}`);
});
