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
  const scriptPath = "scripts/check-nockchain-nockup-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-nockup-source-drift"],
    "node scripts/check-nockchain-nockup-source-drift.mjs",
    "package Nockup source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-nockup-source-drift-check"],
    "node scripts/test-nockchain-nockup-source-drift-check.mjs",
    "package Nockup source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockup-source-drift-check",
    "full test includes Nockup source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/nockup/source/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-nockup-source-drift -- --json",
    "Nockup source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "Nockup source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "nockupValidation",
    "Nockup source drift targets state-jam registry"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching Nockup source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching Nockup source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "Nockup source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainNockupSourceTrace",
    "Nockup source drift impact targets Nockup source trace"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawTemplateArchive",
    "Nockup source drift impact forbids raw PMA slabs"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-nockup-source-drift-check",
    "Nockup source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockup/README.md",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "nockup update"
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
    "crates/nockup/README.md",
    "Nockup source drift detects changed pma.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "nockup update",
    "Nockup source drift detects missing PMA symbol"
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
    "Nockup source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "nockup-source", "aggregate includes Nockup source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-nockup-source-drift",
    "aggregate runs Nockup source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "nockup-source",
    "watch aggregate includes Nockup source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "nockup-source",
    "checkpoint aggregate drift includes Nockup source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-nockup-source-drift",
    "README documents Nockup source drift command"
  );
}
