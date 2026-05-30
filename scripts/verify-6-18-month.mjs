#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "schemas/nockapp-trust-signal.schema.json",
  "src/data/trust-signals.json",
  "src/lib/trust-signals.ts",
  "src/app/api/trust/route.ts",
  "src/app/api/trust/badges/route.ts",
  "src/app/api/trust/solver-scores/route.ts",
  "src/app/api/trust/token-compatibility/route.ts",
  "src/app/api/trust/compute-benchmarks/route.ts",
  "src/app/trust/page.tsx",
  "src/app/trust/badges/page.tsx",
  "src/app/trust/solver-scores/page.tsx",
  "src/app/trust/token-compatibility/page.tsx",
  "src/app/trust/compute-benchmarks/page.tsx",
  "docs/trust-signals.md"
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

const packageJson = parseJson("package.json");
parseJson("schemas/nockapp-trust-signal.schema.json");
const trustSignals = parseJson("src/data/trust-signals.json");
const reportHistory = parseJson("src/data/report-history.json");

if (!packageJson?.scripts?.["verify:6-18"]) {
  failures.push("package.json is missing verify:6-18");
}

const ci = spawnSync("npm", ["run", "lab:ci"], { encoding: "utf8" });
if (ci.status !== 0) {
  failures.push(`npm run lab:ci failed: ${ci.stderr || ci.stdout}`);
}

const manifest = parseJson(".nocklab/manifest.json");
const generatedReportSlugs = new Set(manifest?.reports?.map((report) => report.app) ?? []);
const historyReportSlugs = new Set(reportHistory?.reports?.map((report) => report.reportSlug) ?? []);

const verifiedBadges = trustSignals?.verifiedBadges ?? [];
const solverScorecards = trustSignals?.solverScorecards ?? [];
const tokenCompatibilityReports = trustSignals?.tokenCompatibilityReports ?? [];
const computeBenchmarkProfiles = trustSignals?.computeBenchmarkProfiles ?? [];
const trustConsumers = trustSignals?.trustConsumers ?? [];

if (verifiedBadges.length < 4) {
  failures.push("trust registry should include at least 4 verified badges");
}

const requiredBadgeKinds = [
  "app-report",
  "solver-score",
  "token-compatibility",
  "compute-benchmark"
];
for (const kind of requiredBadgeKinds) {
  if (!verifiedBadges.some((badge) => badge.kind === kind && badge.status === "verified")) {
    failures.push(`verified badges should include verified ${kind}`);
  }
}

for (const badge of verifiedBadges) {
  if (!badge.evidence?.reportHash || !badge.evidence?.snapshotRoot || !badge.evidence?.signature) {
    failures.push(`${badge.id}: badge evidence must include reportHash, snapshotRoot, and signature`);
  }
}

if (solverScorecards.length === 0) {
  failures.push("solver execution-quality scoring should include at least one scorecard");
}
for (const scorecard of solverScorecards) {
  if (scorecard.score < 0 || scorecard.score > 100) {
    failures.push(`${scorecard.id}: solver score should be between 0 and 100`);
  }
  if (scorecard.metrics?.replayCount < 1) {
    failures.push(`${scorecard.id}: solver score should include replay evidence`);
  }
  if (!generatedReportSlugs.has(scorecard.reportSlug) && !historyReportSlugs.has(scorecard.reportSlug)) {
    failures.push(`${scorecard.id}: solver reportSlug should reference a generated or historical report`);
  }
}

if (tokenCompatibilityReports.length === 0) {
  failures.push("native token compatibility should include at least one report");
}
for (const report of tokenCompatibilityReports) {
  if (report.status !== "compatible") {
    failures.push(`${report.id}: expected compatible token report`);
  }
  if (!Object.values(report.requirements ?? {}).every(Boolean)) {
    failures.push(`${report.id}: all token compatibility requirements should pass`);
  }
  if ((report.wallets?.length ?? 0) < 2) {
    failures.push(`${report.id}: expected at least 2 wallet compatibility checks`);
  }
  if (!verifiedBadges.some((badge) => badge.id === report.badgeId)) {
    failures.push(`${report.id}: token report should reference a verified badge`);
  }
}

if (computeBenchmarkProfiles.length === 0) {
  failures.push("compute provider benchmark profiles should include at least one profile");
}
for (const profile of computeBenchmarkProfiles) {
  if (profile.score < 0 || profile.score > 100) {
    failures.push(`${profile.id}: compute profile score should be between 0 and 100`);
  }
  if ((profile.jobClasses?.length ?? 0) < 2) {
    failures.push(`${profile.id}: compute profile should include multiple job classes`);
  }
  if (profile.sla?.sampleSize < 1) {
    failures.push(`${profile.id}: compute profile should include sampled SLA evidence`);
  }
  if (!verifiedBadges.some((badge) => badge.id === profile.badgeId)) {
    failures.push(`${profile.id}: compute profile should reference a verified badge`);
  }
}

const requiredConsumers = ["app", "wallet", "fund", "provider"];
const consumerCategories = new Set(trustConsumers.map((consumer) => consumer.category));
for (const category of requiredConsumers) {
  if (!consumerCategories.has(category)) {
    failures.push(`trust consumers should include ${category}`);
  }
}

for (const consumer of trustConsumers) {
  if (!Array.isArray(consumer.uses) || consumer.uses.length === 0) {
    failures.push(`${consumer.id}: trust consumer should use at least one trust signal`);
  }
}

const badgeIds = new Set(verifiedBadges.map((badge) => badge.id));
const solverIds = new Set(solverScorecards.map((scorecard) => scorecard.id));
const tokenReportIds = new Set(tokenCompatibilityReports.map((report) => report.id));
const computeProfileIds = new Set(computeBenchmarkProfiles.map((profile) => profile.id));

for (const consumer of trustConsumers) {
  for (const use of consumer.uses ?? []) {
    if (use.badgeId && !badgeIds.has(use.badgeId)) {
      failures.push(`${consumer.id}: missing badge reference ${use.badgeId}`);
    }
    if (use.scorecardId && !solverIds.has(use.scorecardId)) {
      failures.push(`${consumer.id}: missing solver scorecard reference ${use.scorecardId}`);
    }
    if (use.compatibilityReportId && !tokenReportIds.has(use.compatibilityReportId)) {
      failures.push(`${consumer.id}: missing token compatibility reference ${use.compatibilityReportId}`);
    }
    if (use.benchmarkProfileId && !computeProfileIds.has(use.benchmarkProfileId)) {
      failures.push(`${consumer.id}: missing compute benchmark reference ${use.benchmarkProfileId}`);
    }
  }
}

const trustPage = readText("src/app/trust/page.tsx");
const badgePage = readText("src/app/trust/badges/page.tsx");
const solverPage = readText("src/app/trust/solver-scores/page.tsx");
const tokenPage = readText("src/app/trust/token-compatibility/page.tsx");
const computePage = readText("src/app/trust/compute-benchmarks/page.tsx");
const trustApi = readText("src/app/api/trust/route.ts");
const strategy = readText("docs/strategy.md");
const readme = readText("README.md");

expectIncludes(trustPage, "Trust Signals", "trust overview page");
expectIncludes(badgePage, "Verified report badges", "badge page");
expectIncludes(solverPage, "Solver execution-quality scoring", "solver scoring page");
expectIncludes(tokenPage, "Native token compatibility reports", "token compatibility page");
expectIncludes(computePage, "Compute provider benchmark profiles", "compute benchmark page");
expectIncludes(trustApi, "trustSignals", "trust API route");
expectIncludes(strategy, "## 6-18 Month Build Slice", "strategy 6-18 slice docs");
expectIncludes(readme, "npm run verify:6-18", "README 6-18 verifier docs");

if (failures.length > 0) {
  process.stderr.write(`6-18 month verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`6-18 month verification passed:
- verified report badges include evidence hashes, snapshot roots, signatures, and all badge kinds
- solver execution-quality scorecards reference lab evidence and replay metrics
- native token compatibility reports include wallet checks and passing requirements
- compute provider benchmark profiles include job classes and sampled SLA evidence
- apps, wallets, funds, and providers use Nocksperimental reports as trust signals
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
