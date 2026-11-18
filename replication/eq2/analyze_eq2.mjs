#!/usr/bin/env node
// EQ2 (instrumentation overhead): recompute the reported overhead results from the retained raw
// run-level measurements (April 2024). Statistical recomputation only: this script does not
// rerun the benchmark and does not need the historical instrumentation bundles.
//
// Usage:  node replication/eq2/analyze_eq2.mjs [--check]
//   --check   exit with code 1 if any recomputed value differs from the value reported in the
//             dissertation at the reported precision (see replication/results/manuscript_reported_values.json).
// Outputs (overwritten): replication/results/eq2_scenario_overheads.csv,
//                        replication/results/eq2_overhead_summary.csv, replication/results/eq2_report.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const RESULTS = join(HERE, '..', 'results');
const CHECK = process.argv.includes('--check');

// Configurations, by their original data labels (see replication/eq2/README.md).
const CONFIGS = {
  baseline: 'baseline',                                   // uninstrumented
  general: 'instrumented-all-events',                     // general-purpose OpenTelemetry configuration
  goal: 'instrumented-main-events-metadata',              // goal-scoped (User Engagement) configuration
};

// The ten workload scenarios of the reported analysis (7 + 3). The IMS file also contains
// `search_products_by_category` runs, which were not part of the reported analysis.
const APPS = [
  { id: 'inventory-management-system', label: 'Airbus Inventory Management System',
    scenarios: ['login', 'logout', 'get_all_products', 'sort_products_by_name', 'add_product', 'delete_product', 'update_product'] },
  { id: 'industrial-app-2', label: 'Industrial Application 2',
    scenarios: ['login', 'navigate_page', 'change_address'] },
];

// The six reported metrics (the raw files also contain a transferred-volume column, which is not
// part of the reported analysis and is deliberately not read here).
const METRICS = [
  { key: 'scripting', label: 'Scripting Time', column: 'CPU:Scripting Time (ms)' },
  { key: 'rendering', label: 'Rendering Time', column: 'CPU:Rendering Time (ms)' },
  { key: 'tasks', label: 'Tasks Duration', column: 'CPU:Tasks Time (ms)' },
  { key: 'avg_memory', label: 'Average Memory', column: 'Memory:Average Memory Usage (MB)' },
  { key: 'peak_memory', label: 'Peak Memory', column: 'Memory:Peak Memory Usage (MB)' },
  { key: 'requests', label: 'Network Requests', column: 'Network:Request Count' },
];

const RUNS_PER_CELL = 10;
const anomalies = [];

function load(appId, config) {
  const file = `${appId}-${config}.csv`;
  const lines = readFileSync(join(DATA, appId, file), 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split(';');
  const width = header.length;
  const rows = [];
  lines.slice(1).forEach((line, i) => {
    const fields = line.split(';');
    if (fields.length > width) {
      // A record whose line terminator is missing in the original file: the following run was
      // appended to the same line. The first record is kept (as in the original aggregation);
      // its last field (transferred volume, not analysed) is corrupted; the appended run is dropped.
      anomalies.push(`${file} line ${i + 2}: ${fields.length} fields; kept the first record (${fields[0]} ${fields[2]}), dropped the appended record (${fields[width - 1].replace(/^[0-9.]+/, '')} ${fields[width + 1]})`);
    }
    const rec = {};
    header.forEach((h, k) => { rec[h] = fields[k]; });
    rows.push(rec);
  });
  return rows;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const overhead = (instr, base) => ((instr - base) / base) * 100; // Equation 4.6

// scenario-level means and overheads
const scenarioRows = [];
for (const app of APPS) {
  const data = Object.fromEntries(Object.entries(CONFIGS).map(([k, c]) => [k, load(app.id, c)]));
  for (const scenario of app.scenarios) {
    const row = { app: app.id, scenario };
    for (const m of METRICS) {
      const means = {};
      for (const k of Object.keys(CONFIGS)) {
        const vals = data[k].filter((r) => r.Scenario === scenario).map((r) => Number(r[m.column]));
        if (vals.length !== RUNS_PER_CELL) throw new Error(`${app.id}/${CONFIGS[k]}/${scenario}: ${vals.length} runs, expected ${RUNS_PER_CELL}`);
        if (vals.some((v) => !Number.isFinite(v))) throw new Error(`${app.id}/${CONFIGS[k]}/${scenario}/${m.column}: non-numeric value`);
        means[k] = mean(vals);
      }
      row[`${m.key}_mean_baseline`] = means.baseline;
      row[`${m.key}_mean_general`] = means.general;
      row[`${m.key}_mean_goal`] = means.goal;
      row[`${m.key}_O_general`] = overhead(means.general, means.baseline);
      row[`${m.key}_O_goal`] = overhead(means.goal, means.baseline);
    }
    scenarioRows.push(row);
  }
}

// aggregate: arithmetic mean of the ten scenario-level overheads (equal weights)
const summary = METRICS.map((m) => {
  const og = mean(scenarioRows.map((r) => r[`${m.key}_O_general`]));
  const os = mean(scenarioRows.map((r) => r[`${m.key}_O_goal`]));
  return { metric: m.label, key: m.key, O_general: og, O_goal: os, reduction: (1 - os / og) * 100 };
});

// write outputs
const fmt = (x) => (typeof x === 'number' ? x.toFixed(6) : x);
const scCols = Object.keys(scenarioRows[0]);
writeFileSync(join(RESULTS, 'eq2_scenario_overheads.csv'),
  [scCols.join(','), ...scenarioRows.map((r) => scCols.map((c) => fmt(r[c])).join(','))].join('\n') + '\n');
writeFileSync(join(RESULTS, 'eq2_overhead_summary.csv'),
  ['metric,O_general_purpose_pct,O_goal_scoped_pct,reduction_pct',
    ...summary.map((s) => [s.metric, fmt(s.O_general), fmt(s.O_goal), fmt(s.reduction)].join(','))].join('\n') + '\n');

// comparison with the values reported in the dissertation
const reported = JSON.parse(readFileSync(join(RESULTS, 'manuscript_reported_values.json'), 'utf8')).eq2;
const round = (x, d) => Number(x.toFixed(d));
const cmp = [];
for (const s of summary) {
  const r = reported.table_4_6[s.key];
  cmp.push({ item: `${s.metric}: general-purpose O%`, recomputed: s.O_general, reported: r.general, dec: 1 });
  cmp.push({ item: `${s.metric}: goal-scoped O%`, recomputed: s.O_goal, reported: r.goal, dec: 1 });
  cmp.push({ item: `${s.metric}: reduction %`, recomputed: s.reduction, reported: r.reduction, dec: 0 });
}
const ia2 = scenarioRows.filter((r) => r.app === 'industrial-app-2');
const rng = (k) => [Math.min(...ia2.map((r) => r[k])), Math.max(...ia2.map((r) => r[k]))];
const [g0, g1] = rng('requests_O_goal');
const [p0, p1] = rng('requests_O_general');
const t = reported.industrial_app_2_requests_range;
cmp.push({ item: 'Industrial App 2, Network Requests, goal-scoped min O%', recomputed: g0, reported: t.goal[0], dec: 1 });
cmp.push({ item: 'Industrial App 2, Network Requests, goal-scoped max O%', recomputed: g1, reported: t.goal[1], dec: 1 });
cmp.push({ item: 'Industrial App 2, Network Requests, general-purpose min O%', recomputed: p0, reported: t.general[0], dec: 1 });
cmp.push({ item: 'Industrial App 2, Network Requests, general-purpose max O%', recomputed: p1, reported: t.general[1], dec: 1 });
for (const c of cmp) c.match = round(c.recomputed, c.dec) === c.reported;

const nScen = scenarioRows.length;
const md = [];
md.push('# EQ2 recomputation report', '');
md.push('Generated by `node replication/eq2/analyze_eq2.mjs`. Input: the retained raw run-level measurements in `replication/eq2/data/`.', '');
md.push(`Scenarios: ${nScen} (${APPS.map((a) => `${a.scenarios.length} ${a.label}`).join(', ')}); ${RUNS_PER_CELL} measured runs per scenario and configuration.`, '');
md.push('Method: per scenario and configuration, mean of the measured runs; relative overhead O% = (M_instr - M_base) / M_base x 100 (Equation 4.6); reported value = arithmetic mean of the scenario-level O%; reduction = (1 - O_goal-scoped / O_general-purpose) x 100, computed from unrounded means.', '');
md.push('## Overhead relative to the uninstrumented baseline, and reduction relative to the general-purpose configuration', '');
md.push('| Metric | General-purpose O% | Goal-scoped O% | Reduction % |', '|---|---:|---:|---:|');
for (const s of summary) md.push(`| ${s.metric} | ${s.O_general.toFixed(3)} | ${s.O_goal.toFixed(3)} | ${s.reduction.toFixed(2)} |`);
md.push('', '## Comparison with the dissertation (Table 4.6 and Section 4.4.2 text)', '');
md.push('| Item | Recomputed (unrounded) | Rounded | Reported | Match |', '|---|---:|---:|---:|---|');
for (const c of cmp) md.push(`| ${c.item} | ${c.recomputed.toFixed(4)} | ${c.recomputed.toFixed(c.dec)} | ${c.reported} | ${c.match ? 'yes' : '**NO**'} |`);
md.push('', `Result: ${cmp.filter((c) => c.match).length}/${cmp.length} reported values reproduced at the reported precision.`, '');
md.push('## Data notes', '');
if (anomalies.length) anomalies.forEach((a) => md.push(`- ${a}`)); else md.push('- No malformed records.');
md.push('- The transferred-data-volume column of the raw files is not analysed (not a reported result).');
md.push('- Scenario-level values: `eq2_scenario_overheads.csv`; aggregate values: `eq2_overhead_summary.csv`.');
writeFileSync(join(RESULTS, 'eq2_report.md'), md.join('\n') + '\n');

console.log(md.join('\n'));
if (CHECK && cmp.some((c) => !c.match)) { console.error('EQ2 check FAILED'); process.exit(1); }
