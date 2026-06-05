#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "schemas/nockapp-trust-signal.schema.json",
  "schemas/nockapp-trust-score-history.schema.json",
  "schemas/nockapp-trust-update-log.schema.json",
  "scripts/append-trust-update.mjs",
  "scripts/test-trust-update-append-cli.mjs",
  "scripts/test-trust-update-api.mjs",
  "scripts/test-trust-update-audit-api.mjs",
  "src/data/trust-signals.json",
  "src/data/trust-score-history.json",
  "src/data/trust-update-log.json",
  "src/lib/trust-signals.ts",
  "src/lib/trust-score-history.ts",
  "src/lib/trust-update-log.ts",
  "src/app/api/trust/route.ts",
  "src/app/api/trust/badges/route.ts",
  "src/app/api/trust/badges/[badgeId]/route.ts",
  "src/app/api/trust/solver-scores/route.ts",
  "src/app/api/trust/token-compatibility/route.ts",
  "src/app/api/trust/compute-benchmarks/route.ts",
  "src/app/api/trust/score-history/route.ts",
  "src/app/api/trust/updates/route.ts",
  "src/app/api/trust/updates/audit/route.ts",
  "src/app/trust/page.tsx",
  "src/app/trust/badges/page.tsx",
  "src/app/trust/solver-scores/page.tsx",
  "src/app/trust/token-compatibility/page.tsx",
  "src/app/trust/compute-benchmarks/page.tsx",
  "src/app/trust/score-history/page.tsx",
  "src/app/trust/updates/page.tsx",
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
parseJson("schemas/nockapp-trust-score-history.schema.json");
parseJson("schemas/nockapp-trust-update-log.schema.json");
const trustSignals = parseJson("src/data/trust-signals.json");
const scoreHistory = parseJson("src/data/trust-score-history.json");
const trustUpdateLog = parseJson("src/data/trust-update-log.json");
const reportHistory = parseJson("src/data/report-history.json");

if (!packageJson?.scripts?.["verify:6-18"]) {
  failures.push("package.json is missing verify:6-18");
}
if (!packageJson?.scripts?.["test:trust-update-log"]) {
  failures.push("package.json is missing test:trust-update-log");
}
if (!packageJson?.scripts?.["test:trust-update-append-cli"]) {
  failures.push("package.json is missing test:trust-update-append-cli");
}
if (!packageJson?.scripts?.["test:trust-update-api"]) {
  failures.push("package.json is missing test:trust-update-api");
}
if (!packageJson?.scripts?.["test:trust-update-audit-api"]) {
  failures.push("package.json is missing test:trust-update-audit-api");
}
if (!packageJson?.scripts?.["trust:update:append"]) {
  failures.push("package.json is missing trust:update:append");
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const ci = spawnSync(npmCommand, ["run", "lab:ci"], { encoding: "utf8" });
if (ci.error || ci.status !== 0) {
  failures.push(`npm run lab:ci failed: ${ci.error?.message ?? ci.stderr ?? ci.stdout}`);
}

const manifest = parseJson(".nocklab/manifest.json");
const generatedReportSlugs = new Set(manifest?.reports?.map((report) => report.app) ?? []);
const historyReportSlugs = new Set(reportHistory?.reports?.map((report) => report.reportSlug) ?? []);

const verifiedBadges = trustSignals?.verifiedBadges ?? [];
const badgeIssuanceReceipts = trustSignals?.badgeIssuanceReceipts ?? [];
const badgeRevocations = trustSignals?.badgeRevocations ?? [];
const solverScorecards = trustSignals?.solverScorecards ?? [];
const tokenCompatibilityReports = trustSignals?.tokenCompatibilityReports ?? [];
const computeBenchmarkProfiles = trustSignals?.computeBenchmarkProfiles ?? [];
const trustConsumers = trustSignals?.trustConsumers ?? [];
const scoreHistories = scoreHistory?.histories ?? [];
const trustUpdates = trustUpdateLog?.entries ?? [];

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

if (badgeIssuanceReceipts.length < verifiedBadges.length) {
  failures.push("trust registry should include a signed issuance receipt for every badge record");
}
for (const badge of verifiedBadges) {
  const receipt = badgeIssuanceReceipts.find((item) => item.badgeId === badge.id);

  if (!receipt) {
    failures.push(`${badge.id}: missing signed issuance receipt`);
    continue;
  }
  if (!receipt.issuerKeyId || !receipt.payloadDigest || !receipt.signature) {
    failures.push(`${receipt.id}: issuance receipt should include key id, payload digest, and signature`);
  }
  if (receipt.verification?.status !== "valid") {
    failures.push(`${receipt.id}: issuance receipt verification should be valid`);
  }
  if (receipt.signedPayload?.badgeId !== badge.id) {
    failures.push(`${receipt.id}: signed payload should reference its badge`);
  }
  if (receipt.signedPayload?.reportHash !== badge.evidence.reportHash) {
    failures.push(`${receipt.id}: signed payload should match badge report hash`);
  }
  if (receipt.signedPayload?.snapshotRoot !== badge.evidence.snapshotRoot) {
    failures.push(`${receipt.id}: signed payload should match badge snapshot root`);
  }
}

if (badgeRevocations.length === 0) {
  failures.push("trust registry should include at least one badge revocation record");
}
for (const revocation of badgeRevocations) {
  if (!verifiedBadges.some((badge) => badge.id === revocation.badgeId)) {
    failures.push(`${revocation.id}: revocation should reference an issued badge`);
  }
  if (revocation.replacementBadgeId && !verifiedBadges.some((badge) => badge.id === revocation.replacementBadgeId)) {
    failures.push(`${revocation.id}: replacement badge should reference an issued badge`);
  }
  if (!revocation.revokedAt || !revocation.reason || !revocation.revokedBy) {
    failures.push(`${revocation.id}: revocation should include timestamp, reason, and revoker`);
  }
  if (!revocation.evidence?.reportHash || !revocation.evidence?.snapshotRoot || !revocation.evidence?.signature) {
    failures.push(`${revocation.id}: revocation evidence must include reportHash, snapshotRoot, and signature`);
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
const scoreHistorySignalIds = new Set([
  ...solverIds,
  ...tokenReportIds,
  ...computeProfileIds
]);

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

if (scoreHistory?.storage?.backend !== "static-json") {
  failures.push("score history storage should use the static-json backend");
}
if (scoreHistory?.storage?.source !== "src/data/trust-score-history.json") {
  failures.push("score history storage should name src/data/trust-score-history.json");
}
if (scoreHistories.length < 3) {
  failures.push("score histories should include solver, token compatibility, and compute benchmark histories");
}
for (const history of scoreHistories) {
  if (!scoreHistorySignalIds.has(history.signalId)) {
    failures.push(`${history.id}: score history should reference a known trust signal`);
  }
  if ((history.points?.length ?? 0) < 2) {
    failures.push(`${history.id}: score history should include at least two points`);
  }
  const latestPoint = history.points?.[history.points.length - 1];
  if (!latestPoint?.recordedAt || typeof latestPoint?.score !== "number") {
    failures.push(`${history.id}: score history should include latest timestamp and score`);
  }
  if (!history.storageSource && !scoreHistory?.storage?.source) {
    failures.push(`${history.id}: score history should be backed by a storage source`);
  }
}

if (trustUpdateLog?.chain?.algorithm !== "sha256-dev-chain-v0") {
  failures.push("trust update log should use the sha256-dev-chain-v0 algorithm");
}
if (trustUpdateLog?.chain?.source !== "src/data/trust-update-log.json") {
  failures.push("trust update log should name src/data/trust-update-log.json");
}
if (trustUpdates.length < 4) {
  failures.push("trust update log should include registry, issuance, revocation, and score-history entries");
}
if (trustUpdateLog?.chain?.entryCount !== trustUpdates.length) {
  failures.push("trust update log chain entry count should match entries");
}
for (const [index, entry] of trustUpdates.entries()) {
  const expectedPreviousRoot = index === 0 ? "genesis" : trustUpdates[index - 1].rootHash;

  if (entry.sequence !== index + 1) {
    failures.push(`${entry.id}: update sequence should be contiguous`);
  }
  if (entry.previousRoot !== expectedPreviousRoot) {
    failures.push(`${entry.id}: update previousRoot should match the prior root`);
  }
  if (!entry.entryHash || !entry.rootHash) {
    failures.push(`${entry.id}: update entry should include entryHash and rootHash`);
  }
  if (entry.signature?.verificationStatus !== "valid") {
    failures.push(`${entry.id}: update signature should be valid`);
  }
}
if (trustUpdates.at(-1)?.rootHash !== trustUpdateLog?.chain?.latestRoot) {
  failures.push("trust update log latest root should match the final entry root");
}

const trustPage = readText("src/app/trust/page.tsx");
const badgePage = readText("src/app/trust/badges/page.tsx");
const badgeApi = readText("src/app/api/trust/badges/route.ts");
const badgeDetailApi = readText("src/app/api/trust/badges/[badgeId]/route.ts");
const solverPage = readText("src/app/trust/solver-scores/page.tsx");
const tokenPage = readText("src/app/trust/token-compatibility/page.tsx");
const computePage = readText("src/app/trust/compute-benchmarks/page.tsx");
const scoreHistoryPage = readText("src/app/trust/score-history/page.tsx");
const trustUpdatesPage = readText("src/app/trust/updates/page.tsx");
const trustApi = readText("src/app/api/trust/route.ts");
const scoreHistoryApi = readText("src/app/api/trust/score-history/route.ts");
const trustUpdatesApi = readText("src/app/api/trust/updates/route.ts");
const trustUpdateAuditApi = readText("src/app/api/trust/updates/audit/route.ts");
const trustUpdateLogLib = readText("src/lib/trust-update-log.ts");
const trustUpdateAppendCli = readText("scripts/append-trust-update.mjs");
const trustSignalsDocs = readText("docs/trust-signals.md");
const strategy = readText("docs/strategy.md");
const readme = readText("README.md");

expectIncludes(trustPage, "Trust Signals", "trust overview page");
expectIncludes(trustPage, "signed issuance receipts", "trust overview issuance receipts");
expectIncludes(trustPage, "score histories", "trust overview score histories");
expectIncludes(trustPage, "append-only updates", "trust overview update log");
expectIncludes(badgePage, "Verified report badges", "badge page");
expectIncludes(badgePage, "Issuance digest", "badge page issuance receipt");
expectIncludes(badgePage, "Revocation reason", "badge page revocation ledger");
expectIncludes(solverPage, "Solver execution-quality scoring", "solver scoring page");
expectIncludes(tokenPage, "Native token compatibility reports", "token compatibility page");
expectIncludes(computePage, "Compute provider benchmark profiles", "compute benchmark page");
expectIncludes(scoreHistoryPage, "Storage-backed score histories", "score history page");
expectIncludes(trustUpdatesPage, "Signed append-only registry updates", "trust updates page");
expectIncludes(trustApi, "trustSignals", "trust API route");
expectIncludes(trustApi, "badgeIssuanceReceipts", "trust API issuance receipts");
expectIncludes(trustApi, "scoreHistory", "trust API score history");
expectIncludes(trustApi, "updateLog", "trust API update log");
expectIncludes(badgeApi, "issuanceReceipts", "badge API issuance receipts");
expectIncludes(badgeApi, "revocations", "badge API route");
expectIncludes(badgeDetailApi, "resolvedBadgeForId", "badge detail API route");
expectIncludes(scoreHistoryApi, "scoreHistorySummaries", "score history API route");
expectIncludes(trustUpdatesApi, "trustUpdateChainSummary", "trust update API route");
expectIncludes(trustUpdatesApi, "NOCKS_REGISTRY_UPDATE_KEY", "trust update protected API");
expectIncludes(trustUpdatesApi, "NOCKS_REGISTRY_UPDATE_KEYS", "trust update protected API key rotation");
expectIncludes(trustUpdatesApi, "x-nocks-registry-key-id", "trust update protected API key id header");
expectIncludes(trustUpdatesApi, "safeCompareSecrets", "trust update protected API timing-safe auth");
expectIncludes(trustUpdatesApi, "NOCKS_REGISTRY_UPDATE_WRITE_PATH", "trust update protected API durable path");
expectIncludes(trustUpdatesApi, "NOCKS_REGISTRY_UPDATE_AUDIT_PATH", "trust update protected API audit path");
expectIncludes(trustUpdatesApi, "createTrustUpdateAuditEvent", "trust update protected API audit events");
expectIncludes(trustUpdatesApi, "eventHash", "trust update protected API audit hash");
expectIncludes(trustUpdatesApi, "appendTrustUpdateToLog", "trust update protected API append helper");
expectIncludes(trustUpdatesApi, "writeFileSync", "trust update protected API durable write");
expectIncludes(trustUpdatesApi, "persisted: Boolean(writePath)", "trust update protected API persistence flag");
expectIncludes(trustUpdateAuditApi, "NOCKS_REGISTRY_UPDATE_AUDIT_PATH", "trust update audit reader API path");
expectIncludes(trustUpdateAuditApi, "eventCount", "trust update audit reader API count");
expectIncludes(trustUpdateAuditApi, "latestEvent", "trust update audit reader API latest event");
expectIncludes(trustUpdateAuditApi, "x-nocks-registry-key-id", "trust update audit reader key id header");
expectIncludes(trustUpdateLogLib, "appendTrustUpdateToLog", "trust update append helper");
expectIncludes(trustUpdateLogLib, "createDevHash", "trust update append hashing");
expectIncludes(trustUpdateAppendCli, "appendTrustUpdateToLog", "trust update append CLI");
expectIncludes(trustUpdateAppendCli, "--dry-run", "trust update append CLI dry-run");
expectIncludes(trustSignalsDocs, "appendTrustUpdateToLog", "trust update append docs");
expectIncludes(trustSignalsDocs, "npm run trust:update:append", "trust update append CLI docs");
expectIncludes(trustSignalsDocs, "POST /api/trust/updates", "trust update append API docs");
expectIncludes(trustSignalsDocs, "NOCKS_REGISTRY_UPDATE_KEYS", "trust update key rotation docs");
expectIncludes(trustSignalsDocs, "NOCKS_REGISTRY_UPDATE_WRITE_PATH", "trust update durable API docs");
expectIncludes(trustSignalsDocs, "NOCKS_REGISTRY_UPDATE_AUDIT_PATH", "trust update audit API docs");
expectIncludes(trustSignalsDocs, "GET /api/trust/updates/audit", "trust update audit reader docs");
expectIncludes(strategy, "## 6-18 Month Build Slice", "strategy 6-18 slice docs");
expectIncludes(readme, "npm run verify:6-18", "README 6-18 verifier docs");

if (failures.length > 0) {
  process.stderr.write(`6-18 month verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`6-18 month verification passed:
- verified report badges include evidence hashes, snapshot roots, signatures, and all badge kinds
- signed badge issuance receipts cover every badge record with valid digest and key evidence
- badge revocation records reference issued badges, replacements, and revocation signatures
- solver execution-quality scorecards reference lab evidence and replay metrics
- native token compatibility reports include wallet checks and passing requirements
- compute provider benchmark profiles include job classes and sampled SLA evidence
- storage-backed score histories include referenced signals, latest scores, and persisted source metadata
- signed append-only registry updates link roots, expose valid signature metadata, and provide a tested append helper, CLI, protected durable API, key rotation, hashed audit events, and audit reader API
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
