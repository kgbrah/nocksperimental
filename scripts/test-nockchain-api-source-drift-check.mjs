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
  const scriptPath = "scripts/check-nockchain-api-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-api-source-drift"],
    "node scripts/check-nockchain-api-source-drift.mjs",
    "package API source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-api-source-drift-check"],
    "node scripts/test-nockchain-api-source-drift-check.mjs",
    "package API source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-api-source-drift-check",
    "full test includes API source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/api-source/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-api-source-drift -- --json",
    "API source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "API source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "nockchainApiSourceTrace",
    "API source drift targets state-jam registry"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching API source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching API source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "API source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainApiSourceTrace",
    "API source drift impact targets API source trace"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawTransactionJam",
    "API source drift impact forbids raw PMA slabs"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-api-source-drift-check",
    "API source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockchain-api/src/main.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "NockchainAPIConfig::EnablePublicServer"
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
    "crates/nockchain-api/src/main.rs",
    "API source drift detects changed pma.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "NockchainAPIConfig::EnablePublicServer",
    "API source drift detects missing PMA symbol"
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
    "API source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "api-source", "aggregate includes API source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-api-source-drift",
    "aggregate runs API source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "api-source",
    "watch aggregate includes API source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "api-source",
    "checkpoint aggregate drift includes API source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-api-source-drift",
    "README documents API source drift command"
  );
}
