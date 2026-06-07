#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scriptPath = "scripts/check-nockchain-upstream-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-upstream-drift"],
    "node scripts/check-nockchain-upstream-drift.mjs",
    "package upstream drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-upstream-drift-check"],
    "node scripts/test-nockchain-upstream-drift-check.mjs",
    "package upstream drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-upstream-drift-check",
    "full test includes upstream drift check"
  );

  const passingFixtureDir = writeFixtureDirectory();
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture-dir", passingFixtureDir, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.summary.totalChecks, 12, "matching total check count");
  assertEqual(passingBody.summary.inSyncChecks, 12, "matching in-sync check count");
  assertEqual(passingBody.summary.reviewNeededChecks, 0, "matching review-needed check count");
  assertEqual(passingBody.summary.failedChecks, 0, "matching failed check count");
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-docs-drift -- --json",
    "aggregate includes docs drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-cargo-workspace-drift -- --json",
    "aggregate includes Cargo workspace drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-cargo-manifests-drift -- --json",
    "aggregate includes Cargo manifests drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-bridge-source-drift -- --json",
    "aggregate includes bridge source drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-wallet-source-drift -- --json",
    "aggregate includes wallet source drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-release-assets-drift -- --json",
    "aggregate includes release asset drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-pr-radar-drift -- --json",
    "aggregate includes PR radar drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:zorp-org-drift -- --json",
    "aggregate includes Zorp org drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-pma-source-drift -- --json",
    "aggregate includes PMA source drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-mining-source-drift -- --json",
    "aggregate includes mining source drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-runtime-safety-source-drift -- --json",
    "aggregate includes runtime-safety source drift command"
  );
  assertIncludes(
    passingBody.requiredCommands,
    "npm run check:nockchain-api-source-drift -- --json",
    "aggregate includes API source drift command"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md",
    "aggregate includes docs source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
    "aggregate includes Cargo source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-wallet/Cargo.toml",
    "aggregate includes Cargo crate manifest source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/bridge-dev/tests/README.md",
    "aggregate includes bridge-dev scenario source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/wallet-tx-builder/src/planner.rs",
    "aggregate includes wallet transaction planner source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/releases/latest",
    "aggregate includes release API source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc",
    "aggregate includes PR API source"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public",
    "aggregate includes Zorp org API source"
  );

  const driftFixtureDir = writeFixtureDirectory({ driftCheckId: "pr-radar" });
  const drift = spawnSync(process.execPath, [scriptPath, "--fixture-dir", driftFixtureDir, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(drift.status, 1, "drift fixture exit status");
  const driftBody = JSON.parse(drift.stdout);
  assertEqual(driftBody.status, "review-needed", "drift fixture status");
  assertEqual(driftBody.summary.inSyncChecks, 11, "drift fixture in-sync count");
  assertEqual(driftBody.summary.reviewNeededChecks, 1, "drift fixture review-needed count");
  assertIncludes(driftBody.drift.reviewNeededCheckIds, "pr-radar", "aggregate detects PR radar drift");
  assertIncludes(
    driftBody.nextActions,
    "Classify each review-needed check against the watch board before updating receipt, runbook, or product surfaces.",
    "aggregate review next action"
  );

  const zorpDriftFixtureDir = writeFixtureDirectory({ driftCheckId: "zorp-org" });
  const zorpDrift = spawnSync(process.execPath, [scriptPath, "--fixture-dir", zorpDriftFixtureDir, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(zorpDrift.status, 1, "Zorp drift fixture exit status");
  const zorpDriftBody = JSON.parse(zorpDrift.stdout);
  const zorpCheck = findCheck(zorpDriftBody, "zorp-org");
  assertIncludes(
    zorpCheck.impact.impactedRepos,
    "zorp-corp/jock-lang",
    "aggregate preserves Zorp impacted repo"
  );
  assertIncludes(
    zorpCheck.impact.impactedRouteIds,
    "authoring-fixture-review",
    "aggregate preserves Zorp source route"
  );
  assertIncludes(
    zorpCheck.impact.impactedVerificationCommands,
    "npm run test:nockup-validation",
    "aggregate preserves Zorp verification command"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/watch/route.ts");
  const response = await GET();
  const board = await response.json();
  assertEqual(
    board.monitor.aggregateDriftCheck.command,
    "npm run check:nockchain-upstream-drift -- --json",
    "watch aggregate drift command"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "docs",
    "watch aggregate includes docs check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "cargo-workspace",
    "watch aggregate includes cargo workspace check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "cargo-manifests",
    "watch aggregate includes cargo manifests check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "bridge-source",
    "watch aggregate includes bridge source check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "wallet-source",
    "watch aggregate includes wallet source check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "release-assets",
    "watch aggregate includes release assets check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "pr-radar",
    "watch aggregate includes PR radar check"
  );
  assertIncludes(
    board.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "zorp-org",
    "watch aggregate includes Zorp org check"
  );
  assertIncludes(
    board.operatorChecklist,
    "Run npm run check:nockchain-upstream-drift -- --json before treating the watch board as current.",
    "watch operator checklist includes aggregate command"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(
    checkpointBody.checks.nockchainWatchAggregateDriftCheckAvailable,
    true,
    "checkpoint aggregate drift check"
  );
  assertEqual(
    checkpointBody.nockchainWatch.aggregateDriftCheck.command,
    "npm run check:nockchain-upstream-drift -- --json",
    "checkpoint aggregate drift command"
  );
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "cargo-workspace",
    "checkpoint aggregate drift check IDs"
  );
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "cargo-manifests",
    "checkpoint aggregate drift manifest check ID"
  );
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "bridge-source",
    "checkpoint aggregate drift bridge source check ID"
  );
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "wallet-source",
    "checkpoint aggregate drift wallet source check ID"
  );

  const watchTest = readText("scripts/test-nockchain-watch.mjs");
  assertIncludes(watchTest, "Aggregate Drift Check", "watch test covers aggregate drift page");

  const page = readText("src/app/nockchain/watch/page.tsx");
  assertIncludes(page, "Aggregate Drift Check", "watch page renders aggregate drift check");
  assertIncludes(page, "npm run check:nockchain-upstream-drift -- --json", "watch page renders aggregate command");

  const readme = readText("README.md");
  assertIncludes(readme, "check:nockchain-upstream-drift", "README documents upstream drift command");
}

function writeFixtureDirectory(options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-upstream-drift-"));

  for (const check of fixtureChecks()) {
    const status = options.driftCheckId === check.id ? "drift" : "in-sync";
    const report = {
      version: "v0",
      status,
      observedAt: "2026-06-06T00:00:00.000Z",
      sourceUrls: check.sourceUrls,
      snapshot: check.snapshot,
      checks: status === "in-sync" ? { ok: true } : { ok: false },
      drift: status === "in-sync" ? {} : { reason: `${check.id} changed` },
      impact: createFixtureImpact(check.id, status)
    };

    writeFileSync(path.join(dir, `${check.id}.json`), JSON.stringify(report, null, 2));
  }

  return dir;
}

function createFixtureImpact(checkId, status) {
  if (checkId !== "zorp-org" || status === "in-sync") {
    return {
      impactedRepos: [],
      impactedRouteIds: [],
      impactedVerificationCommands: []
    };
  }

  return {
    impactedRepos: ["zorp-corp/jock-lang"],
    impactedRouteIds: ["authoring-fixture-review"],
    impactedVerificationCommands: ["npm run test:nockup-validation"]
  };
}

function fixtureChecks() {
  return [
    {
      id: "docs",
      sourceUrls: ["https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md"],
      snapshot: { localDocumentCount: 8, githubDocumentCount: 8 }
    },
    {
      id: "cargo-workspace",
      sourceUrls: ["https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml"],
      snapshot: { localWorkspaceMemberCount: 36, githubWorkspaceMemberCount: 36 }
    },
    {
      id: "cargo-manifests",
      sourceUrls: ["https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-wallet/Cargo.toml"],
      snapshot: { localManifestCount: 36, githubManifestCount: 36 }
    },
    {
      id: "bridge-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/bridge-dev/tests/README.md"
      ],
      snapshot: { sourceAnchorCount: 14, sourceFileCount: 9 }
    },
    {
      id: "wallet-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/wallet-tx-builder/src/planner.rs"
      ],
      snapshot: { sourceAnchorCount: 9, sourceFileCount: 9 }
    },
    {
      id: "release-assets",
      sourceUrls: ["https://api.github.com/repos/nockchain/nockchain/releases/latest"],
      snapshot: { localAssetCount: 16, githubAssetCount: 16 }
    },
    {
      id: "pr-radar",
      sourceUrls: [
        "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc"
      ],
      snapshot: { localOpenPullRequestCount: 35, githubOpenPullRequestCount: 35 }
    },
    {
      id: "zorp-org",
      sourceUrls: ["https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public"],
      snapshot: { localRepoCount: 10, githubRepoCount: 10 }
    },
    {
      id: "pma-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/nockvm/src/pma.rs"
      ],
      snapshot: { sourceAnchorCount: 6, sourceFileCount: 4 }
    },
    {
      id: "mining-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain/src/mining.rs"
      ],
      snapshot: { sourceAnchorCount: 14, sourceFileCount: 11 }
    },
    {
      id: "runtime-safety-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/nockvm/src/mem.rs"
      ],
      snapshot: { sourceAnchorCount: 9, sourceFileCount: 5 }
    },
    {
      id: "api-source",
      sourceUrls: [
        "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-api/src/main.rs"
      ],
      snapshot: { sourceAnchorCount: 13, sourceFileCount: 8 }
    }
  ];
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
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (body, init = {}) => ({
            headers: init.headers ?? {},
            status: init.status ?? 200,
            json: async () => body
          })
        }
      };
    }

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

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function findCheck(report, checkId) {
  const check = report.checks.find((entry) => entry.id === checkId);

  if (!check) {
    throw new Error(`Missing aggregate check ${checkId}`);
  }

  return check;
}
