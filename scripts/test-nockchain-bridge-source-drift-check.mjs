#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import {
  loadTypeScriptModule,
  readText,
  assertFile,
  assertEqual,
  assertIncludes
} from "./lib/source-drift-check-fixtures.mjs";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scriptPath = "scripts/check-nockchain-bridge-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-bridge-source-drift"],
    "node scripts/check-nockchain-bridge-source-drift.mjs",
    "package bridge source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-bridge-source-drift-check"],
    "node scripts/test-nockchain-bridge-source-drift-check.mjs",
    "package bridge source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-bridge-source-drift-check",
    "full test includes bridge source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/bridge-source/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-bridge-source-drift -- --json",
    "bridge source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.sourceAnchorIds,
    "bridge-dev-scenario-readme",
    "bridge source drift tracks bridge-dev README"
  );
  assertIncludes(
    trace.sourceDriftCheck.sourceAnchorIds,
    "bridge-dev-withdrawal-scenarios",
    "bridge source drift tracks bridge-dev scenarios"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "bridge source drift compares hashes"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching bridge source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching bridge source fixture status");
  assertEqual(passingBody.snapshot.sourceAnchorCount, 14, "bridge source anchor count");
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertEqual(
    passingBody.checks.externalScenarioContractCovered,
    true,
    "matching external scenario contract"
  );
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/bridge-dev/tests/README.md",
    "bridge source drift documents bridge-dev README source"
  );
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainBridgeSourceTrace",
    "bridge source drift impact targets bridge source trace"
  );
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "veslEvidenceBridge",
    "bridge source drift impact targets VESL bridge"
  );
  assertIncludes(
    passingBody.impact.receiptFields,
    "scenarioName",
    "bridge source drift impact includes scenario field"
  );
  assertIncludes(
    passingBody.impact.receiptFields,
    "r2JournalEventPrefixHash",
    "bridge source drift impact includes R2 prefix field"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-bridge-source-api",
    "bridge source drift impact includes API test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/bridge-dev/tests/scenarios.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "withdrawal_happy_path_reaches_executed"
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(changed.status, 1, "changed bridge-dev fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed bridge-dev fixture status");
  assertIncludes(
    changedBody.drift.sourceHashDrift.map((entry) => entry.path),
    "crates/bridge-dev/tests/scenarios.rs",
    "bridge source drift detects changed bridge-dev scenarios"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "withdrawal_happy_path_reaches_executed",
    "bridge source drift detects missing scenario symbol"
  );

  const advancedFixturePath = writeFixture(trace, { githubCommitSha: "ffffffffffffffffffffffffffffffffffffffff" });
  const advanced = spawnSync(process.execPath, [scriptPath, "--fixture", advancedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(advanced.status, 1, "advanced commit fixture exit status");
  const advancedBody = JSON.parse(advanced.stdout);
  assertEqual(advancedBody.checks.upstreamCommitMatchesPinned, false, "advanced commit check");
  assertIncludes(
    advancedBody.drift.changedFields,
    "upstreamCommit",
    "bridge source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "bridge-source", "aggregate includes bridge source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-bridge-source-drift",
    "aggregate runs bridge source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "bridge-source",
    "watch aggregate includes bridge source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "bridge-source",
    "checkpoint aggregate drift includes bridge source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-bridge-source-drift",
    "README documents bridge source drift command"
  );
}

function writeFixture(trace, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-bridge-source-drift-"));
  const fixturePath = path.join(dir, "bridge-source.json");
  const pinnedSources = createSourceSnapshots(trace, trace.upstream.commit.sha);
  const githubSources = pinnedSources.map((source) => {
    const githubSource = {
      ...source,
      rawUrl: `https://raw.githubusercontent.com/nockchain/nockchain/master/${source.path}`
    };

    if (source.path !== options.mutatePath) {
      return githubSource;
    }

    return {
      ...githubSource,
      sha256: options.sha256 ?? source.sha256,
      bytes: options.bytes ?? source.bytes,
      presentSymbols: source.presentSymbols.filter((symbol) => symbol !== options.omitSymbol)
    };
  });

  const fixture = {
    pinned: {
      commitSha: trace.upstream.commit.sha,
      sources: pinnedSources
    },
    github: {
      commitSha: options.githubCommitSha ?? trace.upstream.commit.sha,
      sources: githubSources
    }
  };

  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  return fixturePath;
}

function createSourceSnapshots(trace, ref) {
  const symbolsByPath = new Map();

  for (const anchor of trace.sourceAnchors) {
    const symbols = symbolsByPath.get(anchor.upstreamFile) ?? new Set();
    anchor.upstreamSymbols.forEach((symbol) => symbols.add(symbol));
    symbolsByPath.set(anchor.upstreamFile, symbols);
  }

  return Array.from(symbolsByPath.entries()).map(([sourcePath, symbols]) => {
    const content = `${ref}:${sourcePath}:${Array.from(symbols).join(",")}`;

    return {
      path: sourcePath,
      rawUrl: `https://raw.githubusercontent.com/nockchain/nockchain/${ref}/${sourcePath}`,
      sha256: createHash("sha256").update(content).digest("hex"),
      bytes: Buffer.byteLength(content, "utf8"),
      presentSymbols: Array.from(symbols)
    };
  });
}
