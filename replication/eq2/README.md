# EQ2: instrumentation overhead (dissertation Section 4.4.2)

**Benchmark:** browser-level measurements were recorded for two applications.
Each was measured uninstrumented and with two instrumentation configurations.

## Data (original run-level measurement records)

```
data/inventory-management-system/inventory-management-system-{baseline,instrumented-all-events,instrumented-main-events-metadata}.csv
data/industrial-app-2/industrial-app-2-{baseline,instrumented-all-events,instrumented-main-events-metadata}.csv
```

**File content:** the files are byte-identical to the retained originals; checksums are in `../manifest/SHA256SUMS`.
Only the file names of Industrial Application 2 were changed, to the dissertation's pseudonym.
The files contain no application identifiers, URLs or host information.

**Format:** semicolon-separated; one row per measured run.

| Column                                | Use                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Scenario`, `Date`, `Time`            | workload scenario and run time stamp (dd/mm/yyyy)                                        |
| `CPU:Scripting Time (ms)`             | Scripting Time                                                                           |
| `CPU:Rendering Time (ms)`             | Rendering Time                                                                           |
| `CPU:Tasks Time (ms)`                 | Tasks Duration                                                                           |
| `Memory:Average Memory Usage (MB)`    | Average Memory Usage                                                                     |
| `Memory:Peak Memory Usage (MB)`       | Peak Memory Usage                                                                        |
| `Network:Request Count`               | Network Requests                                                                         |
| `Network:Total Data Transferred (MB)` | recorded by the measurement tool; **not part of the reported analysis** and not analysed |

**Configurations** (original data labels → dissertation terms):

| Data label                          | Dissertation                    |
| ----------------------------------- | ------------------------------- |
| `baseline`                          | Uninstrumented baseline         |
| `instrumented-all-events`           | OpenTelemetry (general-purpose) |
| `instrumented-main-events-metadata` | SoftScanner (goal-scoped)       |

Only the configurations used by the reported analysis are included.

**Scenarios in the reported analysis** (10 in total, 10 measured runs each per configuration):

| Application                            | Scenarios                                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Airbus Inventory Management System (7) | `login`, `logout`, `get_all_products`, `sort_products_by_name`, `add_product`, `delete_product`, `update_product` |
| Industrial Application 2 (3)           | `login`, `navigate_page`, `change_address`                                                                        |

The Inventory Management System files also contain runs of `search_products_by_category`. That scenario is not part of the reported analysis and is ignored by the script.

**Data note:** in `inventory-management-system-instrumented-all-events.csv`, line 55 contains two records on one line, because a line terminator is missing in the original file. The analysis keeps the first record (the tenth `delete_product` run) and drops the appended extra `add_product` run. This matches the original aggregation and yields exactly 10 runs for every scenario and configuration. The corrupted field of the kept record is the transferred-volume field, which is not analysed. The script prints this note.

## Analysis

`node replication/eq2/analyze_eq2.mjs [--check]` implements the method of Section 4.4.2:

1. Per application, scenario and configuration, take the mean of the 10 measured runs.
2. Compute the relative overhead per scenario: `O% = (M_instr - M_base) / M_base x 100` (Equation 4.6).
3. The reported overhead per metric is the arithmetic mean of the 10 scenario-level overheads (7 + 3, equally weighted).
4. The reduction in additional overhead relative to the general-purpose configuration is `(1 - O_goal-scoped / O_general-purpose) x 100`, computed from the unrounded means.

Steps 1–3 give the overhead relative to the uninstrumented baseline (Table 4.6, columns 2–3). Step 4 gives the reduction relative to the general-purpose configuration (Table 4.6, last column).

## Reproducibility

| Reported result                                                                                        | Status                                                                                  |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Table 4.6: 18 values; Figure 4.9 plots the same values                                                 | recomputed from the original raw measurements; all reproduced at the reported precision |
| Industrial Application 2 request-count overheads: goal-scoped 0.3–6.6 %, general-purpose 175.5–331.9 % | recomputed; reproduced                                                                  |
| Re-running the benchmark                                                                               | not possible with this package (see `../limitations/`)                                  |
