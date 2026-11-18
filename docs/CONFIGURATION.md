# Configuration and runtime assumptions

All values below are fixed in the source code of the tagged implementation. The replication package does not change them.

## Runtime

| Component         | Requirement                                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js           | 22 or later (tested: 22.18.0). The generated Node.js agent uses the global `WebSocket` available in Node.js 22                                                                                                             |
| npm               | tested: 10.9.3. Install with `npm ci`, including development dependencies, which the agent generator uses at run time (`webpack`, `terser-webpack-plugin`, `ts-loader`, `babel-loader`, `@babel/preset-env`, `typescript`) |
| MongoDB           | a local server at `mongodb://localhost:27017`. Database `continuous-quality-assessment-web-telemetry-mongodb` (created on first write)                                                                                     |
| Operating systems | tested on Windows 11 (Git Bash and PowerShell). The code uses Node.js path APIs; POSIX systems are expected to work but were not tested for this package                                                                   |

## Network endpoints opened by the backend

| Endpoint                | Purpose                                                                                                             | Defined in                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `http://localhost:3000` | REST and Server-Sent Events API                                                                                     | `src/api/server.ts`                 |
| `ws://localhost:8081`   | telemetry collector. It is started by the backend when an assessment starts; there is no separate collector process | `src/services/telemetry.service.ts` |

The generated agents send telemetry to `ws://localhost:8081` (`src/core/instrumentation/instrumentation-manager.ts`). The instrumented application must therefore run on the same machine as the backend, or the port must be forwarded.

## Telemetry storage and cycles

- **Telemetry storage:** the collector buffers incoming span batches and flushes non-empty buffers every 3 s and on disconnect. They are filed per application and bundle in MongoDB.
- **Assessment cycles:** cycles read the stored telemetry for the current bundle, compute the metrics of the selected goals, normalize them, and aggregate them into goal scores. Each completed cycle is streamed on `/api/assessments`; a failed cycle is streamed as an `assessment-failed` event.

## Files written by the backend

| Location                                   | Content                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `dist/`                                    | compiled backend (`npm run build`, `npm start`, `npm test`)       |
| `assets/instrumentations/<app>/`           | generated agent sources and bundle                                |
| `<metadata.path>` of an assessment request | the injected bundle and the reference to it in the target project |

`dist/` and `assets/` are ignored by Git.

## Dashboard

The web UI is the separate repository [softscanner-continuous-quality-assessment-frontend](https://github.com/softscanner-sw/softscanner-continuous-quality-assessment-frontend). It calls the endpoints listed in the README and expects the backend at `http://localhost:3000`.

## Deployment assumptions

The backend assumes a single trusted user on a local machine:
- the API, the SSE streams and the WebSocket collector have no authentication;
- CORS accepts any origin;
- an assessment request names a local file-system path that the backend modifies.

It must not be exposed to untrusted networks in this configuration.
