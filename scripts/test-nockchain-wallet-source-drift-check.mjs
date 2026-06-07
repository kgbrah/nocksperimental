#!/usr/bin/env node

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
  const scriptPath = "scripts/check-nockchain-wallet-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-wallet-source-drift"],
    "node scripts/check-nockchain-wallet-source-drift.mjs",
    "package wallet source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-wallet-source-drift-check"],
    "node scripts/test-nockchain-wallet-source-drift-check.mjs",
    "package wallet source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-wallet-source-drift-check",
    "full test includes wallet source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/wallet/route.ts");
  const response = await GET();
  const atlas = await response.json();
  const sourceContract = atlas.walletTransactionSourceContract;
  assertEqual(
    sourceContract.sourceDriftCheck.command,
    "npm run check:nockchain-wallet-source-drift -- --json",
    "wallet source contract exposes drift command"
  );
  assertIncludes(
    sourceContract.sourceDriftCheck.sourceAnchorIds,
    "wallet-tx-builder-planner",
    "wallet source drift tracks planner anchor"
  );
  assertIncludes(
    sourceContract.sourceDriftCheck.sourceAnchorIds,
    "nockchain-wallet-create-tx",
    "wallet source drift tracks create-tx anchor"
  );
  assertIncludes(
    sourceContract.sourceDriftCheck.compareFields,
    "sourceSha256",
    "wallet source drift compares hashes"
  );
  assertIncludes(
    sourceContract.sourceDriftCheck.compareFields,
    "openPrSignal",
    "wallet source drift compares open PR signal"
  );

  const passingFixturePath = writeFixture(sourceContract);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(passing.status, 0, "matching wallet source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching wallet source fixture status");
  assertEqual(passingBody.snapshot.sourceAnchorCount, 9, "wallet source anchor count");
  assertEqual(passingBody.snapshot.sourceFileCount, 9, "wallet source file count");
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching wallet source commit");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching wallet source anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching wallet source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching wallet source symbols");
  assertEqual(passingBody.checks.openPrSignalMatches, true, "matching wallet source PR signal");
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/wallet-tx-builder/src/planner.rs",
    "wallet source drift documents planner source"
  );
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainWalletAtlas",
    "wallet source drift impact targets wallet atlas"
  );
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "localFakenetEvidence",
    "wallet source drift impact targets fakenet evidence"
  );
  assertIncludes(
    passingBody.impact.receiptFields,
    "feeBreakdown",
    "wallet source drift impact includes fee field"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawUnsignedTx",
    "wallet source drift impact preserves forbidden raw tx"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-wallet-atlas",
    "wallet source drift impact includes wallet atlas test"
  );

  const changedFixturePath = writeFixture(sourceContract, {
    mutatePath: "crates/wallet-tx-builder/src/planner.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "compute_minimum_fee"
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(changed.status, 1, "changed wallet source fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed wallet source fixture status");
  assertIncludes(
    changedBody.drift.sourceHashDrift.map((entry) => entry.path),
    "crates/wallet-tx-builder/src/planner.rs",
    "wallet source drift detects changed planner"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "compute_minimum_fee",
    "wallet source drift detects missing planner symbol"
  );

  const prDriftFixturePath = writeFixture(sourceContract, { openPrStatus: "closed" });
  const prDrift = spawnSync(process.execPath, [scriptPath, "--fixture", prDriftFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(prDrift.status, 1, "wallet PR drift fixture exit status");
  const prDriftBody = JSON.parse(prDrift.stdout);
  assertEqual(prDriftBody.checks.openPrSignalMatches, false, "wallet PR drift check");
  assertIncludes(
    prDriftBody.drift.changedFields,
    "openPrSignal",
    "wallet source drift reports PR signal drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "wallet-source", "aggregate includes wallet source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-wallet-source-drift",
    "aggregate runs wallet source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "wallet-source",
    "watch aggregate includes wallet source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "wallet-source",
    "checkpoint aggregate drift includes wallet source"
  );

  const aggregateTest = readText("scripts/test-nockchain-upstream-drift-check.mjs");
  assertIncludes(aggregateTest, "wallet-source", "aggregate test covers wallet source");

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-wallet-source-drift",
    "README documents wallet source drift command"
  );
}

function writeFixture(sourceContract, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-wallet-source-drift-"));
  const fixturePath = path.join(dir, "wallet-source.json");
  const pinnedSources = createSourceSnapshots(sourceContract, sourceContract.releaseCommit);
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
  const openPrSignal = sourceContract.openPrSignals.find((signal) => signal.id === "wallet-memo-blob-pr-116");

  const fixture = {
    pinned: {
      commitSha: sourceContract.releaseCommit,
      openPrSignals: [openPrSignal],
      sources: pinnedSources
    },
    github: {
      commitSha: options.githubCommitSha ?? sourceContract.releaseCommit,
      openPrSignals: [{ ...openPrSignal, status: options.openPrStatus ?? openPrSignal.status }],
      sources: githubSources
    }
  };

  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  return fixturePath;
}

function createSourceSnapshots(sourceContract, ref) {
  return sourceContract.sourceAnchors.map((anchor) => {
    const symbols = symbolsFromLineAnchors(anchor.lineAnchors);
    const content = `${ref}:${anchor.path}:${symbols.join(",")}`;

    return {
      path: anchor.path,
      rawUrl: `https://raw.githubusercontent.com/nockchain/nockchain/${ref}/${anchor.path}`,
      sha256: anchor.sha256,
      bytes: anchor.bytes,
      presentSymbols: symbols,
      syntheticContentHash: createSyntheticHash(content)
    };
  });
}

function symbolsFromLineAnchors(lineAnchors) {
  const symbols = [];

  for (const line of lineAnchors) {
    for (const match of line.matchAll(/[A-Za-z_][A-Za-z0-9_]+/g)) {
      const symbol = match[0];

      if (/^(line|lines|and|or|test|decodes|normalizes|option|source|zero|amount|default|Bythos)$/.test(symbol)) {
        continue;
      }

      if (/^[A-Z][A-Za-z0-9_]+$/.test(symbol) || symbol.includes("_")) {
        symbols.push(symbol);
      }
    }
  }

  return Array.from(new Set(symbols));
}

function createSyntheticHash(content) {
  let hash = 0;

  for (let index = 0; index < content.length; index += 1) {
    hash = (hash * 31 + content.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}
