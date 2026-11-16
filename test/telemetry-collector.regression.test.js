/*
 * Regression tests for TelemetryCollector.flushData.
 *
 * Guards against: telemetry received while a batch is being stored being discarded; a failed storage being
 * followed by a dataFlushed event (and thus an assessment of unstored telemetry); missing bundle provenance.
 *   SSNFA_DIST=/path/to/dist node --test test/
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const { TelemetryCollector } = require(path.join(DIST, 'core/telemetry/telemetry'));
console.log = () => {}; console.error = () => {};

class MemoryCollector extends TelemetryCollector {
  constructor() { super({ storageEndpoints: [{ type: 1, name: 'm', uri: 'mongodb://m' }] }); this.batches = []; this.fail = false; this.onStore = null; }
  collectTelemetry(spans) { this.telemetryData.push(...spans); }
  async storeTelemetry(batch) {
    if (this.onStore) await this.onStore();
    if (this.fail) throw new Error('storage down');
    this.batches.push(batch);
  }
  async storeAssessments() {}
}
const span = (bundle, i) => ({ name: `s${i}`, attributes: { 'app.metadata.instrumentationBundleName': `/abs/path/${bundle}` } });

test('TC-01 telemetry received during storage is kept for the next flush (previously discarded)', async () => {
  const c = new MemoryCollector();
  c.collectTelemetry([span('a_1.bundle.js', 1)]);
  c.onStore = async () => { c.onStore = null; c.collectTelemetry([span('a_1.bundle.js', 2)]); };
  await c.flushData();
  await c.flushData();
  assert.deepEqual(c.batches.map((b) => b.map((s) => s.name)), [['s1'], ['s2']]);
});

test('TC-02 dataFlushed is emitted after storage, with the bundles of the batch', async () => {
  const c = new MemoryCollector();
  const events = [];
  c.on('dataFlushed', (endpoints, bundles) => events.push({ stored: c.batches.length, bundles }));
  c.collectTelemetry([span('a_1.bundle.js', 1), span('b_1.bundle.js', 2), span('a_1.bundle.js', 3)]);
  await c.flushData();
  assert.deepEqual(events, [{ stored: 1, bundles: ['a_1.bundle.js', 'b_1.bundle.js'] }]);
});

test('TC-03 a storage failure emits no dataFlushed event and keeps the batch for retry', async () => {
  const c = new MemoryCollector();
  let events = 0;
  c.on('dataFlushed', () => events++);
  c.collectTelemetry([span('a_1.bundle.js', 1)]);
  c.fail = true;
  await assert.rejects(c.flushData(), /storage down/);
  assert.equal(events, 0);
  c.fail = false;
  await c.flushData();
  assert.equal(events, 1);
  assert.deepEqual(c.batches.map((b) => b.map((s) => s.name)), [['s1']]);
});
