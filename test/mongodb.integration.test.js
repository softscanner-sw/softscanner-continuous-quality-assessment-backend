/*
 * Integration tests of the MongoDB telemetry data source and benchmark persistence.
 *
 * Skipped unless SSNFA_MONGO_URI is set (e.g. mongodb://localhost:27017). Each run uses a fresh database
 * named ssnfa_test_<pid>_<time>, which is dropped at the end; no other database is read or written.
 *   SSNFA_MONGO_URI=mongodb://localhost:27017 SSNFA_DIST=/path/to/dist node --test test/mongodb.integration.test.js
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
const URI = process.env.SSNFA_MONGO_URI;
const skip = !URI && 'SSNFA_MONGO_URI not set';
console.log = () => {}; console.warn = () => {}; console.error = () => {};

const DB = `ssnfa_test_${process.pid}_${Date.now()}`;
const endpoint = { type: 1, name: DB, uri: URI };

after(async () => {
  if (!URI) return;
  const { MongoClient } = require('mongodb');
  const c = new MongoClient(URI); await c.connect();
  await c.db(DB).dropDatabase();
  await c.close();
});

const spanOf = (app, bundle, user) => ({ name: 'click', startTime: [1700000000, 0], endTime: [1700000001, 0],
  attributes: { event_type: 'click', 'app.user.id': user, 'app.visit.id': `v-${user}`, 'app.session.id': `s-${user}`,
    'app.metadata.normalizedName': app, 'app.metadata.instrumentationBundleName': bundle } });

test('DB-01 storeAll files a mixed batch per application and bundle (previously all under the first span\'s bundle)', { skip }, async () => {
  const { MongoDBTelemetryDataSource } = req('modules/telemetry/datasources/databases/mongodb/mongodb-databases-datasource.strategy');
  const ds = new MongoDBTelemetryDataSource({ storageEndpoint: endpoint, dataFormat: 'JSON' });
  await ds.connect();
  try {
    await ds.storeAll([spanOf('appa', 'appa_1.bundle.js', 'u1'), spanOf('appb', 'appb_1.bundle.js', 'x1'), spanOf('appa', 'appa_1.bundle.js', 'u2')]);
    const a = await ds.read({ appInstrumentationMetadata: { bundleName: 'appa_1.bundle.js' } });
    const b = await ds.read({ appInstrumentationMetadata: { bundleName: 'appb_1.bundle.js' } });
    assert.deepEqual(a.map((s) => s.attributes['app.user.id']), ['u1', 'u2']);
    assert.deepEqual(b.map((s) => s.attributes['app.user.id']), ['x1']);
    const none = await ds.read({ appInstrumentationMetadata: { bundleName: 'appc_1.bundle.js' } });
    assert.deepEqual(none, [], 'a bundle without telemetry is an empty set');
  } finally { await ds.disconnect(); }
});

test('DB-02 assessment records persist raw values, benchmarks, polarity, cycle and normalization; missing bundle fails', { skip }, async () => {
  const { MongoDBTelemetryDataSource } = req('modules/telemetry/datasources/databases/mongodb/mongodb-databases-datasource.strategy');
  const { SSQMM } = req('core/models/ssqmm.model');
  const { ApplicationMetadata } = req('core/application/application-metadata');
  const { MetricsService } = req('services/metrics.service');
  const { QualityAssessmentService } = req('services/quality-assessment.service');
  const { ProgressTracker } = req('services/progress-tracker.service');
  const { BenchmarkStore } = req('core/metrics/benchmarks');
  const { MongoDBBenchmarkPersistence } = req('modules/telemetry/datasources/databases/mongodb/mongodb-benchmark-persistence');
  const { MongoClient } = require('mongodb');

  const md = new ApplicationMetadata('appa', 'frontend', 'Angular', '/x', 'http://x');
  const s = new SSQMM(md); s.buildMap();
  const goal = s.qualityModel.getGoalByName('Popularity');
  const listeners = [];
  const collector = {
    on: (e, l) => listeners.push(l),
    async storeAssessments(assessments, filter) {
      const ds = new MongoDBTelemetryDataSource({ storageEndpoint: endpoint, dataFormat: 'JSON' });
      await ds.connect(); try { await ds.storeAssessments(assessments, filter); } finally { await ds.disconnect(); }
    },
  };
  const store = new BenchmarkStore(new MongoDBBenchmarkPersistence(endpoint));
  const qas = new QualityAssessmentService({ metricsService: new MetricsService(), benchmarkStore: store });
  qas.setProgressTracker(new ProgressTracker());
  qas.setContext({ appMetadata: md, bundleName: '/tmp/appa_1.bundle.js' }, [goal], collector);
  const first = qas.assessQualityGoals();
  listeners.forEach((l) => l([endpoint], ['appa_1.bundle.js']));
  await first;

  const c = new MongoClient(URI); await c.connect();
  try {
    const doc = await c.db(DB).collection('instrumentedApplications').findOne({ normalizedAppName: 'appa' });
    const bundle = doc.bundles.find((b) => b.name === 'appa_1.bundle.js');
    assert.equal(bundle.assessments.length, 1, 'one record for the first cycle');
    const rec = bundle.assessments[0];
    assert.equal(rec.status, 'completed'); assert.equal(rec.cycle, 1); assert.equal(rec.telemetryCount, 2);
    assert.equal(rec.bundle, 'appa_1.bundle.js');
    assert.equal(rec.normalization.benchmarkScope, 'application:appa');
    const nou = rec.details.find((d) => d.metric === 'NoU');
    assert.deepEqual([nou.rawValue, nou.benchmark, nou.initialBenchmark, nou.polarity, nou.observed], [2, 200, 200, 'higher-is-better', true]);
    const bm = await c.db(DB).collection('benchmarks').findOne({ scope: 'appa', acronym: 'NoU' });
    assert.equal(bm.maxObserved, 2);
  } finally { await c.close(); }

  // restart: a new store over the same database sees the persisted maximum
  const restarted = new BenchmarkStore(new MongoDBBenchmarkPersistence(endpoint));
  const r = await restarted.resolve('appa', [{ acronym: 'NoU', raw: 1, observed: true, initial: 0, kind: 'none' }], 't');
  assert.equal(r.get('NoU').benchmark, 2);

  const ds = new MongoDBTelemetryDataSource({ storageEndpoint: endpoint, dataFormat: 'JSON' });
  await ds.connect();
  try {
    await assert.rejects(ds.storeAssessments([], { appInstrumentationMetadata: { bundleName: 'appz_9.bundle.js' } }), /no telemetry bundle/);
  } finally { await ds.disconnect(); }
});

test('DB-03 a read failure (unreachable server) propagates instead of returning an empty telemetry set', { skip }, async () => {
  const { MongoDBTelemetryDataSource } = req('modules/telemetry/datasources/databases/mongodb/mongodb-databases-datasource.strategy');
  const ds = new MongoDBTelemetryDataSource({ storageEndpoint: { type: 1, name: DB, uri: 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500' }, dataFormat: 'JSON' });
  await assert.rejects((async () => { await ds.connect(); return ds.read({ appInstrumentationMetadata: { bundleName: 'appa_1.bundle.js' } }); })());
});
