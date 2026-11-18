# Replication package: SoftScanner-NFA (dissertation Chapter 4)

The package has three parts:

1. **The current implementation:** the code of this repository at `thesis-nfa-impl-2026-11-16`, with its tests and an agent-generation demonstration.
2. **EQ1 evidence:** the retained participant-level results of the user study and a script that recomputes the reported time statistics.
3. **EQ2 evidence:** the raw run-level measurements of the overhead benchmark and a script that recomputes Table 4.6.

The package supports **statistical recomputation** of the reported results from the retained data.

## Quick start
Requires Node.js 22 or later; no dependencies. Run from the repository root:

```bash
node replication/eq1/analyze_eq1.mjs --check
node replication/eq2/analyze_eq2.mjs --check
# or: npm run replicate
```

Each script prints a report and writes it to `results/`:

| Script                | Outputs                                                                   | Expected outcome                        |
| --------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `eq1/analyze_eq1.mjs` | `eq1_report.md`, `eq1_time_statistics.csv`                                | 9/9 reported time statistics reproduced |
| `eq2/analyze_eq2.mjs` | `eq2_report.md`, `eq2_overhead_summary.csv`, `eq2_scenario_overheads.csv` | 22/22 reported values reproduced        |

With `--check`, a script exits with code 1 if any recomputed value differs from the value reported in the dissertation at the reported precision. The reported values are transcribed in `results/manuscript_reported_values.json` and are used only for this comparison.

## Layout

| Path             | Content                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `eq1/`           | [EQ1 data and analysis](eq1/README.md)                                          |
| `eq2/`           | [EQ2 data and analysis](eq2/README.md)                                          |
| `results/`       | generated reports; reported values for comparison                               |
| `demonstration/` | [current-implementation demonstration](demonstration/README.md)                 |
| `limitations/`   | [evidence and reproducibility boundaries](limitations/README.md)                |
| `manifest/`      | [artifact manifest and provenance classes](manifest/ARTIFACTS.md); `SHA256SUMS` |

Verify the data files with `sha256sum -c replication/manifest/SHA256SUMS`, run from the repository root.

## Evidence classes

Each file in the package is assigned one class in [manifest/ARTIFACTS.md](manifest/ARTIFACTS.md):

| Class                                           | Meaning                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Original retained experimental artifact         | measurement records kept as recorded; only the file name may differ                        |
| Verified historical derived artifact            | values extracted without change from a retained historical record; the source was verified |
| Reconstructed analysis script                   | a script written for this package that implements the dissertation's stated method         |
| Current implementation artifact / demonstration | code, tests and demonstrations of the tagged implementation                                |

The manifest also lists historical artifacts that were not recovered, and artifacts withheld for confidentiality.
