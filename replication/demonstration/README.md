# Demonstration of the current implementation

These demonstrations exercise the tagged implementation `thesis-nfa-impl-2026-11-16`. They show how it behaves; they are **not** part of the dissertation's evaluation and produce no evaluation results.

## 1. Agent generation without injection (automated)

```bash
npm ci
npm run build
node replication/demonstration/generate_agent.mjs frontend   # Posts & Users Angular demo, goal "User Engagement" (webpack)
node replication/demonstration/generate_agent.mjs backend    # Posts & Users Node.js demo, goal "Time Behavior" (esbuild)
```

**Steps exercised:**
1. the goal-to-metric mapping for the selected goal;
2. the observable-driven selection of instrumentation modules and events;
3. agent generation;
4. bundling.

The generated sources are written to `assets/instrumentations/<application>/` and the bundle to `assets/bundles/<application>/`; both are ignored by Git. The script prints a JSON summary: goal, metrics, bundle name and output directory. No application is modified and no server, collector or database is started.

**Output differences between runs:**
- The bundle file name contains a time stamp, which also appears once in the generated tracing source.
- Apart from that time stamp, the generated sources and the esbuild (Node.js) bundle were identical across independent installations.
- In the webpack (frontend) bundle, module identifiers are paths relative to the build. If `node_modules` is reached through a link, the identifiers and the module order differ, while the bundled module contents stay the same.

The generated frontend sources correspond to the listings in the dissertation's Appendix B.

## 2. End-to-end assessment of the demo applications (manual)

This run uses the public Posts & Users demo applications (`demo/`, Git submodules at the referenced commits; see their READMEs for setup) and a local MongoDB at `mongodb://localhost:27017`.

1. Start MongoDB, then `npm start` (API on `http://localhost:3000`).
2. Prepare a **disposable copy** of the Angular demo frontend; the assessment modifies the project it is given.
3. Start an assessment, for example:

   ```bash
   curl -X POST http://localhost:3000/api/assessment -H "Content-Type: application/json" \
     -d '{"metadata":{"name":"demo-posts-users-frontend-angular","type":"frontend","technology":"Angular","path":"/absolute/path/to/disposable/copy","url":"http://localhost:4200"},"selectedGoals":["User Engagement"]}'
   ```

4. Start the demo backend and the instrumented frontend, then interact with the application in a browser.
5. Follow `GET /api/assessments?assessmentId=<id>` (SSE) or use the dashboard repository.
