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
  const scriptPath = "scripts/check-nockchain-runtime-safety-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-runtime-safety-source-drift"],
    "node scripts/check-nockchain-runtime-safety-source-drift.mjs",
    "package runtime-safety source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-runtime-safety-source-drift-check"],
    "node scripts/test-nockchain-runtime-safety-source-drift-check.mjs",
    "package runtime-safety source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-runtime-safety-source-drift-check",
    "full test includes runtime-safety source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/runtime-safety/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-runtime-safety-source-drift -- --json",
    "runtime-safety source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "runtime-safety source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "nockchainRuntimeSafety",
    "runtime-safety source drift targets state-jam registry"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching runtime-safety source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching runtime-safety source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "runtime-safety source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainRuntimeSafety",
    "runtime-safety source drift impact targets runtime-safety source trace"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawJamPayload",
    "runtime-safety source drift impact forbids raw PMA slabs"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-runtime-safety-source-drift-check",
    "runtime-safety source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockvm/rust/nockvm/src/mem.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "NockStack::is_in_frame"
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
    "crates/nockvm/rust/nockvm/src/mem.rs",
    "runtime-safety source drift detects changed pma.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "NockStack::is_in_frame",
    "runtime-safety source drift detects missing PMA symbol"
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
    "runtime-safety source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "runtime-safety-source", "aggregate includes runtime-safety source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-runtime-safety-source-drift",
    "aggregate runs runtime-safety source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "runtime-safety-source",
    "watch aggregate includes runtime-safety source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "runtime-safety-source",
    "checkpoint aggregate drift includes runtime-safety source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-runtime-safety-source-drift",
    "README documents runtime-safety source drift command"
  );
}
