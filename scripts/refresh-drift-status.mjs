#!/usr/bin/env node

// Refreshes the committed Nockchain upstream drift-status snapshot
// (src/data/nockchain-drift-status.json) by running the aggregate drift
// check live against GitHub and writing a deterministic snapshot the public
// /api/nockchain/drift-status surface and its tests read offline.
//
// This is the ONLY drift-status script that touches the network. The reader
// lib, API route, page, and tests never fetch; they only read the committed
// snapshot. Intended to be run by maintainers or the scheduled GitHub Action.

import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const snapshotPath = "src/data/nockchain-drift-status.json";
const maxAgeHours = 168;

main();

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const aggregate = runAggregate();
  const observedAt = aggregate.observedAt ?? new Date().toISOString();
  const generatedAt = new Date().toISOString();

  const checks = (aggregate.checks ?? []).map((check) => ({
    id: check.id,
    label: check.label,
    domain: check.domain,
    status: check.status,
    observedAt
  }));

  const snapshot = {
    version: "v0",
    status: aggregate.status ?? "review-needed",
    observedAt,
    generatedAt,
    source: "scripts/refresh-drift-status.mjs",
    aggregateCommand: "npm run check:nockchain-upstream-drift -- --json",
    summary: aggregate.summary ?? {
      totalChecks: checks.length,
      inSyncChecks: checks.filter((check) => check.status === "in-sync").length,
      reviewNeededChecks: checks.filter((check) => check.status === "review-needed").length,
      failedChecks: checks.filter((check) => check.status === "failed").length
    },
    checks,
    freshness: { maxAgeHours }
  };

  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (dryRun) {
    process.stdout.write(serialized);
    return;
  }

  writeFileSync(path.join(process.cwd(), snapshotPath), serialized);
  console.log(
    `Wrote ${snapshotPath}: ${snapshot.summary.inSyncChecks}/${snapshot.summary.totalChecks} in sync (${snapshot.status}).`
  );
}

function runAggregate() {
  const result = spawnSync("npm", ["run", "--silent", "check:nockchain-upstream-drift", "--", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });

  const report = parseJsonReport(result.stdout);

  if (!report) {
    throw new Error(`Could not parse aggregate drift report. stderr: ${result.stderr?.trim() ?? ""}`);
  }

  return report;
}

function parseJsonReport(stdout) {
  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  try {
    return JSON.parse(stdout.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}
