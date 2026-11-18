# Architecture

This document maps the SoftScanner-NFA process (dissertation Chapter 4, Section 4.3) to the source code of the tagged implementation `thesis-nfa-impl-2026-11-16`. Paths are relative to the repository root.

## Process and components

| Stage                     | What it does                                                                                                                                                                                                                             | Main sources                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Quality goal model        | ISO/IEC 25010-based hierarchy of composite and leaf goals, extended with *User Engagement* (Popularity, Activity, Loyalty) and *Energy Consumption*                                                                                      | `src/core/models/iso-iec-25010.model.ts`, `src/core/goals/goals.ts`                                                |
| Quality mapping model     | Maps leaf goals to metrics, depending on the application type and technology                                                                                                                                                             | `src/core/models/` (SSQMM), `src/core/metrics/metrics-mappers.ts`                                                  |
| Observation requirements  | Registry of the span classes, event types and fields each metric needs, including dependencies inherited from other metrics; metric semantics (polarity, population)                                                                     | `src/core/metrics/metric-observables.ts`, `src/core/metrics/metric-semantics.ts`                                   |
| Instrumentation selection | Resolves the observation requirements of the selected metrics into OpenTelemetry instrumentation modules, browser events and span processors                                                                                             | `src/core/instrumentation/instrumentation-capabilities.ts`, `src/core/instrumentation/instrumentation-manager.ts`  |
| Agent generation          | Generates an OpenTelemetry-JS tracing agent (sources, `package.json`, `tsconfig.json`) under `assets/instrumentations/<app>/`                                                                                                            | `src/modules/instrumentation/opentelemetry/`                                                                       |
| Bundling                  | webpack (Angular, React frontends) or esbuild (Node.js backends)                                                                                                                                                                         | `src/modules/instrumentation/webpack/webpack-bundler.ts`, `src/modules/instrumentation/esbuild/esbuild-bundler.ts` |
| Injection                 | Copies the bundle into the target project and references it: Angular `src/index.html`, React `public/index.html`, Node.js through the `start` script in `package.json`. It records what was changed so that the injection can be removed | `src/core/instrumentation/instrumentation-injection.ts`, `src/modules/instrumentation/{angular,react,node}/`       |
| Telemetry transport       | The generated agent exports spans through a WebSocket exporter to the collector started by the backend                                                                                                                                   | generated `exporterUtils.ts`; `src/modules/telemetry/collectors/websockets/`                                       |
| Storage                   | The collector flushes non-empty batches to MongoDB, filed by application and bundle                                                                                                                                                      | `src/modules/telemetry/datasources/databases/mongodb/`                                                             |
| Assessment cycles         | Queued, periodic cycles; each reads telemetry, computes metrics, normalizes and aggregates, and emits a cycle event (completed or failed)                                                                                                | `src/services/quality-assessment.service.ts`, `src/core/assessment/`                                               |
| Metric computation        | One computer class per metric                                                                                                                                                                                                            | `src/modules/metrics/**`, `src/core/metrics/metrics-computation.ts`                                                |
| Normalization             | Polarity-aware normalization against benchmarks                                                                                                                                                                                          | `src/core/metrics/metrics-interpreters.ts`, `src/core/metrics/benchmarks.ts`                                       |
| Aggregation               | Weighted-sum strategy over the metrics of the selected goal's subtree, with dependency-aware weights                                                                                                                                     | `src/core/assessment/assessment-strategy.ts`                                                                       |
| Records and API           | Score records retain raw and normalized values, weights, benchmarks, polarity and observation status; REST and SSE API                                                                                                                   | `src/api/server.ts`, `src/api/assessment-events.ts`                                                                |

## Generated agent (frontend, User Engagement)

The generated sources for a frontend contain:
- `src/index.ts`, the entry point;
- `src/main/<app>-tracing.ts`, which configures the tracer provider, the selected auto-instrumentations and events, and the span processors;
- `src/utils/` helpers for application metadata, user, session and visit identifiers, and the WebSocket exporter.

The dissertation's Appendix B reproduces these listings for the Posts & Users Angular demo.

Spans are batched (`BatchSpanProcessor`, 510 ms scheduled delay) and sent to `ws://localhost:8081`. The exporter does not guarantee delivery when the connection fails. The dissertation states this limitation.

## Code not used by the assessment pipeline

The repository also contains code that the NFA pipeline does not use at this revision:
- Angular static analyzers (`src/core/analyzers`, `src/modules/analyzers`);
- an OTLP/console exporter and a logging strategy;
- a file-system telemetry datasource;
- dependency-management helpers.

They are kept as they are and are not part of the described approach.
