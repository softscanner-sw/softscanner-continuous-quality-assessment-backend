/*
 * Regression tests for observable-driven instrumentation selection
 * (src/core/instrumentation/instrumentation-capabilities.ts and the Instrumentation Manager).
 *
 * Guards against: technology-fixed module sets (document-load, Fetch and XHR enabled for every frontend);
 * modules or processors enabled although no selected metric needs them; required modules or processors
 * missing; unsatisfiable requirements or unsupported platforms passing silently; generated agents whose
 * configuration differs from the selection.
 *
 * Runs against the compiled output. Uses only node:test; no file is written, nothing is bundled.
 *   SSNFA_DIST=/path/to/dist node --test test/
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
const { ApplicationMetadata } = req('core/application/application-metadata');
const { QualityModelService } = req('services/quality-model.service');
const { InstrumentationManager } = req('core/instrumentation/instrumentation-manager');
const cap = req('core/instrumentation/instrumentation-capabilities');
const { UserInteractionEvent, TelemetryType, TelemetryExportDestinationType, TelemetryExportProtocol } = req('core/telemetry/telemetry');
const { OpenTelemetryTracingInstrumentationConfig } = req('modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-core');
const { OpenTelemetryTracingInstrumentationStrategy } = req('modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing');
const adapters = req('modules/instrumentation/opentelemetry/tracing/opentelemetry-instrumentation-tracing-adapters');
console.log = () => {}; console.warn = () => {};

const APP = {
  angular: () => new ApplicationMetadata('demo-posts-users-frontend-angular', 'frontend', 'Angular', '/x', 'http://localhost:4200'),
  react: () => new ApplicationMetadata('demo-posts-users-frontend-react', 'frontend', 'React', '/x', 'http://localhost:3001'),
  node: () => new ApplicationMetadata('demo-posts-users-backend-nodejs', 'backend', 'Node.js', '/x', 'http://localhost:3000'),
};
function plan(app, goals) {
  const md = APP[app]();
  const svc = new QualityModelService(); svc.buildMap(md);
  const metrics = svc.extractRequiredMetrics(svc.ssqmm.goals, goals);
  return { md, metrics, selection: new InstrumentationManager().planInstrumentation(md, metrics) };
}
const on = (s) => s.modules.filter((m) => m.enabled).map((m) => m.id);
const off = (s) => s.modules.filter((m) => !m.enabled).map((m) => m.id);
const procs = (s) => s.processors.filter((p) => p.enabled).map((p) => p.id);
const events = (s) => s.interactionEvents.map((e) => UserInteractionEvent[e].toLowerCase());

test('MS-01 Angular / User Engagement: user-interaction only; identity and metadata processors; no resource processor', () => {
  const { metrics, selection: s } = plan('angular', ['User Engagement']);
  assert.equal(new Set(metrics.map((m) => m.acronym)).size, 20);
  assert.deepEqual(on(s), ['user-interaction']);
  assert.deepEqual(off(s), ['document-load', 'fetch', 'xml-http-request']);
  assert.deepEqual(procs(s), ['application-metadata', 'user-identity']);
  assert.deepEqual(events(s), ['change', 'click', 'select', 'submit']);
  assert.deepEqual(s.requirements.spanClasses, ['ui.interaction', 'ui.navigation-click']);
  assert.deepEqual(s.unsatisfied, []);
});

test('MS-02 React / User Engagement: same selection (selection depends on requirements, not on the framework)', () => {
  const a = plan('angular', ['User Engagement']).selection, r = plan('react', ['User Engagement']).selection;
  assert.deepEqual(on(r), on(a)); assert.deepEqual(procs(r), procs(a)); assert.deepEqual(events(r), events(a));
});

test('MS-03 Node.js / Time Behavior: HTTP only; Express and SQL modules disabled; metadata processor only', () => {
  const { selection: s } = plan('node', ['Time Behavior']);
  assert.deepEqual(on(s), ['http']);
  assert.deepEqual(off(s), ['express', 'mysql', 'mysql2']);
  assert.deepEqual(procs(s), ['application-metadata']);
  assert.deepEqual(s.interactionEvents, []);
});

test('MS-04 different goals produce different requirements and module sets', () => {
  const ue = plan('angular', ['User Engagement']).selection;
  const eco = plan('angular', ['Ecological Footprint']).selection;
  const both = plan('angular', ['User Engagement', 'Ecological Footprint']).selection;
  const conf = plan('node', ['Confidentiality']).selection;
  assert.notDeepEqual(on(ue), on(eco));
  assert.deepEqual(on(eco), ['user-interaction', 'document-load', 'fetch', 'xml-http-request'], 'HTTPNb needs client HTTP spans (Fetch and XHR are alternatives), Dom/Weight need document-load');
  assert.deepEqual(events(eco), ['click'], 'navigation clicks only');
  assert.deepEqual(on(both), on(eco)); assert.deepEqual(events(both), events(ue));
  assert.deepEqual(on(conf), ['http', 'mysql', 'mysql2'], 'SQL client alternatives; HTTP for status codes and targets');
  assert.ok(conf.modules.find((m) => m.id === 'http').reasons.some((r) => /server\.http/.test(r)));
});

test('MS-05 optional processors only when a selected metric reads their attributes', () => {
  assert.ok(procs(plan('angular', ['Ecological Footprint']).selection).includes('resource'), 'Dom reads app.system.domelement');
  assert.ok(procs(plan('node', ['Physical Footprint']).selection).includes('resource'));
  assert.ok(!procs(plan('node', ['Physical Footprint']).selection).includes('user-identity'));
  assert.ok(procs(plan('node', ['Non-repudiation']).selection).includes('user-identity'), 'LoginSS/LoginES read app.session.id');
  for (const [app, goals] of [['angular', ['User Engagement']], ['node', ['Time Behavior']], ['node', ['Resource Utilization']]]) {
    assert.ok(procs(plan(app, goals).selection).includes('application-metadata'), 'metadata processor always present');
  }
  assert.deepEqual(on(plan('node', ['Resource Utilization']).selection), ['http'], 'carrier module for processor attributes');
});

test('MS-06 unsupported requirements, unknown metrics and unsupported platforms are explicit errors', () => {
  const raw = cap.selectInstrumentation(APP.angular(), ['SQLI', 'NoU']);
  assert.deepEqual(raw.unsatisfied.map((u) => u.requirement), ['span class db.query', 'field db.statement']);
  assert.throws(() => cap.assertSatisfied(raw), (e) => e.code === 'UNSATISFIED_REQUIREMENTS' && /SQLI/.test(e.message));
  assert.throws(() => cap.selectInstrumentation(APP.angular(), ['NoU', 'Nope']), (e) => e.code === 'UNRESOLVED_METRICS');
  assert.throws(() => cap.selectInstrumentation(new ApplicationMetadata('x', 'backend', 'Java', '/x', ''), ['NHR']), (e) => e.code === 'UNSUPPORTED_PLATFORM');
  assert.throws(() => cap.selectInstrumentation(new ApplicationMetadata('x', 'frontend', 'Vue', '/x', ''), ['NoU']), (e) => e.code === 'UNSUPPORTED_PLATFORM');
});

test('MS-07 selection is deterministic and reports the metrics behind each decision', () => {
  const a = plan('angular', ['User Engagement', 'Ecological Footprint']).selection;
  const b = plan('angular', ['Ecological Footprint', 'User Engagement']).selection;
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  const ui = a.modules.find((m) => m.id === 'user-interaction');
  assert.ok(ui.reasons.some((r) => r.includes('UIFu')) && ui.reasons.some((r) => r.includes('HTTPNb')));
});

function generatedTracingModule(app, goals) {
  const { md, selection } = plan(app, goals);
  const options = InstrumentationManager.tracingOptionsFor(selection);
  const config = new OpenTelemetryTracingInstrumentationConfig([TelemetryType.TRACING],
    [{ type: TelemetryExportDestinationType.LOCAL_COLLECTOR, protocol: TelemetryExportProtocol.WEB_SOCKETS, url: 'ws://localhost:8081' }], options);
  const meta = { appMetadata: md, bundleName: `${md.generateNormalizedApplicationName('-')}_test.bundle.js` };
  const adapter = app === 'node' ? new adapters.OpenTelemetryNodeTracingInstrumentationAdapter(config, md)
    : new adapters.OpenTelemetryWebTracingInstrumentationAdapter(config, md);
  return { options, content: new OpenTelemetryTracingInstrumentationStrategy(config, meta, adapter).generateInstrumentationFiles()[0].content };
}
const flag = (content, pkg) => new RegExp(`'${pkg.replace(/[/@.-]/g, (c) => '\\' + c)}':\\s*\\{\\s*enabled:\\s*(true|false)`).exec(content)?.[1];

test('MS-08 generated frontend agent (User Engagement): options, imports, processor chain, exporter', () => {
  const { options, content } = generatedTracingModule('angular', ['User Engagement']);
  assert.equal(options.resourceData, false); assert.equal(options.userIdData, true); assert.equal(options.appMetadata, true);
  assert.equal(flag(content, '@opentelemetry/instrumentation-document-load'), 'false');
  assert.equal(flag(content, '@opentelemetry/instrumentation-fetch'), 'false');
  assert.equal(flag(content, '@opentelemetry/instrumentation-xml-http-request'), 'false');
  assert.match(content, /'@opentelemetry\/instrumentation-user-interaction': \{\s*eventNames: \[\s*'change',\s*'click',\s*'select',\s*'submit',\]/);
  assert.match(content, /tracerProvider\.addSpanProcessor\(new UserIdentitySpanProcessor\(new ApplicationMetadataSpanProcessor\(\s*new BatchSpanProcessor\(localWebSocketsCollectorExporter/);
  assert.doesNotMatch(content, /ResourceNodeSpanProcessor|resourceUtils/);
  assert.match(content, /new WebSocketSpanExporter\(\{\s*url: 'ws:\/\/localhost:8081'/);
});

test('MS-09 generated Node.js agent (Time Behavior): HTTP enabled, other modules disabled, metadata processor only', () => {
  const { content } = generatedTracingModule('node', ['Time Behavior']);
  assert.equal(flag(content, '@opentelemetry/instrumentation-http'), 'true');
  for (const m of ['express', 'mysql', 'mysql2', 'mongodb', 'pg']) assert.equal(flag(content, `@opentelemetry/instrumentation-${m}`), 'false', m);
  assert.match(content, /tracerProvider\.addSpanProcessor\(new ApplicationMetadataSpanProcessor\(\s*new BatchSpanProcessor/);
  assert.doesNotMatch(content, /UserIdentitySpanProcessor|ResourceNodeSpanProcessor/);
});

test('MS-10 generated frontend agent (Ecological Footprint): document-load, Fetch, XHR and resource processor enabled', () => {
  const { content } = generatedTracingModule('angular', ['Ecological Footprint']);
  for (const p of ['document-load', 'fetch', 'xml-http-request']) assert.equal(flag(content, `@opentelemetry/instrumentation-${p}`), 'true', p);
  assert.match(content, /new ResourceNodeSpanProcessor\(new ApplicationMetadataSpanProcessor\(/);
  assert.doesNotMatch(content, /UserIdentitySpanProcessor/);
  assert.match(content, /eventNames: \[\s*'click',\]/);
});
