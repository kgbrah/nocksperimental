#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "docs/strategy.md",
  "docs/invariants.md",
  "schemas/nockapp-lab-fixture.schema.json",
  "schemas/nockapp-lab-report.schema.json",
  "fixtures/hello-counter.lab.json",
  "fixtures/bridge-settlement.lab.json",
  "scripts/run-lab.mjs",
  "src/app/page.tsx",
  "src/app/reports/sample/page.tsx",
  "src/app/api/lab/route.ts",
  "src/app/api/invariants/route.ts",
  "src/app/api/reports/sample/route.ts",
  "src/lib/lab-report.ts"
];

const reportRuns = [
  {
    fixture: "fixtures/hello-counter.lab.json",
    report: ".nocklab/hello-counter.report.json",
    markdown: ".nocklab/hello-counter.report.md"
  },
  {
    fixture: "fixtures/bridge-settlement.lab.json",
    report: ".nocklab/bridge-settlement.report.json",
    markdown: ".nocklab/bridge-settlement.report.md"
  }
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

parseJson("schemas/nockapp-lab-fixture.schema.json");
parseJson("schemas/nockapp-lab-report.schema.json");

for (const run of reportRuns) {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-lab.mjs",
      run.fixture,
      "--out",
      run.report,
      "--markdown",
      run.markdown,
      "--strict"
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    failures.push(`runner failed for ${run.fixture}: ${result.stderr || result.stdout}`);
    continue;
  }

  if (!existsSync(run.report)) {
    failures.push(`missing generated report: ${run.report}`);
    continue;
  }

  if (!existsSync(run.markdown)) {
    failures.push(`missing generated markdown: ${run.markdown}`);
    continue;
  }

  const report = parseJson(run.report);
  if (report) {
    checkReport(run.report, report);
  }
}

const strategy = readText("docs/strategy.md");
const invariants = readText("docs/invariants.md");
const dashboard = readText("src/app/page.tsx");
const hostedReport = readText("src/app/reports/sample/page.tsx");

expectIncludes(strategy, "### 0-30 Days", "strategy has 0-30 day section");
expectIncludes(strategy, "schemas/nockapp-lab-report.schema.json", "strategy references report schema");
expectIncludes(invariants, "Invariant Catalog v0", "invariant catalog documented");
expectIncludes(dashboard, "Fixture-driven lab report", "dashboard renders report artifact");
expectIncludes(hostedReport, "Hosted report viewer", "hosted report viewer page exists");

if (failures.length > 0) {
  process.stderr.write(`30-day verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`30-day verification passed:
- dashboard and hosted report files exist
- fixture and report schemas parse as JSON
- invariant catalog v0 is documented
- ${reportRuns.length} mock fakenet fixtures generate JSON and Markdown reports
- generated reports include passing steps, invariants, and state diffs
`);

function parseJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON in ${file}: ${error.message}`);
    return null;
  }
}

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    failures.push(`unable to read ${file}: ${error.message}`);
    return "";
  }
}

function expectIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    failures.push(`${label}: missing '${needle}'`);
  }
}

function checkReport(file, report) {
  const requiredKeys = [
    "reportId",
    "fixtureId",
    "generatedAt",
    "app",
    "environment",
    "summary",
    "steps",
    "invariants",
    "stateDiffs",
    "nextActions"
  ];

  for (const key of requiredKeys) {
    if (!(key in report)) {
      failures.push(`${file}: missing report key '${key}'`);
    }
  }

  if (report.summary?.status !== "pass") {
    failures.push(`${file}: expected passing report, got '${report.summary?.status}'`);
  }

  if (!Array.isArray(report.steps) || report.steps.length === 0) {
    failures.push(`${file}: expected step results`);
  }

  if (!Array.isArray(report.invariants) || report.invariants.length === 0) {
    failures.push(`${file}: expected invariant results`);
  }

  if (!Array.isArray(report.stateDiffs) || report.stateDiffs.length === 0) {
    failures.push(`${file}: expected state diffs`);
  }
}
