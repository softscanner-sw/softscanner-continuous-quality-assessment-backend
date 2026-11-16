/*
 * Regression tests for the goal definitions of the ISO/IEC 25010-based quality model.
 *
 * Guards against the reintroduction of copy-paste definitions (User Error Protection had
 * Operability's text; Recoverability had Fault Tolerance's text) and of the "degreee" typo
 * in Popularity, and checks that correcting them left the goal hierarchy unchanged.
 *
 * Runs against the compiled output (npm run build). Uses only node:test.
 *   npm run build && node --test test/quality-model-definitions.regression.test.js
 * or, for a build located elsewhere:
 *   SSNFA_DIST=/path/to/dist node --test test/quality-model-definitions.regression.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
const { ISOIEC25010 } = req('core/models/iso-iec-25010.model');
const { CompositeGoal } = req('core/goals/goals');

function allGoals() {
  const model = new ISOIEC25010();
  const all = [];
  const walk = (g) => { all.push(g); if (g instanceof CompositeGoal) g.subGoals.forEach(walk); };
  model.goals.forEach(walk);
  return { model, all };
}
const byName = (name) => allGoals().model.getGoalByName(name);

test('User Error Protection is defined as prevention of operation errors, not as Operability', () => {
  const uep = byName('User Error Protection');
  assert.match(uep.description, /prevent/i);
  assert.match(uep.description, /operation errors/i);
  assert.notEqual(uep.description, byName('Operability').description);
});

test('Recoverability is defined as recovery of affected data and the desired state, not as Fault Tolerance', () => {
  const rec = byName('Recoverability');
  assert.match(rec.description, /interruption or a failure/i);
  assert.match(rec.description, /recover/i);
  assert.match(rec.description, /re-establish the desired state/i);
  assert.notEqual(rec.description, byName('Fault Tolerance').description);
});

test('Operability and Fault Tolerance keep their existing definitions', () => {
  assert.equal(byName('Operability').description, 'The degree to which the software is user-friendly and controllable');
  assert.equal(byName('Fault Tolerance').description, 'The degree to which the software operates as intended despite hardware or software faults');
});

test('Popularity definition has no "degreee" typo', () => {
  assert.equal(byName('Popularity').description, 'The degree to which the software is popular among its users');
  for (const g of allGoals().all) assert.doesNotMatch(g.description, /degreee/i, g.name);
});

test('no two goals share a definition', () => {
  const seen = new Map();
  for (const g of allGoals().all) {
    assert.ok(!seen.has(g.description), `${g.name} duplicates the definition of ${seen.get(g.description)}`);
    seen.set(g.description, g.name);
  }
});

test('goal hierarchy unchanged: 49 goals, 10 composite, 9 top-level; parents and initial weights of corrected goals', () => {
  const { model, all } = allGoals();
  assert.equal(model.goals.length, 9);
  assert.equal(all.length, 49);
  assert.equal(all.filter((g) => g instanceof CompositeGoal).length, 10);
  const expectParent = { 'User Error Protection': 'Interaction Capability', 'Recoverability': 'Reliability', 'Popularity': 'User Engagement' };
  for (const [name, parent] of Object.entries(expectParent)) {
    const g = model.getGoalByName(name);
    assert.ok(g && !(g instanceof CompositeGoal), `${name} must be a leaf goal`);
    assert.equal(g.parent.name, parent, `${name} parent`);
    assert.equal(g.weight, 1, `${name} initial weight`);
  }
});
