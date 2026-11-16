/*
 * Regression tests for the removal of replaced instrumentation bundles after a verified re-injection.
 *
 * Guards against: obsolete bundle files of the same application accumulating in the application assets;
 * deletion of files that the injector does not own (other applications' bundles, unrelated files, the
 * deployed bundle, files outside the bundle folder); deletions before verification; a failed deletion
 * turning a verified injection into a failure.
 *
 * Runs against the compiled output. Uses only node:test and temporary folders.
 *   SSNFA_DIST=/path/to/dist node --test test/
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
console.log = () => {};

const INDEX = '<!doctype html>\n<html lang="en">\n<head><title>App</title></head>\n<body>\n  <app-root></app-root>\n</body>\n</html>\n';
const PACKAGE_JSON = '{\n  "name": "demo",\n  "scripts": {\n    "start": "node dist/server.js"\n  }\n}\n';

function makeApp(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssnfa-clean-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}
function makeBundle(name, content = `/* ${name} */`) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssnfa-cbundle-'));
  fs.writeFileSync(path.join(dir, name), content);
  return { path: path.join(dir, name), fileName: name };
}
const ng = (root) => new ApplicationMetadata('demo', 'frontend', 'Angular', root, 'http://localhost');
const BUNDLES = 'src/assets/js/bundles';
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

test('IC-01 a replacement removes the replaced bundle of the same application (and its LICENSE companion)', async () => {
  const root = makeApp({ 'src/index.html': INDEX });
  const v1 = makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js');
  await new BundleInjector().injectBundle(ng(root), v1);
  fs.writeFileSync(path.join(root, BUNDLES, `${v1.fileName}.LICENSE.txt`), 'licenses');
  const v2 = makeBundle('demo_2026_02_01T00_00_00_000Z.bundle.js');
  const r = await new BundleInjector().injectBundle(ng(root), v2);
  assert.equal(r.entryPoint, 'replaced'); assert.equal(r.verified, true);
  assert.deepEqual(r.removedBundles.map((f) => path.basename(f)), [v1.fileName]);
  assert.ok(!exists(root, `${BUNDLES}/${v1.fileName}`) && !exists(root, `${BUNDLES}/${v1.fileName}.LICENSE.txt`));
  assert.ok(exists(root, `${BUNDLES}/${v2.fileName}`));
});

test('IC-02 files not owned by this application are preserved', async () => {
  const root = makeApp({
    'src/index.html': INDEX,
    [`${BUNDLES}/other-app_2026_01_01T00_00_00_000Z.bundle.js`]: '/* other app */',
    [`${BUNDLES}/README.txt`]: 'keep me',
  });
  await new BundleInjector().injectBundle(ng(root), makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js'));
  await new BundleInjector().injectBundle(ng(root), makeBundle('demo_2026_02_01T00_00_00_000Z.bundle.js'));
  assert.ok(exists(root, `${BUNDLES}/other-app_2026_01_01T00_00_00_000Z.bundle.js`));
  assert.ok(exists(root, `${BUNDLES}/README.txt`));
  assert.deepEqual(fs.readdirSync(path.join(root, BUNDLES)).sort(), ['README.txt', 'demo_2026_02_01T00_00_00_000Z.bundle.js', 'other-app_2026_01_01T00_00_00_000Z.bundle.js']);
});

test('IC-03 re-injecting the same bundle removes nothing (idempotency preserved)', async () => {
  const root = makeApp({ 'src/index.html': INDEX });
  const b = makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js');
  await new BundleInjector().injectBundle(ng(root), b);
  const r = await new BundleInjector().injectBundle(ng(root), b);
  assert.equal(r.entryPoint, 'already-present'); assert.deepEqual(r.removedBundles, []); assert.deepEqual(r.keptBundles, []);
  assert.ok(exists(root, `${BUNDLES}/${b.fileName}`));
});

test('IC-04 a replaced bundle that cannot be deleted is reported; the verified injection still succeeds', async () => {
  const root = makeApp({ 'src/index.html': INDEX });
  const v1 = makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js');
  await new BundleInjector().injectBundle(ng(root), v1);
  const lockedDir = path.join(root, BUNDLES, `${v1.fileName}`);
  // replace the old bundle file by a non-empty directory of the same name: unlink fails on every platform
  fs.rmSync(lockedDir); fs.mkdirSync(lockedDir); fs.writeFileSync(path.join(lockedDir, 'x'), 'x');
  const r = await new BundleInjector().injectBundle(ng(root), makeBundle('demo_2026_02_01T00_00_00_000Z.bundle.js'));
  assert.equal(r.verified, true); assert.equal(r.entryPoint, 'replaced');
  assert.deepEqual(r.removedBundles, []);
  assert.equal(r.keptBundles.length, 1); assert.match(r.keptBundles[0].reason, /deletion failed/);
});

test('IC-05 a replaced reference whose file is missing is reported as kept (file not found)', async () => {
  const root = makeApp({ 'src/index.html': INDEX });
  const v1 = makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js');
  await new BundleInjector().injectBundle(ng(root), v1);
  fs.rmSync(path.join(root, BUNDLES, v1.fileName));
  const r = await new BundleInjector().injectBundle(ng(root), makeBundle('demo_2026_02_01T00_00_00_000Z.bundle.js'));
  assert.deepEqual(r.keptBundles, [{ reference: `assets/js/bundles/${v1.fileName}`, reason: 'file not found' }]);
});

test('IC-06 Node.js: a replaced --require bundle is removed after verification', async () => {
  const root = makeApp({ 'package.json': PACKAGE_JSON });
  const md = new ApplicationMetadata('demo', 'backend', 'Node.js', root, 'http://localhost');
  const v1 = makeBundle('demo_2026_01_01T00_00_00_000Z.bundle.js');
  await new BundleInjector().injectBundle(md, v1);
  const v2 = makeBundle('demo_2026_02_01T00_00_00_000Z.bundle.js');
  const r = await new BundleInjector().injectBundle(md, v2);
  assert.equal(r.entryPoint, 'replaced'); assert.equal(r.verified, true);
  assert.deepEqual(r.removedBundles.map((f) => path.basename(f)), [v1.fileName]);
  assert.ok(!exists(root, `${BUNDLES}/${v1.fileName}`)); assert.ok(exists(root, `${BUNDLES}/${v2.fileName}`));
  assert.match(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.start, new RegExp(v2.fileName));
});
