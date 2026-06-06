#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const pagePath = "src/app/nockchain/testkit-e2e/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainTestkitE2eTrace", "testkit/e2e page uses trace");
  assertIncludes(page, "Nockchain Testkit/E2E Trace", "testkit/e2e page title");
  assertIncludes(page, "Source Anchors", "testkit/e2e page shows source anchors");
  assertIncludes(page, "Scenario Capabilities", "testkit/e2e page shows scenario capabilities");
  assertIncludes(page, "Receipt Contract", "testkit/e2e page shows receipt contract");
  assertIncludes(page, "Local Verification", "testkit/e2e page shows local verification");
  assertIncludes(page, "Nocksperimental Implications", "testkit/e2e page shows implications");
  assertIncludes(page, "scenario-yaml-schema", "testkit/e2e page shows scenario schema anchor");
  assertIncludes(page, "runner-scenario-lifecycle", "testkit/e2e page shows runner anchor");
  assertIncludes(page, "node-manager-process-docker", "testkit/e2e page shows node manager anchor");
  assertIncludes(page, "grpc-readiness-height", "testkit/e2e page shows gRPC readiness anchor");
  assertIncludes(page, "grpc-transaction-lifecycle", "testkit/e2e page shows transaction anchor");
  assertIncludes(page, "report-json-contract", "testkit/e2e page shows report anchor");
  assertIncludes(page, "peer-speedup-report", "testkit/e2e page shows peer speedup anchor");
  assertIncludes(page, "upgrade-cluster-harness", "testkit/e2e page shows upgrade harness anchor");
  assertIncludes(page, "nous-gen2-scenarios", "testkit/e2e page shows Nous scenarios anchor");
  assertIncludes(page, "Scenario::load_from_path", "testkit/e2e page names scenario loader");
  assertIncludes(page, "NodeManager::start_nodes", "testkit/e2e page names node start symbol");
  assertIncludes(page, "submit_raw_tx", "testkit/e2e page names submit tx symbol");
  assertIncludes(page, "wait_for_tx_in_block", "testkit/e2e page names tx in block symbol");
  assertIncludes(page, "Report::write_json", "testkit/e2e page names report writer");
  assertIncludes(page, "NockchainCluster", "testkit/e2e page names upgrade cluster");
  assertIncludes(page, "process-and-docker-nodes", "testkit/e2e page shows process/docker capability");
  assertIncludes(page, "wallet-command-capture-and-retry", "testkit/e2e page shows wallet capability");
  assertIncludes(page, "transaction-accepted-and-in-block", "testkit/e2e page shows transaction capability");
  assertIncludes(page, "partition-reorg-and-upgrade", "testkit/e2e page shows partition capability");
  assertIncludes(page, "gen2-req-res-peer-speedup", "testkit/e2e page shows gen2 capability");
  assertIncludes(page, "scenarioName", "testkit/e2e page shows scenario name field");
  assertIncludes(page, "scenarioSeed", "testkit/e2e page shows scenario seed field");
  assertIncludes(page, "nodeMode", "testkit/e2e page shows node mode field");
  assertIncludes(page, "stepRecords", "testkit/e2e page shows step records field");
  assertIncludes(page, "assertOutcomes", "testkit/e2e page shows assert outcomes field");
  assertIncludes(page, "artifactHash", "testkit/e2e page shows artifact hash field");
  assertIncludes(page, "walletSeedPhrase", "testkit/e2e page shows forbidden wallet seed");
  assertIncludes(page, "rawWalletExport", "testkit/e2e page shows forbidden wallet export");
  assertIncludes(page, "rawStateJam", "testkit/e2e page shows forbidden state jam");
  assertIncludes(page, "rawTransactionPayload", "testkit/e2e page shows forbidden transaction");
  assertIncludes(page, "cargo check -p nockchain-e2e", "testkit/e2e page shows e2e check command");
  assertIncludes(page, 'href="/api/nockchain/testkit-e2e"', "testkit/e2e page links API");
  assertIncludes(page, 'href="/nockchain/operations"', "testkit/e2e page links operations");
  assertIncludes(page, 'href="/nockchain/sync-gossip"', "testkit/e2e page links sync/gossip");
  assertIncludes(page, 'href="/nockchain/runtime-safety"', "testkit/e2e page links runtime safety");
  assertIncludes(page, 'href="/nockchain"', "testkit/e2e page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/testkit-e2e"', "Nockchain page links testkit/e2e page");
  assertIncludes(smokeScript, "/nockchain/testkit-e2e", "Cloudflare smoke includes testkit/e2e page");
  assertIncludes(readme, "Nockchain Testkit/E2E Trace", "README documents testkit/e2e page");
  assertIncludes(readme, "/nockchain/testkit-e2e", "README documents testkit/e2e page route");
  assertEqual(
    packageJson.scripts["test:nockchain-testkit-e2e-page"],
    "node scripts/test-nockchain-testkit-e2e-page.mjs",
    "package testkit/e2e page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-testkit-e2e-page",
    "full test includes testkit/e2e page test"
  );
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
