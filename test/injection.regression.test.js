/*
 * Regression tests for the instrumentation bundle injectors (Angular, React, Node.js).
 *
 * Guards against: silent success when the HTML insertion point is missing; duplicate <script> /
 * --require references on repeated injection; reliance on a substring "node" in the start script;
 * copying a bundle without referencing it; and modifications unrelated to instrumentation.
 *
 * Runs against the compiled output (npm run build). Uses only node:test and temporary folders.
 *   npm run build && node --test test/
 * or: SSNFA_DIST=/path/to/dist node --test test/
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIST = path.resolve(process.env.SSNFA_DIST || path.join(__dirname, '..', 'dist'));
const req = (p) => require(path.join(DIST, p));
const { ApplicationMetadata } = req('core/application/application-metadata');
const { BundleInjector } = req('core/instrumentation/instrumentation-bundle-injector');
const inj = req('core/instrumentation/instrumentation-injection');

console.log = () => {};

const ANGULAR_INDEX = '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>App</title>\n</head>\n<body>\n  <app-root></app-root>\n</body>\n</html>\n';
const REACT_INDEX = '<!DOCTYPE html>\n<html lang="en">\n  <head><title>React App</title></head>\n  <body>\n    <noscript>You need to enable JavaScript to run this app.</noscript>\n    <div id="root"></div>\n    <!-- The build step will place the bundled scripts into the <body> tag. -->\n  </body>\n</html>\n';
const PACKAGE_JSON = '{\n    "name": "demo",\n    "version": "1.0.0",\n    "scripts": {\n        "build": "tsc",\n        "start": "npm run build && node dist/server.js",\n        "dev": "nodemon --exec ts-node src/server.ts"\n    },\n    "dependencies": {\n        "express": "^4.21.2"\n    }\n}\n';

function makeApp(kind, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `ssnfa-inj-${kind}-`));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

function makeBundle(name = 'demo_2026-11-16T10-00-00.bundle.js', content = '/* agent v1 */') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssnfa-bundle-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return { path: p, fileName: name };
}

const md = (root, type, tech) => new ApplicationMetadata('demo', type, tech, root, 'http://localhost');
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const count = (s, sub) => s.split(sub).length - 1;

test('INJ-01 Angular standard entry point: bundle copied, one script before </body>, verified', async () => {
  const root = makeApp('ng', { 'src/index.html': ANGULAR_INDEX });
  const b = makeBundle();
  const r = await new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), b);
  const html = read(root, 'src/index.html');
  assert.equal(r.generated, true); assert.equal(r.copy, 'copied'); assert.equal(r.entryPoint, 'inserted'); assert.equal(r.verified, true);
  assert.equal(count(html, `<script src="assets/js/bundles/${b.fileName}"></script>`), 1);
  assert.match(html, /<script src="assets\/js\/bundles\/[^"]+"><\/script><\/body>/);
  assert.equal(html.replace(`<script src="assets/js/bundles/${b.fileName}"></script>`, ''), ANGULAR_INDEX, 'nothing else changed');
  assert.ok(fs.existsSync(path.join(root, 'src/assets/js/bundles', b.fileName)));
});

test('INJ-02 Angular entry point without </body> or </html>: explicit failure, application untouched', async () => {
  const broken = '<!doctype html><html><head></head><body><app-root></app-root>';
  const root = makeApp('ng', { 'src/index.html': broken });
  const b = makeBundle();
  await assert.rejects(new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), b),
    (e) => e.name === 'InstrumentationInjectionError' && e.code === 'ENTRY_POINT_UNSUPPORTED');
  assert.equal(read(root, 'src/index.html'), broken);
  assert.equal(fs.existsSync(path.join(root, 'src/assets')), false, 'no bundle copied before validation');
});

test('INJ-03 Angular missing index.html: explicit failure (ENTRY_POINT_MISSING), nothing copied', async () => {
  const root = makeApp('ng', { 'src/main.ts': '' });
  await assert.rejects(new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), makeBundle()),
    (e) => e.code === 'ENTRY_POINT_MISSING');
  assert.equal(fs.existsSync(path.join(root, 'src/assets')), false);
});

test('INJ-04 supported HTML variants: upper-case </BODY>, omitted </body> with </html>', () => {
  const p1 = inj.planHtmlInjection('<HTML><BODY><div></div></BODY></HTML>', 'a/b.bundle.js', 'a', 'demo');
  assert.equal(p1.updated, '<HTML><BODY><div></div><script src="a/b.bundle.js"></script></BODY></HTML>');
  const p2 = inj.planHtmlInjection('<html><body><div></div>\n</html>', 'a/b.bundle.js', 'a', 'demo');
  assert.equal(p2.updated, '<html><body><div></div>\n<script src="a/b.bundle.js"></script></html>');
  const p3 = inj.planHtmlInjection('<body><!-- </body> in a comment --><p></p></body>', 'x.js', 'a', 'demo');
  assert.equal(p3.updated, '<body><!-- </body> in a comment --><p></p><script src="x.js"></script></body>', 'last closing tag is used');
});

test('INJ-05 React standard entry point', async () => {
  const root = makeApp('react', { 'public/index.html': REACT_INDEX });
  const b = makeBundle();
  const r = await new BundleInjector().injectBundle(md(root, 'frontend', 'React'), b);
  const html = read(root, 'public/index.html');
  assert.equal(r.entryPoint, 'inserted'); assert.equal(r.verified, true);
  assert.equal(count(html, `<script src="assets/js/bundles/${b.fileName}"></script>`), 1);
  assert.ok(html.includes(`<script src="assets/js/bundles/${b.fileName}"></script></body>`));
  assert.ok(fs.existsSync(path.join(root, 'public/assets/js/bundles', b.fileName)));
});

test('INJ-06 repeated injection of the same bundle is idempotent (Angular, React)', async () => {
  for (const [tech, rel, index] of [['Angular', 'src/index.html', ANGULAR_INDEX], ['React', 'public/index.html', REACT_INDEX]]) {
    const root = makeApp(tech, { [rel]: index });
    const b = makeBundle();
    await new BundleInjector().injectBundle(md(root, 'frontend', tech), b);
    const once = read(root, rel);
    const r2 = await new BundleInjector().injectBundle(md(root, 'frontend', tech), b);
    assert.equal(r2.copy, 'unchanged'); assert.equal(r2.entryPoint, 'already-present'); assert.equal(r2.verified, true);
    assert.equal(read(root, rel), once, `${tech}: page unchanged by the second injection`);
  }
});

test('INJ-07 existing identical script reference (added by hand) is not duplicated', async () => {
  const b = makeBundle();
  const pre = ANGULAR_INDEX.replace('</body>', `<script src="assets/js/bundles/${b.fileName}"></script>\n</body>`);
  const root = makeApp('ng', { 'src/index.html': pre });
  const r = await new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), b);
  assert.equal(r.entryPoint, 'already-present'); assert.equal(r.copy, 'copied');
  assert.equal(read(root, 'src/index.html'), pre);
});

test('INJ-08 a new bundle version replaces the previous reference of the same application only', async () => {
  const old = makeBundle('demo_2026-01-01T00-00-00.bundle.js');
  const other = '<script src="assets/js/bundles/otherapp_2026-01-01T00-00-00.bundle.js"></script>';
  const root = makeApp('ng', { 'src/index.html': ANGULAR_INDEX.replace('<app-root></app-root>', `<app-root></app-root>\n  ${other}`) });
  await new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), old);
  const neu = makeBundle('demo_2026-11-16T10-00-00.bundle.js', '/* agent v2 */');
  const r = await new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), neu);
  const html = read(root, 'src/index.html');
  assert.equal(r.entryPoint, 'replaced');
  assert.deepEqual(r.replacedReferences, [`assets/js/bundles/${old.fileName}`]);
  assert.equal(count(html, old.fileName), 0);
  assert.equal(count(html, neu.fileName), 1);
  assert.ok(html.includes(other), 'unrelated scripts are kept');
});

test('INJ-09 Node.js supported start scripts: --require inserted after the node executable', () => {
  const rp = './src/assets/js/bundles/demo_1.bundle.js', dir = 'src/assets/js/bundles';
  const cases = [
    ['node dist/server.js', `node --require ${rp} dist/server.js`],
    ['npm run build && node dist/server.js', `npm run build && node --require ${rp} dist/server.js`],
    ['NODE_ENV=production node server.js --seed', `NODE_ENV=production node --require ${rp} server.js --seed`],
    ['/usr/local/bin/node --max-old-space-size=512 index.js', `/usr/local/bin/node --require ${rp} --max-old-space-size=512 index.js`],
    ['node -r dotenv/config dist/server.js', `node --require ${rp} -r dotenv/config dist/server.js`],
  ];
  for (const [start, expected] of cases) {
    const p = inj.planNodeStartScriptInjection(start, rp, dir, 'demo');
    assert.equal(p.updated, expected, start);
    assert.equal(p.status, 'inserted');
  }
});

test('INJ-10 Node.js unsupported start scripts fail explicitly', () => {
  const rp = './src/assets/js/bundles/demo_1.bundle.js', dir = 'src/assets/js/bundles';
  for (const start of ['nodemon dist/server.js', 'ts-node src/server.ts', 'next start', 'npm run serve',
    'node_modules/.bin/foo', 'node a.js && node b.js']) {
    assert.throws(() => inj.planNodeStartScriptInjection(start, rp, dir, 'demo'),
      (e) => e.code === 'START_SCRIPT_UNSUPPORTED', start);
  }
});

test('INJ-11 Node.js end-to-end: package.json changed only in scripts.start; repeated injection idempotent', async () => {
  const root = makeApp('node', { 'package.json': PACKAGE_JSON });
  const b = makeBundle();
  const r = await new BundleInjector().injectBundle(md(root, 'backend', 'Node.js'), b);
  const pkg = read(root, 'package.json');
  const expectedStart = `npm run build && node --require ./src/assets/js/bundles/${b.fileName} dist/server.js`;
  assert.equal(r.entryPoint, 'inserted'); assert.equal(r.verified, true);
  assert.equal(pkg, PACKAGE_JSON.replace('"npm run build && node dist/server.js"', JSON.stringify(expectedStart)), 'only scripts.start changed (4-space indentation kept)');
  assert.ok(fs.existsSync(path.join(root, 'src/assets/js/bundles', b.fileName)));
  const r2 = await new BundleInjector().injectBundle(md(root, 'backend', 'Node.js'), b);
  assert.equal(r2.entryPoint, 'already-present'); assert.equal(r2.copy, 'unchanged');
  assert.equal(read(root, 'package.json'), pkg);
  assert.equal(count(read(root, 'package.json'), '--require'), 1);
});

test('INJ-12 Node.js unsupported or missing start script: failure before the bundle is copied', async () => {
  for (const scripts of [{ start: 'nodemon dist/server.js' }, { build: 'tsc' }]) {
    const raw = JSON.stringify({ name: 'demo', scripts }, null, 2);
    const root = makeApp('node', { 'package.json': raw });
    await assert.rejects(new BundleInjector().injectBundle(md(root, 'backend', 'Node.js'), makeBundle()),
      (e) => ['START_SCRIPT_UNSUPPORTED', 'START_SCRIPT_MISSING'].includes(e.code));
    assert.equal(read(root, 'package.json'), raw);
    assert.equal(fs.existsSync(path.join(root, 'src/assets')), false, 'bundle not copied');
  }
});

test('INJ-13 missing generated bundle and unsupported technology fail explicitly', async () => {
  const root = makeApp('ng', { 'src/index.html': ANGULAR_INDEX });
  await assert.rejects(new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), { path: path.join(root, 'nope.bundle.js'), fileName: 'nope.bundle.js' }),
    (e) => e.code === 'BUNDLE_MISSING');
  await assert.rejects(new BundleInjector().injectBundle(md(root, 'frontend', 'Vue'), makeBundle()),
    (e) => e.code === 'UNSUPPORTED_TECHNOLOGY');
  assert.equal(read(root, 'src/index.html'), ANGULAR_INDEX);
});

test('INJ-14 no business-logic modification: only the entry point and the bundle folder change', async () => {
  const files = { 'src/index.html': ANGULAR_INDEX, 'src/app/app.component.ts': 'export class AppComponent {}\n', 'src/main.ts': 'bootstrap();\n', 'package.json': PACKAGE_JSON };
  const root = makeApp('ng', files);
  const b = makeBundle();
  await new BundleInjector().injectBundle(md(root, 'frontend', 'Angular'), b);
  for (const [rel, content] of Object.entries(files)) {
    if (rel !== 'src/index.html') assert.equal(read(root, rel), content, rel);
  }
  const listing = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => e.isDirectory() ? walk(path.join(d, e.name)) : listing.push(path.relative(root, path.join(d, e.name)).replace(/\\/g, '/')));
  walk(root);
  assert.deepEqual(listing.sort(), [...Object.keys(files), `src/assets/js/bundles/${b.fileName}`].sort());
});
