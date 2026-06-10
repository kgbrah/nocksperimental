#!/usr/bin/env node

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { readText, assertFile, assertEqual, assertIncludes } from "./lib/source-drift-check-fixtures.mjs";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scriptPath = "scripts/check-nockchain-roadmap-drift.mjs";
  assertFile(scriptPath);
  assertFile("docs/research/nockchain-roadmap-baseline.json");
  assertFile("docs/nockchain-watch.md");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-roadmap-drift"],
    "node scripts/check-nockchain-roadmap-drift.mjs",
    "package roadmap drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-roadmap-drift-check"],
    "node scripts/test-nockchain-roadmap-drift-check.mjs",
    "package roadmap drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-roadmap-drift-check",
    "full test includes roadmap drift check"
  );

  const baseline = createSnapshot();
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-roadmap-drift-"));
  const baselinePath = path.join(dir, "baseline.json");
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

  // In-sync: identical observation must pass with exit code 0.
  const identicalPath = path.join(dir, "observed-identical.json");
  writeFileSync(identicalPath, JSON.stringify(baseline, null, 2));
  const inSync = runCheck(scriptPath, baselinePath, identicalPath);
  assertEqual(inSync.status, 0, "in-sync exit code");
  const inSyncReport = JSON.parse(inSync.stdout);
  assertEqual(inSyncReport.status, "in-sync", "in-sync report status");

  // Drift: milestone status flip, a new milestone, a new writing, and a
  // watched-page content change with a signal flip must all be detected.
  const drifted = createSnapshot();
  drifted.roadmapMilestones[1] = { status: "COMPLETED", title: "Bridge Withdrawals" };
  drifted.roadmapMilestones.push({ status: "PLANNED", title: "Sharded Proving" });
  drifted.writings.push("bridge-withdrawals-live");
  drifted.docPages["intent-script"] = {
    ...drifted.docPages["intent-script"],
    sha256: "f".repeat(64),
    signals: { zkp: true, planned: false }
  };
  const driftedPath = path.join(dir, "observed-drifted.json");
  writeFileSync(driftedPath, JSON.stringify(drifted, null, 2));
  const drift = runCheck(scriptPath, baselinePath, driftedPath);
  assertEqual(drift.status, 1, "drift exit code");
  const driftReport = JSON.parse(drift.stdout);
  assertEqual(driftReport.status, "drift", "drift report status");
  assertEqual(driftReport.drift.roadmap.statusChanged.length, 1, "milestone status flip detected");
  assertEqual(driftReport.drift.roadmap.statusChanged[0].to, "COMPLETED", "status flip direction");
  assertEqual(driftReport.drift.roadmap.added[0].title, "Sharded Proving", "new milestone detected");
  assertEqual(driftReport.drift.newWritings[0], "bridge-withdrawals-live", "new writing detected");
  const pageChange = driftReport.drift.docPageChanges.find((c) => c.id === "intent-script");
  assertEqual(pageChange?.change, "content-changed", "watched page change detected");
  assertEqual(pageChange?.signalFlips?.[0]?.term, "planned", "signal flip detected");

  console.log("nockchain roadmap drift check tests passed");
}

function createSnapshot() {
  return {
    version: "v0",
    capturedAt: "2026-06-09T00:00:00.000Z",
    roadmapMilestones: [
      { status: "COMPLETED", title: "Mainnet Launch" },
      { status: "CURRENT", title: "Bridge Withdrawals" },
      { status: "PLANNED", title: "Full Nock ZKVM Completion" }
    ],
    writings: ["nockchain-roadmap-2026", "the-pma"],
    docsSiteIndex: ["/", "/architecture/technical-roadmap"],
    docPages: {
      "intent-script": {
        url: "https://docs.nockchain.org/transaction-engine/overview/intent-script.md",
        missing: false,
        sha256: "a".repeat(64),
        signals: { zkp: true, planned: true }
      }
    }
  };
}

function runCheck(scriptPath, baselinePath, fixturePath) {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--json", "--baseline", baselinePath, "--fixture", fixturePath],
    { encoding: "utf8" }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.stderr.trim()) {
    throw new Error(`drift check wrote to stderr: ${result.stderr}`);
  }

  return result;
}
