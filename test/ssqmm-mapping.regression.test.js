/*
 * Regression tests for the goal-to-metric mapping (SSQMM / MetricsMapper).
 *
 * Guards against the switch fall-through in MetricsMapper.visitLeafGoal where
 * case "confidentiality" lacked a `break` and fell through to the Resource
 * Utilization mapper, whose map() rejects the goal name and made
 * SSQMM.buildMap() throw for every application type.
 *
 * Runs against the compiled output (npm run build). Uses only node:test.
 *   npm run build && node --test test/
 * or, for a build located elsewhere:
 *   SSNFA_DIST=/path/to/dist node --test test/
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
// The Physical Footprint folder is committed as "physical-footprint " (trailing space);
// resolve whichever spelling exists in the build.
const pfDir = ['physical-footprint ', 'physical-footprint']
  .map((d) => path.join(DIST, 'modules/metrics/energy-consumption', d))
  .find((d) => fs.existsSync(d));

const { SSQMM } = req('core/models/ssqmm.model');
const { ApplicationMetadata } = req('core/application/application-metadata');
const { CompositeGoal } = req('core/goals/goals');
const { MetricsMapper } = req('core/metrics/metrics-mappers');

const MAPPERS = {
  'Activity': req('modules/metrics/interaction-capability/user-engagement/activity/user-engagement-activity-metrics').ActivityMapper,
  'Loyalty': req('modules/metrics/interaction-capability/user-engagement/loyalty/user-engagement-loyalty-metrics').LoyaltyMapper,
  'Popularity': req('modules/metrics/interaction-capability/user-engagement/popularity/user-engagement-popularity-metrics').PopularityMapper,
  'Time Behavior': req('modules/metrics/performance-efficiency/time-behavior/time-behavior-metrics').TimeBehaviorMapper,
  'Resource Utilization': req('modules/metrics/performance-efficiency/resource-utilization/resource-utilization-metrics').ResourceMapper,
  'Confidentiality': req('modules/metrics/security/confidentiality/security-confidentiality-metrics').ConfidentialityMapper,
  'Non-repudiation': req('modules/metrics/non-repudiation/ip/non-repudiation-ip-metric').RepudiationMapper,
  'Ecological Footprint': req('modules/metrics/energy-consumption/ecologicalFootPrint/ecological-footPrint-metrics').EcoIndexMapper,
  'Physical Footprint': require(path.join(pfDir, 'physical-footprint-metrics')).PhysicalFootprintMapper,
};

const APP_TYPES = [
  ['frontend', 'Angular'],
  ['frontend', 'React'],
  ['backend', 'Node.js'],
];
const metadata = (type, tech) => new ApplicationMetadata('regression-app', type, tech, '/nonexistent', 'http://localhost');

function buildModel(type, tech) {
  const ssqmm = new SSQMM(metadata(type, tech));
  ssqmm.buildMap();
  return ssqmm;
}
const acronyms = (goal) => Array.from(goal.metrics).map((m) => m.acronym).sort();

test('mapping generation succeeds for every supported application type', () => {
  for (const [type, tech] of APP_TYPES) {
    assert.doesNotThrow(() => buildModel(type, tech), `buildMap() threw for ${type}/${tech}`);
  }
});

test('goal registration: 49 goals, 10 composite, 9 top-level', () => {
  const ssqmm = buildModel('frontend', 'Angular');
  const all = [];
  const walk = (g) => { all.push(g); if (g instanceof CompositeGoal) g.subGoals.forEach(walk); };
  ssqmm.goals.forEach(walk);
  assert.equal(ssqmm.goals.length, 9);
  assert.equal(all.length, 49);
  assert.equal(all.filter((g) => g instanceof CompositeGoal).length, 10);
});

test('each mapped leaf goal receives exactly the metrics and weight of its own mapper', () => {
  for (const [type, tech] of APP_TYPES) {
    const ssqmm = buildModel(type, tech);
    for (const [goalName, Mapper] of Object.entries(MAPPERS)) {
      const goal = ssqmm.qualityModel.getGoalByName(goalName);
      assert.ok(goal, `goal ${goalName} missing`);
      const mapper = new Mapper(metadata(type, tech));
      const expected = mapper.metrics.map((m) => m.acronym).sort();
      assert.deepEqual(acronyms(goal), expected, `${goalName} on ${type}/${tech}`);
      if (expected.length > 0) {
        const probe = { name: goalName, weight: 1, metrics: new Set() };
        mapper.map(probe);
        assert.equal(goal.weight, probe.weight, `${goalName} weight on ${type}/${tech}`);
      }
    }
  }
});

test('Confidentiality uses the Confidentiality mapper and does not fall through', () => {
  const ssqmm = buildModel('backend', 'Node.js');
  const conf = ssqmm.qualityModel.getGoalByName('Confidentiality');
  const ru = ssqmm.qualityModel.getGoalByName('Resource Utilization');
  const confExpected = new MAPPERS['Confidentiality'](metadata('backend', 'Node.js')).metrics.map((m) => m.acronym).sort();
  assert.ok(confExpected.length > 0);
  assert.deepEqual(acronyms(conf), confExpected);
  const overlap = acronyms(conf).filter((a) => acronyms(ru).includes(a));
  assert.deepEqual(overlap, [], 'Confidentiality must not receive Resource Utilization metrics');
});

test('visiting the Confidentiality leaf alone does not invoke another mapper', () => {
  const ssqmm = buildModel('backend', 'Node.js');
  const conf = ssqmm.qualityModel.getGoalByName('Confidentiality');
  conf.metrics.clear();
  const mm = new MetricsMapper(metadata('backend', 'Node.js'));
  assert.doesNotThrow(() => mm.visitLeafGoal(conf));
  assert.equal(mm._mapper.constructor.name, 'ConfidentialityMapper');
});

test('previously operationalized goals are unaffected (User Engagement 9/6/5, Time Behavior 6)', () => {
  const fe = buildModel('frontend', 'Angular');
  const counts = (n) => fe.qualityModel.getGoalByName(n).metrics.size;
  assert.equal(counts('Activity'), 9);
  assert.equal(counts('Popularity'), 6);
  assert.equal(counts('Loyalty'), 5);
  assert.equal(counts('User Engagement'), 20);
  assert.equal(fe.qualityModel.getGoalByName('Activity').weight, 0.35);
  assert.equal(fe.qualityModel.getGoalByName('Loyalty').weight, 0.25);
  assert.equal(fe.qualityModel.getGoalByName('Popularity').weight, 0.4);
  const be = buildModel('backend', 'Node.js');
  assert.equal(be.qualityModel.getGoalByName('Time Behavior').metrics.size, 6);
  assert.equal(be.qualityModel.getGoalByName('User Engagement').metrics.size, 0);
});
