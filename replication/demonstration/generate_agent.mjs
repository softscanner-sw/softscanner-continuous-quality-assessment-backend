#!/usr/bin/env node
// Demonstration of the current implementation: run the real goal-to-metric mapping, observable-driven
// instrumentation selection, agent generation and bundling for a demo application, WITHOUT injecting
// the agent into any application and without starting the server, the collector or MongoDB.
//
// Prerequisite: npm ci && npm run build   (uses the compiled backend in dist/)
// Usage:  node replication/demonstration/generate_agent.mjs [frontend|backend] [goal ...]
//   frontend (default): Posts & Users Angular demo, goal "User Engagement"  -> webpack bundle
//   backend:            Posts & Users Node.js demo, goal "Time Behavior"    -> esbuild bundle
// Output: assets/instrumentations/<app>/ (generated sources and bundle; ignored by Git) and a JSON summary on stdout.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'dist');
if (!existsSync(join(DIST, 'api', 'server.js'))) {
  console.error('dist/ not found: run "npm run build" first.');
  process.exit(2);
}
process.chdir(ROOT); // the generator writes under <repository>/assets
const require = createRequire(import.meta.url);
const load = (p) => require(join(DIST, p));
const { ApplicationMetadata } = load('core/application/application-metadata');
const { QualityModelService } = load('services/quality-model.service');
const { InstrumentationManager } = load('core/instrumentation/instrumentation-manager');

const kind = process.argv[2] === 'backend' ? 'backend' : 'frontend';
const goals = process.argv.slice(3).length ? process.argv.slice(3) : [kind === 'frontend' ? 'User Engagement' : 'Time Behavior'];
// The application path is not read or written by generation; only injection (not performed here) uses it.
const md = kind === 'frontend'
  ? new ApplicationMetadata('demo-posts-users-frontend-angular', 'frontend', 'Angular', join(ROOT, 'demo', 'demo-posts-users-frontend-angular'), 'http://localhost:4200')
  : new ApplicationMetadata('demo-posts-users-backend-nodejs', 'backend', 'Node.js', join(ROOT, 'demo', 'demo-posts-users-backend-nodejs'), 'http://localhost:3000');

const svc = new QualityModelService();
svc.buildMap(md);
const metrics = svc.extractRequiredMetrics(svc.ssqmm.goals, goals);
const acronyms = [...new Set(metrics.map((m) => m.acronym))].sort();
const t0 = Date.now();
const bundle = await new InstrumentationManager().generateInstrumentation(md, metrics);
console.log(JSON.stringify({
  application: md.name, technology: md.technology, goals, metrics: acronyms,
  bundle: bundle.fileName, outputDirectory: bundle.parentPath ?? bundle.path, generationMs: Date.now() - t0,
}, null, 2));
