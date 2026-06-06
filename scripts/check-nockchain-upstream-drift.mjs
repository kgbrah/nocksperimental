#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const aggregateChecks = [
  {
    id: "docs",
    label: "Tier 0 and promoted Tier 1 docs",
    domain: "source-authority",
    command: "npm run check:nockchain-docs-drift -- --json",
    npmScript: "check:nockchain-docs-drift"
  },
  {
    id: "cargo-workspace",
    label: "Cargo workspace manifest",
    domain: "rust-workspace",
    command: "npm run check:nockchain-cargo-workspace-drift -- --json",
    npmScript: "check:nockchain-cargo-workspace-drift"
  },
  {
    id: "cargo-manifests",
    label: "Crate Cargo manifests",
    domain: "rust-crate-manifests",
    command: "npm run check:nockchain-cargo-manifests-drift -- --json",
    npmScript: "check:nockchain-cargo-manifests-drift"
  },
  {
    id: "bridge-source",
    label: "Bridge source anchors and bridge-dev scenarios",
    domain: "bridge-source",
    command: "npm run check:nockchain-bridge-source-drift -- --json",
    npmScript: "check:nockchain-bridge-source-drift"
  },
  {
    id: "release-assets",
    label: "Latest release assets",
    domain: "release-build",
    command: "npm run check:nockchain-release-assets-drift -- --json",
    npmScript: "check:nockchain-release-assets-drift"
  },
  {
    id: "pr-radar",
    label: "Open PR and issue radar",
    domain: "pre-merge-review",
    command: "npm run check:nockchain-pr-radar-drift -- --json",
    npmScript: "check:nockchain-pr-radar-drift"
  },
  {
    id: "zorp-org",
    label: "Zorp org and state-jam lineage",
    domain: "zorp-lineage",
    command: "npm run check:zorp-org-drift -- --json",
    npmScript: "check:zorp-org-drift"
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checkResults = options.fixtureDir
    ? loadFixtureReports(options.fixtureDir)
    : runLiveChecks();
  const report = createAggregateReport(checkResults);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report);
  }

  if (report.status !== "in-sync") {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    fixtureDir: "",
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--fixture-dir") {
      const fixtureDir = args[index + 1];

      if (!fixtureDir) {
        throw new Error("--fixture-dir requires a directory");
      }

      options.fixtureDir = fixtureDir;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function loadFixtureReports(fixtureDir) {
  return aggregateChecks.map((check) => {
    const fixturePath = path.resolve(fixtureDir, `${check.id}.json`);

    if (!existsSync(fixturePath)) {
      throw new Error(`Missing fixture report: ${fixturePath}`);
    }

    return normalizeCheckResult(check, JSON.parse(readFileSync(fixturePath, "utf8")), 0, "");
  });
}

function runLiveChecks() {
  return aggregateChecks.map((check) => {
    const result = spawnSync("npm", ["run", check.npmScript, "--", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    const report = parseJsonReport(result.stdout);

    if (!report) {
      return {
        id: check.id,
        label: check.label,
        domain: check.domain,
        command: check.command,
        status: "failed",
        exitCode: result.status ?? 1,
        sourceUrls: [],
        snapshot: null,
        checks: {},
        impact: null,
        drift: {
          stderr: result.stderr.trim(),
          stdout: result.stdout.trim()
        }
      };
    }

    return normalizeCheckResult(check, report, result.status ?? 0, result.stderr);
  });
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

function normalizeCheckResult(check, report, exitCode, stderr) {
  return {
    id: check.id,
    label: check.label,
    domain: check.domain,
    command: check.command,
    status: report.status === "in-sync" ? "in-sync" : "review-needed",
    exitCode,
    sourceUrls: Array.isArray(report.sourceUrls) ? report.sourceUrls : [],
    snapshot: report.snapshot ?? null,
    checks: report.checks ?? {},
    impact: report.impact ?? null,
    drift: report.drift ?? {},
    stderr: stderr.trim()
  };
}

function createAggregateReport(checkResults) {
  const reviewNeeded = checkResults.filter((check) => check.status === "review-needed");
  const failed = checkResults.filter((check) => check.status === "failed");
  const inSync = checkResults.filter((check) => check.status === "in-sync");
  const status = reviewNeeded.length === 0 && failed.length === 0 ? "in-sync" : "review-needed";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    interpretation:
      "Aggregates the Nockchain/Zorp drift checks that keep Nocksperimental's source authority, Rust workspace, crate manifests, bridge source anchors, release, PR radar, and lineage assumptions current.",
    requiredCommands: aggregateChecks.map((check) => check.command),
    sourceUrls: unique(checkResults.flatMap((check) => check.sourceUrls)),
    summary: {
      totalChecks: checkResults.length,
      inSyncChecks: inSync.length,
      reviewNeededChecks: reviewNeeded.length,
      failedChecks: failed.length
    },
    checks: checkResults,
    drift: {
      reviewNeededCheckIds: reviewNeeded.map((check) => check.id),
      failedCheckIds: failed.map((check) => check.id)
    },
    nextActions: [
      "Classify each review-needed check against the watch board before updating receipt, runbook, or product surfaces.",
      "Refresh the affected Nocksperimental atlas or monitor metadata before issuing new fakenet, wallet, Nockup, bridge, VESL, or state-jam evidence.",
      "Re-run the aggregate drift check after the targeted surface has been updated and verified."
    ]
  };
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function printTextReport(report) {
  console.log(`Nockchain upstream drift: ${report.status}`);
  console.log(`Checks: ${report.summary.inSyncChecks}/${report.summary.totalChecks} in sync`);

  if (report.status === "in-sync") {
    return;
  }

  console.log(JSON.stringify(report.drift, null, 2));
}
