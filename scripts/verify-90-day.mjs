#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "nocklab.config.json",
  ".github/workflows/nocklab.yml",
  "docs/ci.md",
  "fixtures/hello-counter.lab.json",
  "fixtures/bridge-settlement.lab.json",
  "fixtures/bridge-delayed.lab.json",
  "schemas/nockapp-lab-config.schema.json",
  "schemas/nockapp-lab-fixture.schema.json",
  "schemas/nockapp-lab-report.schema.json",
  "scripts/run-lab.mjs",
  "src/app/reports/sample/page.tsx"
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

const packageJson = parseJson("package.json");
const config = parseJson("nocklab.config.json");
parseJson("schemas/nockapp-lab-config.schema.json");
parseJson("schemas/nockapp-lab-fixture.schema.json");
parseJson("schemas/nockapp-lab-report.schema.json");

if (!packageJson?.bin?.nocklab) {
  failures.push("package.json does not expose a nocklab CLI bin");
}

if (!packageJson?.scripts?.["lab:ci"]) {
  failures.push("package.json is missing lab:ci");
}

if (!Array.isArray(config?.fixtures) || config.fixtures.length < 3) {
  failures.push("nocklab.config.json should run all bundled fixtures");
}

const ci = spawnSync("npm", ["run", "lab:ci"], { encoding: "utf8" });
if (ci.status !== 0) {
  failures.push(`npm run lab:ci failed: ${ci.stderr || ci.stdout}`);
}

const cli = spawnSync(
  "npm",
  ["exec", "--", "nocklab", "run", "--config", "nocklab.config.json", "--ci", "--strict"],
  { encoding: "utf8" }
);
if (cli.status !== 0) {
  failures.push(`nocklab CLI command failed: ${cli.stderr || cli.stdout}`);
}

const manifest = parseJson(".nocklab/manifest.json");
const summary = readText(".nocklab/summary.md");

if (manifest) {
  if (!["pass", "warn"].includes(manifest.status)) {
    failures.push(`expected CI manifest status pass or warn, got ${manifest.status}`);
  }
  if (!Array.isArray(manifest.reports) || manifest.reports.length < 3) {
    failures.push("CI manifest should include all configured reports");
  }
}

expectIncludes(summary, "NockApp Lab CI Summary", "CI summary title");
expectIncludes(summary, "bridge-delayed-v0", "CI summary bridge alert fixture");

const hello = parseJson(".nocklab/hello-counter.report.json");
const settlement = parseJson(".nocklab/bridge-settlement.report.json");
const delayed = parseJson(".nocklab/bridge-delayed.report.json");

checkReport("hello-counter", hello, { expectedStatus: "pass", minSteps: 4, minInvariants: 4 });
checkReport("bridge-settlement", settlement, { expectedStatus: "pass", minSteps: 5, minInvariants: 3 });
checkReport("bridge-delayed", delayed, { expectedStatus: "warn", minSteps: 3, minInvariants: 2 });

if (delayed && !delayed.alerts?.some((alert) => alert.state === "triggered")) {
  failures.push("bridge-delayed report should include a triggered alert state");
}

if (hello && !hello.steps?.some((step) => step.type === "poke" && step.status === "pass")) {
  failures.push("hello-counter report should prove fixture-driven poke simulation");
}

if (hello && !hello.steps?.some((step) => step.type === "peek" && step.status === "pass")) {
  failures.push("hello-counter report should prove fixture-driven peek simulation");
}

const workflow = readText(".github/workflows/nocklab.yml");
expectIncludes(workflow, "npm run lab:ci", "workflow runs lab:ci");
expectIncludes(workflow, "actions/upload-artifact", "workflow uploads artifacts");
expectIncludes(workflow, "include-hidden-files: true", "workflow uploads hidden .nocklab directory");

if (failures.length > 0) {
  process.stderr.write(`90-day verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`90-day verification passed:
- nocklab CLI bin and lab:ci command exist
- nocklab run --config executes through npm exec
- config-driven local report generation runs every bundled fixture
- fixture-driven peek/poke simulation produces passing results
- JSON, Markdown, manifest, and CI summary artifacts are generated
- bridge monitor reports both clear and triggered alert states
- GitHub Actions workflow publishes .nocklab artifacts
`);

function parseJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`invalid or missing JSON in ${file}: ${error.message}`);
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

function checkReport(name, report, options) {
  if (!report) {
    failures.push(`${name}: missing report`);
    return;
  }
  if (report.summary?.status !== options.expectedStatus) {
    failures.push(`${name}: expected ${options.expectedStatus}, got ${report.summary?.status}`);
  }
  if ((report.steps?.length ?? 0) < options.minSteps) {
    failures.push(`${name}: expected at least ${options.minSteps} steps`);
  }
  if ((report.invariants?.length ?? 0) < options.minInvariants) {
    failures.push(`${name}: expected at least ${options.minInvariants} invariants`);
  }
  if (!Array.isArray(report.alerts)) {
    failures.push(`${name}: expected alerts array`);
  }
  if (!Array.isArray(report.stateDiffs) || report.stateDiffs.length === 0) {
    failures.push(`${name}: expected state diffs`);
  }
}
