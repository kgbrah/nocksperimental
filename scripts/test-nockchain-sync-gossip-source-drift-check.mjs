#!/usr/bin/env node

import process from "node:process";
import { spawnSync } from "node:child_process";

import {
  writeFixture,
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
  const scriptPath = "scripts/check-nockchain-sync-gossip-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-sync-gossip-source-drift"],
    "node scripts/check-nockchain-sync-gossip-source-drift.mjs",
    "package sync/gossip source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-sync-gossip-source-drift-check"],
    "node scripts/test-nockchain-sync-gossip-source-drift-check.mjs",
    "package sync/gossip source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-sync-gossip-source-drift-check",
    "full test includes sync/gossip source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/sync-gossip/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-sync-gossip-source-drift -- --json",
    "sync/gossip source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "sync/gossip source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "nockchainSyncGossipTrace",
    "sync/gossip source drift targets state-jam registry"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching sync/gossip source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching sync/gossip source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "sync/gossip source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainSyncGossipTrace",
    "sync/gossip source drift impact targets sync/gossip source trace"
  );
  assertEqual(
    Array.isArray(passingBody.impact.forbiddenFields),
    true,
    "sync/gossip source drift impact exposes a forbiddenFields array"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-sync-gossip-source-drift-check",
    "sync/gossip source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockchain-libp2p-io/src/catch_up.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "CatchUpSignal::is_catching_up"
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(changed.status, 1, "changed PMA fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed PMA fixture status");
  assertIncludes(
    changedBody.drift.sourceHashDrift.map((entry) => entry.path),
    "crates/nockchain-libp2p-io/src/catch_up.rs",
    "sync/gossip source drift detects changed pma.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "CatchUpSignal::is_catching_up",
    "sync/gossip source drift detects missing PMA symbol"
  );

  const advancedFixturePath = writeFixture(trace, {
    githubCommitSha: "ffffffffffffffffffffffffffffffffffffffff"
  });
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
    "sync/gossip source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "sync-gossip-source", "aggregate includes sync/gossip source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-sync-gossip-source-drift",
    "aggregate runs sync/gossip source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "sync-gossip-source",
    "watch aggregate includes sync/gossip source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "sync-gossip-source",
    "checkpoint aggregate drift includes sync/gossip source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-sync-gossip-source-drift",
    "README documents sync/gossip source drift command"
  );
}
