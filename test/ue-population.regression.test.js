/*
 * Regression tests for the observation population of the 20 User Engagement metrics
 * (src/modules/metrics/interaction-capability/user-engagement/user-engagement-population.ts).
 *
 * Guards against: users, visits, sessions, days or durations contributed by non-interaction spans
 * (document load, Fetch, XHR) that change interaction-based metrics (e.g. a non-interacting user lowering
 * UIFu); ratio numerators drawn from a different population than their denominators (unidentified
 * interactions counted per identified user); non-finite results; composites using another population
 * than their children; unintended changes of metrics outside User Engagement.
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
const { CompositeGoal } = req('core/goals/goals');
console.log = () => {}; console.warn = () => {};

const T0 = 1763300000;
const ids = (u) => ({ 'app.user.id': `user-${u}`, 'app.visit.id': `visit-${u}-1`, 'app.session.id': `session-${u}-1` });
const ui = (i, u, ev, name = ev) => ({ name, startTime: [T0 + i, 0], endTime: [T0 + i, 4e6], attributes: { event_type: ev, ...ids(u) } });
const xhr = (i, u) => ({ name: 'HTTP POST', startTime: [T0 + i, 0], endTime: [T0 + i, 30e6], attributes: { 'http.method': 'POST', 'http.url': 'http://localhost:5000/api/posts', ...ids(u) } });
const fetchSpan = (i, u) => ({ name: 'HTTP GET', startTime: [T0 + i, 0], endTime: [T0 + i, 20e6], attributes: { 'http.method': 'GET', 'http.url': 'http://localhost:5000/api/users', ...ids(u) } });
const docLoad = (i, u) => ({ name: 'documentLoad', startTime: [T0 + i, 0], endTime: [T0 + i + 1, 0], attributes: { 'http.url': 'http://localhost:4200/posts', ...ids(u) } });

/** Pass 25 interaction set: user A navigates twice, edits, submits; user B navigates once. */
const BASE = [
  ui(10, 'A', 'click', 'Navigation: /users'), ui(20, 'A', 'click', 'Navigation: /new-post'), ui(30, 'A', 'change'),
  ui(40, 'A', 'submit'), ui(50, 'B', 'click', 'Navigation: /users'),
];

function ueMetrics() {
  const s = new SSQMM(new ApplicationMetadata('app', 'frontend', 'Angular', '/x', 'http://x')); s.buildMap();
  const out = {};
  const visit = (g) => (g instanceof CompositeGoal ? g.subGoals.forEach(visit) : g.metrics.forEach((m) => { out[m.acronym] = m; }));
  s.goals.forEach(visit);
  return ['NoU', 'NoV', 'NoS', 'NoVu', 'NoSu', 'NoSv', 'UIFu', 'UIFv', 'UIFs', 'DTu', 'DTv', 'DTs', 'NNCu', 'NNCv', 'NNCs', 'AD', 'ADu', 'RR', 'DTRv', 'DTRs']
    .map((a) => out[a]);
}
function values(data) {
  const r = {};
  for (const m of ueMetrics()) { m.resetValue(); m.computeValue(data); r[m.acronym] = { value: m.value, observations: m.observations }; }
  return r;
}
const valueOf = (data) => Object.fromEntries(Object.entries(values(data)).map(([k, v]) => [k, v.value]));

test('UP-01 document-load, Fetch and XHR spans (with identifiers) do not change any User Engagement metric', () => {
  const base = valueOf(BASE);
  assert.deepEqual(valueOf([...BASE, xhr(41, 'A')]), base, 'XHR span of user A');
  assert.deepEqual(valueOf([...BASE, fetchSpan(42, 'B')]), base, 'Fetch span of user B');
  assert.deepEqual(valueOf([...BASE, docLoad(60, 'C')]), base, 'document-load span of a non-interacting user C');
  assert.equal(base.NoU, 2); assert.equal(base.UIFu, 2.5);
});

test('UP-02 qualifying interaction spans change the corresponding metrics', () => {
  const v = valueOf([...BASE, ui(60, 'C', 'click', 'Navigation: /posts')]);
  assert.equal(v.NoU, 3); assert.equal(v.UIFu, 2); assert.equal(v.NNCu, 4 / 3); assert.equal(v.NoV, 3);
});

test('UP-03 missing identifiers: an interaction without app.user.id counts in no per-user metric (numerator or denominator)', () => {
  const anonymous = { name: 'click', startTime: [T0 + 70, 0], endTime: [T0 + 70, 4e6], attributes: { event_type: 'click' } };
  const v = valueOf([...BASE, anonymous]);
  assert.equal(v.NoU, 2); assert.equal(v.UIFu, 2.5, 'previously 3: the unidentified interaction entered the numerator only');
  assert.equal(v.UIFv, 2.5); assert.equal(v.UIFs, 2.5);
  assert.equal(v.AD, 1, 'the unkeyed activity-day metric counts every interaction span');
  const visitOnly = { name: 'click', startTime: [T0 + 80, 0], endTime: [T0 + 80, 4e6], attributes: { event_type: 'click', 'app.visit.id': 'visit-X-1' } };
  const w = valueOf([...BASE, visitOnly]);
  assert.equal(w.NoU, 2); assert.equal(w.UIFu, 2.5); assert.equal(w.NoV, 3); assert.equal(w.UIFv, 2, 'per-visit metrics use the visit identifier');
});

test('UP-04 empty input and non-interaction-only input: finite 0 with 0 observations for all 20 metrics', () => {
  for (const data of [[], [xhr(1, 'A'), docLoad(2, 'B'), fetchSpan(3, 'C')]]) {
    for (const [acr, r] of Object.entries(values(data))) {
      assert.equal(r.value, 0, acr); assert.ok(Number.isFinite(r.value), acr); assert.equal(r.observations, 0, acr);
    }
  }
});

test('UP-05 composites and their children use the same population (NoVu, ADu, RR, DTRv)', () => {
  const v = valueOf([...BASE, docLoad(60, 'C'), { ...docLoad(61, 'A'), attributes: { ...docLoad(61, 'A').attributes, 'app.visit.id': 'visit-A-2' } }]);
  assert.equal(v.NoVu, 1, 'the second visit of A (document load only) is not counted');
  assert.equal(v.RR, 0, 'no return without an interaction in the second visit');
  assert.equal(v.ADu, 1);
  assert.equal(v.DTRv, (4 * 4 + 4) / 2, 'sum of interaction-span durations per user and visit, averaged over users (ms)');
});

test('UP-06 durations use interaction spans only (Pass 25 example: XHR span excluded from DTu)', () => {
  const v = valueOf([...BASE, xhr(41, 'A')]);
  assert.equal(v.DTu, (30004 + 4) / 2, 'A: 10 s .. 40.004 s; B: 4 ms (Pass 25 baseline: 15517 with the XHR span)');
  assert.equal(v.DTRv, (16 + 4) / 2, 'Pass 25 baseline: 25 with the XHR span');
});

test('UP-07 metrics outside User Engagement are unchanged by the population helper', () => {
  const s = new SSQMM(new ApplicationMetadata('b', 'backend', 'Node.js', '/x', 'http://x')); s.buildMap();
  const tb = s.qualityModel.getGoalByName('Time Behavior');
  const nhr = Array.from(tb.metrics).find((m) => m.acronym === 'NHR');
  const art = Array.from(tb.metrics).find((m) => m.acronym === 'ART');
  const http = (i, ms) => ({ name: 'GET', startTime: [T0 + i, 0], endTime: [T0 + i, ms * 1e6], attributes: { 'http.method': 'GET' } });
  const data = [http(0, 10), http(1, 30), ui(2, 'A', 'click')];
  nhr.resetValue(); art.resetValue();
  assert.equal(nhr.computeValue(data), 2); assert.equal(art.computeValue(data), 20);
});

test('UP-08 recognized interaction events: any UserInteractionEvent name; unknown event types are excluded', () => {
  const v = valueOf([ui(1, 'A', 'dblclick'), ui(2, 'A', 'keydown'), ui(3, 'B', 'not-an-event')]);
  assert.equal(v.NoU, 1); assert.equal(v.UIFu, 2);
});
