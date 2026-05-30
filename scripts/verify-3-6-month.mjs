#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "schemas/nockapp-invariant-pack.schema.json",
  "schemas/nockapp-report-history.schema.json",
  "schemas/nockapp-lab-workspace.schema.json",
  "packs/payments.invariants.json",
  "packs/intents.invariants.json",
  "packs/tokens.invariants.json",
  "fixtures/payment-flow.lab.json",
  "fixtures/intent-settlement.lab.json",
  "fixtures/token-issuance.lab.json",
  "src/data/report-history.json",
  "src/data/private-workspaces.json",
  "src/lib/report-history.ts",
  "src/app/api/history/route.ts",
  "src/app/api/workspaces/route.ts",
  "src/app/reports/history/page.tsx",
  "src/app/workspaces/page.tsx",
  "docs/report-history.md",
  "docs/workspaces.md"
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

const packageJson = parseJson("package.json");
const config = parseJson("nocklab.config.json");
parseJson("schemas/nockapp-lab-fixture.schema.json");
parseJson("schemas/nockapp-lab-report.schema.json");
parseJson("schemas/nockapp-invariant-pack.schema.json");
parseJson("schemas/nockapp-report-history.schema.json");
parseJson("schemas/nockapp-lab-workspace.schema.json");

if (!packageJson?.scripts?.["verify:3-6"]) {
  failures.push("package.json is missing verify:3-6");
}

const expectedFixtures = [
  {
    fixture: "fixtures/payment-flow.lab.json",
    report: ".nocklab/payment-flow.report.json",
    pack: "../packs/payments.invariants.json",
    domain: "payments"
  },
  {
    fixture: "fixtures/intent-settlement.lab.json",
    report: ".nocklab/intent-settlement.report.json",
    pack: "../packs/intents.invariants.json",
    domain: "intents"
  },
  {
    fixture: "fixtures/token-issuance.lab.json",
    report: ".nocklab/token-issuance.report.json",
    pack: "../packs/tokens.invariants.json",
    domain: "token-issuance"
  }
];

for (const item of expectedFixtures) {
  const fixture = parseJson(item.fixture);
  if (!fixture?.invariantPacks?.includes(item.pack)) {
    failures.push(`${item.fixture}: expected invariant pack ${item.pack}`);
  }
}

const expectedPacks = [
  ["packs/payments.invariants.json", "payments"],
  ["packs/intents.invariants.json", "intents"],
  ["packs/tokens.invariants.json", "token-issuance"]
];

for (const [file, domain] of expectedPacks) {
  const pack = parseJson(file);
  if (pack?.domain !== domain) {
    failures.push(`${file}: expected domain ${domain}`);
  }
  if (!Array.isArray(pack?.invariants) || pack.invariants.length < 3) {
    failures.push(`${file}: expected at least 3 invariants`);
  }
}

if (!Array.isArray(config?.fixtures) || config.fixtures.length < 6) {
  failures.push("nocklab.config.json should include original fixtures plus 3-6 month fixtures");
}

for (const item of expectedFixtures) {
  if (!config?.fixtures?.some((fixture) => fixture.path === item.fixture)) {
    failures.push(`nocklab.config.json is missing ${item.fixture}`);
  }
}

const ci = spawnSync("npm", ["run", "lab:ci"], { encoding: "utf8" });
if (ci.status !== 0) {
  failures.push(`npm run lab:ci failed: ${ci.stderr || ci.stdout}`);
}

const manifest = parseJson(".nocklab/manifest.json");
if (manifest) {
  if (!["pass", "warn"].includes(manifest.status)) {
    failures.push(`expected CI manifest status pass or warn, got ${manifest.status}`);
  }
  if (!Array.isArray(manifest.reports) || manifest.reports.length < 6) {
    failures.push("CI manifest should include all original and 3-6 month reports");
  }
}

for (const item of expectedFixtures) {
  checkAdvancedReport(item.report, item.domain);
}

const history = parseJson("src/data/report-history.json");
const workspaces = parseJson("src/data/private-workspaces.json");
const requiredStages = ["pre-launch", "audit", "upgrade", "integration"];
const historyStages = new Set(history?.reports?.map((report) => report.stage) ?? []);

for (const stage of requiredStages) {
  if (!historyStages.has(stage)) {
    failures.push(`report history should include ${stage} usage evidence`);
  }
}

if (!Array.isArray(history?.reports) || history.reports.length < 4) {
  failures.push("report history should include at least 4 stage-specific reports");
}

if (!Array.isArray(workspaces?.workspaces) || workspaces.workspaces.length < 3) {
  failures.push("private workspace data should include at least 3 workspaces");
}

if (workspaces?.workspaces?.some((workspace) => workspace.visibility !== "private")) {
  failures.push("all workspaces should be private");
}

const workspaceSlugs = new Set(workspaces?.workspaces?.map((workspace) => workspace.slug) ?? []);
for (const report of history?.reports ?? []) {
  if (!workspaceSlugs.has(report.workspaceSlug)) {
    failures.push(`report history references missing workspace: ${report.workspaceSlug}`);
  }
}

const workspaceStages = new Set(
  workspaces?.workspaces?.flatMap((workspace) => workspace.stages ?? []) ?? []
);
for (const stage of requiredStages) {
  if (!workspaceStages.has(stage)) {
    failures.push(`workspace stage coverage should include ${stage}`);
  }
}

const runner = readText("scripts/run-lab.mjs");
expectIncludes(runner, "stateSnapshots", "runner captures state snapshots");
expectIncludes(runner, "beforeHash", "runner emits per-step before hash");
expectIncludes(runner, "afterHash", "runner emits per-step after hash");
expectIncludes(runner, "loadFixture", "runner loads invariant packs");

const reportPage = readText("src/app/reports/history/page.tsx");
const workspacePage = readText("src/app/workspaces/page.tsx");
const historyApi = readText("src/app/api/history/route.ts");
const workspaceApi = readText("src/app/api/workspaces/route.ts");
expectIncludes(reportPage, "Hosted report history", "report history page renders hosted history");
expectIncludes(workspacePage, "Private team workspaces", "workspace page renders private workspaces");
expectIncludes(historyApi, "reportHistory", "history API returns report history");
expectIncludes(workspaceApi, "privateWorkspaces", "workspaces API returns private workspaces");

if (failures.length > 0) {
  process.stderr.write(`3-6 month verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`3-6 month verification passed:
- state snapshots, per-step hashes, and per-step diffs are generated
- payment, intent, and token issuance invariant packs are loaded by fixtures
- config-driven CI generates all original and 3-6 month reports
- hosted report history covers pre-launch, audit, upgrade, and integration use
- private team workspace data, APIs, and pages exist
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

function checkAdvancedReport(file, expectedPackDomain) {
  const report = parseJson(file);
  if (!report) {
    return;
  }

  if (report.summary?.status !== "pass") {
    failures.push(`${file}: expected passing report, got ${report.summary?.status}`);
  }

  if (!report.invariantPacks?.some((pack) => pack.domain === expectedPackDomain)) {
    failures.push(`${file}: expected invariant pack domain ${expectedPackDomain}`);
  }

  if (!Array.isArray(report.stateSnapshots) || report.stateSnapshots.length !== report.steps.length + 1) {
    failures.push(`${file}: expected one initial snapshot plus one per step`);
  }

  if (report.summary?.snapshotsCaptured !== report.stateSnapshots?.length) {
    failures.push(`${file}: summary snapshotsCaptured should match stateSnapshots length`);
  }

  if (!report.steps?.every((step) => step.beforeHash && step.afterHash && Array.isArray(step.stateDiffs))) {
    failures.push(`${file}: every step should include hashes and stateDiffs`);
  }

  if (!report.steps?.some((step) => step.stateDiffs.length > 0)) {
    failures.push(`${file}: expected at least one mutating step diff`);
  }

  if (!report.invariants?.every((invariant) => invariant.status === "pass")) {
    failures.push(`${file}: all invariants should pass`);
  }

  if (!Array.isArray(report.stateDiffs) || report.stateDiffs.length === 0) {
    failures.push(`${file}: expected final run state diffs`);
  }
}
