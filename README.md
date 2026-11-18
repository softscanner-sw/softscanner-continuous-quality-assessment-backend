# SoftScanner-NFA: goal-driven non-functional quality assessment of web applications

SoftScanner-NFA is the backend of the non-functional part of SoftScanner. It derives runtime instrumentation from selected quality goals, injects a generated OpenTelemetry-based agent into a web application, collects the resulting telemetry, and continuously computes metric values and normalized, weighted goal scores with their constituent records.

This repository is research software. It accompanies a doctoral dissertation, and this branch also carries the dissertation's **replication package** (`replication/`).

> **Research prototype.** The backend is not hardened for production deployment and must not be exposed to untrusted networks in its present configuration (see [Limitations](#limitations-of-the-research-prototype)). Several implemented metric families are experimental and were not validated by the dissertation (see [Scope](docs/SCOPE.md)).

## Contents

- [Relationship to the dissertation](#relationship-to-the-dissertation)
- [Architecture in brief](#architecture-in-brief)
- [Supported and experimental scope](#supported-and-experimental-scope)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the backend](#running-the-backend)
- [Running the tests](#running-the-tests)
- [Optional demonstration](#optional-demonstration)
- [Replication package](#replication-package)
- [Limitations of the research prototype](#limitations-of-the-research-prototype)
- [Versions, licence and citation](#versions-licence-and-citation)

## Relationship to the dissertation

The dissertation *SoftScanner: An Approach for Functional Testing and Non-Functional Continuous Quality Assessment of Frontend Web Applications* (Bachar Rima, Université de Montpellier, 2026) has two contributions:

- **SoftScanner-FA** (functional assessment) derives and executes browser tests from frontend source code. It lives in separate repositories and is not part of this repository.
- **SoftScanner-NFA** (non-functional assessment, Chapter 4) is this repository. It covers the quality goal model, the goal-to-metric-to-observation mapping, goal-driven instrumentation, and runtime assessment.

The implementation that the dissertation describes is the immutable tag **[`thesis-nfa-impl-2026-11-16`](https://github.com/softscanner-sw/softscanner-continuous-quality-assessment-backend/tree/thesis-nfa-impl-2026-11-16)** (commit `cffc96c`). The replication package adds documentation, analysis scripts, retained evaluation data and repository maintenance on top of that commit. It does not change the quality model, metrics, normalization, aggregation, instrumentation or assessment logic.

The dissertation's evaluation (EQ1, EQ2) was carried out with earlier, 2024 versions of the SoftScanner instrumentation, before this repository existed. **The evaluation results are therefore not measurements of the tagged implementation.** What the package can and cannot reproduce is stated in [Reproducibility levels](#reproducibility-levels).

## Architecture in brief

```
quality goal(s) ──► Quality Model (ISO/IEC 25010-based goal hierarchy)
                    │
                    ▼
               Quality Mapping Model: leaf goal → metrics → required observations
                    │   (observable registry: src/core/metrics/metric-observables.ts)
                    ▼
               Instrumentation capability registry → selected OpenTelemetry modules, events, processors
                    │   (src/core/instrumentation/instrumentation-capabilities.ts)
                    ▼
               Agent generation (OpenTelemetry JS) → bundling (webpack: Angular/React; esbuild: Node.js)
                    ▼
               Injection into the target project (Angular, React, Node.js strategies)
                    ▼
   instrumented application ──WebSocket (ws://localhost:8081)──► telemetry collector ──► MongoDB
                    ▼
               Assessment cycles: metric computation → normalization → weighted aggregation → score records
                    ▼
               REST + Server-Sent Events API (http://localhost:3000)
```

Details and a source map are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The dashboard (web UI) is a separate repository, [softscanner-continuous-quality-assessment-frontend](https://github.com/softscanner-sw/softscanner-continuous-quality-assessment-frontend).

## Supported and experimental scope

The code base is wider than the scope the dissertation reports and evaluates. The two enumerations describe different scopes and are not meant to coincide:

| | Dissertation (Chapter 4) | Code at the tagged revision |
|---|---|---|
| Quality goals | 34 conceptual goals | 49 goal nodes (10 composite, 39 leaves) |
| Operationalized leaf goals | 8, within the dissertation's stated scope | 9 leaves with goal-to-metric mappings |
| Metrics | 49 implemented metrics with declared observation requirements | 49 metrics in the observable registry |
| Empirically evaluated | *User Engagement* (NoU, UIFu) in EQ1; instrumentation overhead in EQ2 | — |

Metric families beyond *User Engagement* and *Time Behavior* are **experimental**. They include Confidentiality, Non-repudiation, Resource Utilization, and Physical and Ecological Footprint. Their formulas, normalization benchmarks and weights were not validated, and their values should not be interpreted as validated quality measurements. See [docs/SCOPE.md](docs/SCOPE.md).

## Installation

**Prerequisites:**
- Node.js **22 or later** and npm (tested with Node.js 22.18.0 and npm 10.9.3). The generated Node.js agent relies on the global `WebSocket` of Node.js 22+.
- Git.
- MongoDB (tested with a local MongoDB server; any 6.x or later server should work). It is needed only to run the backend, not for the tests or the replication analyses.

```bash
git clone --recurse-submodules https://github.com/softscanner-sw/softscanner-continuous-quality-assessment-backend.git
cd softscanner-continuous-quality-assessment-backend
git checkout replication-v1    # or thesis-nfa-impl-2026-11-16 for the implementation only
git submodule update --init    # demo applications (optional)
npm ci
```

Install the development dependencies as well (the default for `npm ci`). The agent generator uses `webpack`, `ts-loader`, `babel-loader` and `typescript` at run time.

## Configuration

The tagged implementation uses fixed values; there are no environment overrides.

| Setting | Value | Source |
|---|---|---|
| REST/SSE API | `http://localhost:3000` | `src/api/server.ts` |
| WebSocket telemetry collector (started by the backend) | `ws://localhost:8081` | `src/services/telemetry.service.ts`, `src/core/instrumentation/instrumentation-manager.ts` |
| MongoDB | `mongodb://localhost:27017`, database `continuous-quality-assessment-web-telemetry-mongodb` | `src/services/telemetry.service.ts` |
| Telemetry flush interval | 3 s | `src/services/telemetry.service.ts` |
| Browser span batching | `BatchSpanProcessor`, 510 ms scheduled delay | generated agent |

More detail, including the API and what an assessment writes to disk, is in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Running the backend

```bash
npm start            # compiles TypeScript (dist/) and starts http://localhost:3000
```

**Main endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /api/quality-model` | the goal hierarchy |
| `POST /api/assessment` | start an assessment (`{ "metadata": {name, type, technology, path, url}, "selectedGoals": ["User Engagement"] }`). Returns `202` with an `assessmentId` |
| `GET /api/assessment-status?assessmentId=…` | lifecycle state and last cycle outcome |
| `GET /api/progress?assessmentId=…` | progress stream (SSE) |
| `GET /api/assessments?assessmentId=…` | assessment-cycle stream (SSE); failed cycles use the event type `assessment-failed` |

**`POST /api/assessment` modifies the project at `metadata.path`:** it injects the generated agent into that project. Use a disposable copy of the target application.

## Running the tests

```bash
npm test
```

This compiles the sources with `tsc` and runs the Node.js test runner on `test/*.test.js`. The same command works in Windows and POSIX shells.

The expected result at the tagged revision is **94 tests: 91 pass, 0 fail, 3 skipped**. The three skipped tests are MongoDB integration tests. They run only when `SSNFA_MONGO_URI` points to a MongoDB server, for example `SSNFA_MONGO_URI=mongodb://localhost:27999 npm test`. Each run creates and drops its own database `ssnfa_test_<pid>_<time>`. **Use a disposable MongoDB instance, never one that holds data you need.**

The suite covers:
- the goal model and goal-to-metric mapping;
- the observable registry and instrumentation selection;
- injection and cleanup (Angular, React, Node.js);
- metric values, normalization and assessment cycles;
- the telemetry collector (with a stub).

It does not run a browser, a generated agent, the HTTP server or bundling.

## Optional demonstration

[replication/demonstration/](replication/demonstration/README.md) shows how to:
- generate the User Engagement agent for the Posts & Users Angular demo without modifying any application (`node replication/demonstration/generate_agent.mjs`);
- run an end-to-end assessment of the demo applications (manual, requires MongoDB).

## Replication package

```
replication/
├── README.md              how to run the analyses; reproducibility levels
├── eq1/                   EQ1 participant-level data (derived CSV) and analysis script
├── eq2/                   EQ2 raw run-level measurements (original CSV files) and analysis script
├── results/               generated reports and the values reported in the dissertation
├── demonstration/         agent-generation demonstration of the current implementation
├── limitations/           evidence and reproducibility boundaries
└── manifest/              artifact manifest, provenance classes, SHA-256 checksums
```

**Run both analyses** (Node.js only, no dependencies):

```bash
npm run replicate        # = node replication/eq1/analyze_eq1.mjs --check && node replication/eq2/analyze_eq2.mjs --check
```

Each script writes its report to `replication/results/`. It exits with code 1 if a recomputed value differs from the dissertation at the reported precision.

### Reproducibility levels

| Result (dissertation, Section 4.4) | Level |
|---|---|
| EQ2 Table 4.6, Figure 4.9 values, and the Industrial Application 2 request ranges | **Recomputed from the original raw run-level measurements** (22/22 values reproduced) |
| EQ1 time ranges, medians, median reduction, and CV (Figures 4.6 and 4.8) | **Recomputed from retained participant-level values** (9/9 values reproduced) |
| EQ1 precision and recall (Figure 4.7) | **Historical reported values**: retained per participant, but the reference and collected observations needed to recompute them were not retained |
| Re-running EQ1 (user study) or EQ2 (benchmark) | **Not reproducible** with this package. The 2024 instrumentation bundles, the benchmark harness and the industrial applications are not available (see [replication/limitations](replication/limitations/README.md)) |
| Current implementation behavior | **Executable**: tests and the agent-generation demonstration. This is not an evaluation |

## Limitations of the research prototype

- **Not for production:** the backend is a local research prototype, not hardened for deployment, and must not be exposed to untrusted networks in its present configuration.
  - The API and the telemetry collector have no authentication.
  - Cross-origin requests are accepted from any origin.
  - An assessment request writes into the file-system path it names.
- **Fixed configuration:** ports and the MongoDB address are fixed in the code.
- **Personal data:** generated agents record pseudonymous user, visit and session identifiers, and they may record network and host attributes. Deploying them on real users requires a data-protection assessment.
- **Experimental metrics:** several metric families are experimental and unvalidated (see [Scope](docs/SCOPE.md)).

## Versions, licence and citation

| Item | Identifier |
|---|---|
| Implementation described in the dissertation | tag `thesis-nfa-impl-2026-11-16` (commit `cffc96c`) |
| Replication package | tag `replication-v1`, branch `replication/thesis-nfa-2026` |
| Historical states | tags `archive/*` (archival references; not releases, not necessarily buildable) |

**Licence:** MIT ([LICENSE](LICENSE)), copyright softscanner-sw. The demo applications under `demo/` are separate repositories with their own licences (both MIT at the referenced commits). The EQ1/EQ2 data under `replication/` are released with this package for verification of the dissertation's results.

**Citation:** please cite the dissertation and the replication-package tag:

> Bachar Rima. *SoftScanner: An Approach for Functional Testing and Non-Functional Continuous Quality Assessment of Frontend Web Applications.* Doctoral dissertation, Université de Montpellier, 2026.
> Replication package: https://github.com/softscanner-sw/softscanner-continuous-quality-assessment-backend/tree/replication-v1
