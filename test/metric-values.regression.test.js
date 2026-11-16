/*
 * Regression tests for metric values under empty inputs, zero denominators, zero-duration windows and
 * repeated computations (stale child dependencies), for every metric mapped by the nine executable leaf goals.
 *
 * Policy (author, Pass 23): an empty observation set or a zero denominator gives a finite 0; NaN and Infinity
 * never enter normalization, aggregation, persistence or the dashboard; a non-finite value produced by a
 * computation error is reported as an error, never converted into a valid 0.
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
const { MetricsComputer } = req('core/metrics/metrics-computation');
const { AssessmentEngine } = req('core/assessment/assessment-core');
console.log = () => {}; console.warn = () => {};

const T0 = 1700000000;
const span = (o) => ({
  name: o.name || 'span', startTime: [T0 + (o.s || 0), 0], endTime: [T0 + (o.e ?? (o.s || 0) + 1), 0],
  duration: o.d !== undefined ? [o.d, 0] : undefined, attributes: o.a || {},
});
const ids = (u, v, s) => ({ 'app.user.id': u, 'app.visit.id': v, 'app.session.id': s });

const CONDITIONS = {
  empty: [],
  no_identifiers: [span({ a: { event_type: 'click' } }), span({ a: { event_type: 'submit' } })],
  single_http_span: [span({ s: 0, e: 0, d: 0.12, a: { 'http.method': 'GET', 'http.url': 'http://x/a', ...ids('u1', 'v1', 's1') } })],
  login_successes_only: [span({ a: { 'http.method': 'POST', 'http.url': 'http://x/login', 'http.status_code': 200, ...ids('u1', 'v1', 's1') } })],
  zero_uptime: [span({ a: { 'app.system.cputime': '5000', 'app.system.uptime': 0, 'app.system.cpuusage': '10', 'app.system.memory': '20' } })],
  irrelevant_spans_only: [span({ name: 'documentLoad', a: { foo: 'bar' } })],
};
const TWO_USERS = [
  span({ s: 0, e: 2, a: { event_type: 'click', ...ids('u1', 'v1', 's1') } }),
  span({ s: 1, e: 3, a: { event_type: 'click', ...ids('u1', 'v1', 's1') } }),
  span({ s: 2, e: 4, a: { event_type: 'submit', ...ids('u2', 'v2', 's2') } }),
  span({ s: 3, e: 5, a: { event_type: 'change', ...ids('u2', 'v2', 's2') } }),
  span({ s: 4, e: 6, a: { event_type: 'click', ...ids('u2', 'v2', 's2') } }),
];

const GOALS = {
  frontend: ['Popularity', 'Activity', 'Loyalty', 'Ecological Footprint'],
  backend: ['Time Behavior', 'Resource Utilization', 'Physical Footprint', 'Confidentiality', 'Non-repudiation'],
};

function model(type) {
  const md = new ApplicationMetadata('t', type, type === 'frontend' ? 'Angular' : 'Node.js', '/x', 'http://x');
  const s = new SSQMM(md); s.buildMap();
  return { md, s };
}
function compute(metrics, data) {
  metrics.forEach((m) => m.resetValue());
  metrics.forEach((m) => m.computeValue(data));
}

test('MV-01 every mapped metric is finite under every empty / zero-denominator / zero-duration condition', () => {
  let checked = 0;
  for (const type of Object.keys(GOALS)) {
    for (const [cname, data] of Object.entries(CONDITIONS)) {
      const { s } = model(type);
      for (const g of GOALS[type]) {
        const ms = Array.from(s.qualityModel.getGoalByName(g).metrics);
        compute(ms, data);
        ms.forEach((m) => { assert.ok(Number.isFinite(m.value), `${type}/${cname}/${g}/${m.acronym} = ${m.value}`); checked++; });
      }
    }
  }
  assert.equal(checked, Object.keys(CONDITIONS).length * 53, 'all 53 goal-metric relations checked per condition');
});

test('MV-02 UIFu, UIFv, UIFs: finite 0 when no user, visit or session is observed', () => {
  const { s } = model('frontend');
  const ms = Array.from(s.qualityModel.getGoalByName('Activity').metrics);
  for (const data of [CONDITIONS.empty, CONDITIONS.no_identifiers]) {
    compute(ms, data);
    for (const a of ['UIFu', 'UIFv', 'UIFs']) assert.equal(ms.find((m) => m.acronym === a).value, 0, a);
  }
});

test('MV-03 non-zero computations preserved: UIFu worked example and ratio metrics', () => {
  const { s } = model('frontend');
  const act = Array.from(s.qualityModel.getGoalByName('Activity').metrics);
  const pop = Array.from(s.qualityModel.getGoalByName('Popularity').metrics);
  compute(act, TWO_USERS); compute(pop, TWO_USERS);
  const v = (ms, a) => ms.find((m) => m.acronym === a).value;
  assert.equal(v(act, 'UIFu'), 2.5);   // 5 interactions / 2 users (Pass 21 P9 worked example)
  assert.equal(v(act, 'UIFv'), 2.5);
  assert.equal(v(act, 'UIFs'), 2.5);
  assert.equal(v(pop, 'NoU'), 2);
  assert.equal(v(pop, 'NoVu'), 1);
  assert.equal(v(act, 'DTu'), 3500);   // u1: 0-3 s, u2: 2-6 s -> (3000 + 4000) / 2 ms
});

test('MV-04 stale dependency: a recomputation never reuses the user count of a previous telemetry set', () => {
  const { s } = model('frontend');
  const ms = Array.from(s.qualityModel.getGoalByName('Activity').metrics);
  compute(ms, TWO_USERS);
  assert.equal(ms.find((m) => m.acronym === 'UIFu').value, 2.5);
  compute(ms, CONDITIONS.no_identifiers); // 2 interactions, no user id
  assert.equal(ms.find((m) => m.acronym === 'UIFu').value, 0, 'previously 1 (= 2 interactions / stale NoU 2)');
  ms.filter((m) => m.isComposite()).forEach((m) => Object.values(m.children).forEach((c) => {
    assert.equal(c.value, 0, `${m.acronym}.${c.acronym} child reflects the current telemetry`);
  }));
});

test('MV-05 TPUT: zero-length observation window gives 0 instead of Infinity; positive window unchanged', () => {
  const { s } = model('backend');
  const tb = Array.from(s.qualityModel.getGoalByName('Time Behavior').metrics);
  const tput = tb.find((m) => m.acronym === 'TPUT');
  compute(tb, CONDITIONS.single_http_span);
  assert.equal(tput.value, 0);
  compute(tb, [0, 1, 2, 3, 4].map((i) => span({ s: i, e: i + 1, a: { 'http.method': 'GET' } })));
  assert.equal(tput.value, 1); // 5 requests in a 5 s window
});

test('MV-06 LoginRatio and LoginRatioS: 0 when no failure is observed (previously NaN or Infinity)', () => {
  const { s } = model('backend');
  const nr = Array.from(s.qualityModel.getGoalByName('Non-repudiation').metrics);
  for (const data of [CONDITIONS.empty, CONDITIONS.login_successes_only]) {
    compute(nr, data);
    for (const a of ['LoginRatio', 'LoginRatioS']) assert.equal(nr.find((m) => m.acronym === a).value, 0, a);
  }
  const mixed = [200, 200, 401].map((st) => span({ a: { 'http.method': 'POST', 'http.url': 'http://x/login', 'http.status_code': st, ...ids('u1', 'v1', 's1') } }));
  compute(nr, mixed);
  assert.equal(nr.find((m) => m.acronym === 'LoginRatio').value, 2);
});

test('MV-07 PhysicalFootprint: zero uptime gives a finite value (CPU-time term 0)', () => {
  const { s } = model('backend');
  const pf = Array.from(s.qualityModel.getGoalByName('Physical Footprint').metrics);
  compute(pf, CONDITIONS.zero_uptime);
  const v = pf.find((m) => m.acronym === 'PhysicalFootprint').value;
  assert.ok(Number.isFinite(v));
  assert.equal(+v.toFixed(6), 0.1); // 0.4*10/100 + 0.3*20/100 + 0.2*0
});

test('MV-08 goal scores are finite for every goal and condition (aggregation never receives NaN/Infinity)', () => {
  for (const type of Object.keys(GOALS)) {
    for (const [cname, data] of Object.entries(CONDITIONS)) {
      const { md, s } = model(type);
      for (const g of GOALS[type]) {
        const goal = s.qualityModel.getGoalByName(g);
        const ms = Array.from(goal.metrics);
        compute(ms, data);
        ms.forEach((m) => { m._history = [{ timestamp: 't', value: m.value }]; });
        const [a] = new AssessmentEngine().assess({ metadata: md, selectedGoals: [goal] }, ms);
        assert.ok(Number.isFinite(a.globalScore) && a.globalScore >= 0 && a.globalScore <= 1, `${type}/${cname}/${g}: ${a.globalScore}`);
        a.assessments.forEach((d) => assert.ok(d.value >= 0 && d.value <= 1, `${g}/${d.metric}: ${d.value}`));
      }
    }
  }
});

test('MV-09 a non-finite value from a computation error is reported, not converted into 0', async () => {
  const bad = { acronym: 'BAD', name: 'bad', value: undefined, resetValue() { this.value = undefined; }, computeValue() { this.value = NaN; } };
  const ds = { connect: async () => {}, disconnect: async () => {}, read: async () => [] };
  const mc = new MetricsComputer([bad], ds);
  await assert.rejects(mc.computeMetrics({ type: 1, uri: 'mongodb://x', name: 'x' }, { bundleName: 'a_1.bundle.js' }),
    (e) => e.name === 'MetricComputationError' && /BAD/.test(e.message));
});

test('MV-10 a telemetry read failure is an error, not an empty telemetry set', async () => {
  const { s } = model('frontend');
  const ms = Array.from(s.qualityModel.getGoalByName('Popularity').metrics);
  const ds = { connect: async () => {}, disconnect: async () => {}, read: async () => { throw new Error('connection refused'); } };
  await assert.rejects(new MetricsComputer(ms, ds).computeMetrics({ type: 1, uri: 'mongodb://x', name: 'x' }, { bundleName: 'a_1.bundle.js' }), /connection refused/);
  const ds2 = { connect: async () => {}, disconnect: async () => {}, read: async () => undefined };
  await assert.rejects(new MetricsComputer(ms, ds2).computeMetrics({ type: 1, uri: 'mongodb://x', name: 'x' }, { bundleName: 'a_1.bundle.js' }),
    (e) => e.name === 'MetricComputationError');
});
