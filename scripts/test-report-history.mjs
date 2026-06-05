#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const {
    reportHistory,
    reportsForWorkspace,
    workspaceVerificationSummary
  } = loadTypeScriptModule("src/lib/report-history.ts");

  const paymentReport = reportHistory.find((report) => report.reportSlug === "payment-flow");
  assertEqual(paymentReport.verification.badgeId, "badge-payment-flow-verified", "payment badge id");
  assertEqual(paymentReport.verification.badgeStatus, "verified", "payment badge status");
  assertEqual(
    paymentReport.verification.reportHash,
    "sha256:3a6d6bff59cb624f-payment-flow",
    "payment report hash"
  );
  assertEqual(paymentReport.verification.snapshotRoot, "3a6d6bff59cb624f", "payment snapshot root");
  assertEqual(paymentReport.verification.signature, "nocklab-sig-payment-flow-v0", "payment signature");
  assertEqual(
    paymentReport.verification.invariantPacks.join(","),
    "payments-core-v0",
    "payment invariant packs"
  );

  const bridgeReport = reportHistory.find((report) => report.reportSlug === "bridge-settlement");
  assertEqual(bridgeReport.verification, undefined, "bridge report without badge");

  const launchReports = reportsForWorkspace("launch-lab-private");
  assertEqual(launchReports[0].verification.badgeId, "badge-payment-flow-verified", "workspace enriched report");

  const launchSummary = workspaceVerificationSummary("launch-lab-private");
  assertEqual(launchSummary.reportCount, 1, "launch workspace report count");
  assertEqual(launchSummary.verifiedReportCount, 1, "launch workspace verified reports");
  assertEqual(launchSummary.unlinkedReportCount, 0, "launch workspace unlinked reports");
  assertEqual(launchSummary.latestBadgeId, "badge-payment-flow-verified", "launch workspace latest badge");
  assertEqual(launchSummary.latestReportSlug, "payment-flow", "launch workspace latest report");
  assertEqual(launchSummary.latestSnapshotRoot, "3a6d6bff59cb624f", "launch workspace latest root");
  assertEqual(launchSummary.badgeIds.join(","), "badge-payment-flow-verified", "launch workspace badge ids");

  const bridgeSummary = workspaceVerificationSummary("audit-room-private");
  assertEqual(bridgeSummary.reportCount, 1, "bridge workspace report count");
  assertEqual(bridgeSummary.verifiedReportCount, 0, "bridge workspace verified reports");
  assertEqual(bridgeSummary.unlinkedReportCount, 1, "bridge workspace unlinked reports");
  assertEqual(bridgeSummary.latestBadgeId, undefined, "bridge workspace latest badge");
  assertEqual(bridgeSummary.badgeIds.length, 0, "bridge workspace badge ids");
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire() {
  return (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
