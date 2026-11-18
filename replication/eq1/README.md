# EQ1: human-process effect (dissertation Section 4.4.1)

In the within-subject study, six participants assessed the *User Engagement* goal under two conditions:
- a semi-automatic OpenTelemetry-based workflow (baseline);
- the SoftScanner workflow.

## Data

| File                                     | Content                                                                     | Class                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `data/eq1_assessment_times.csv`          | one recorded assessment time per participant and condition, in seconds      | verified historical derived artifact                   |
| `data/eq1_reported_precision_recall.csv` | one reported precision and recall value per participant and condition, in % | verified historical derived artifact (reported values) |

**Source:** both files were extracted, value for value, from the retained study-results workbook (sheets `Effort` and `Accuracy`). The workbook itself is not included. The extraction changed only the format:
- `Stakeholder n` became `Pn`;
- the column names were made explicit.

**Columns:**
- `participant`: P1–P6, following the numbering of the retained results. No other participant information is included.
- `baseline_time_s`, `softscanner_time_s`: assessment time from the start of the instrumentation workflow to the final goal score.
- `precision_*_pct`, `recall_*_pct`: reported precision and recall of the collected observations relative to the study's reference data.

**Resolution:** the baseline times are recorded at a resolution of 5 minutes (all are multiples of 300 s).

## Analysis

`node replication/eq1/analyze_eq1.mjs [--check]` computes:
- range and median of the times per condition (the median of six values is the mean of the two middle values);
- each participant's time reduction, `1 - t_SoftScanner / t_baseline`, and its median;
- the coefficient of variation per condition: population standard deviation divided by the mean, as stated in the dissertation.

## Reproducibility

| Reported result                                                                                                  | Status                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline 8,100–21,600 s, median 14,700 s; SoftScanner 31–34 s, median 33 s; median reduction ≈ 99.8 % (Fig. 4.6) | recomputed from retained participant-level values                                                                                                       |
| CV 28.2 % (baseline) and 3.0 % (SoftScanner) (Fig. 4.8)                                                          | recomputed from retained participant-level values                                                                                                       |
| Precision and recall ≈ 50 % (baseline), 100 % (SoftScanner) (Fig. 4.7)                                           | **historical reported values, not recomputed**: the reference observations and the collected observations from which they were derived are not retained |
