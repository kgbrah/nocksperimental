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
  const pagePath = "src/app/nockchain/bridge/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const bridgePage = readText("src/app/nockchain/bridge/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainBridgeSourceTrace", "source page uses bridge source trace");
  assertIncludes(page, "Bridge Source Trace", "source page title");
  assertIncludes(page, "Source Anchors", "source page renders source anchors");
  assertIncludes(page, "Execution Flow", "source page renders execution flow");
  assertIncludes(page, "Trace Contract", "source page renders trace contract");
  assertIncludes(page, "bridge-withdrawals-spec", "source page renders bridge spec anchor");
  assertIncludes(page, "runtime-loop-bootstrap", "source page renders runtime anchor");
  assertIncludes(page, "execution-driver-effects", "source page renders driver anchor");
  assertIncludes(page, "assembly-tick", "source page renders assembly anchor");
  assertIncludes(page, "submission-tick", "source page renders submission anchor");
  assertIncludes(page, "public-submitter", "source page renders public submitter anchor");
  assertIncludes(page, "confirmation-loop", "source page renders confirmation anchor");
  assertIncludes(page, "orphan-retry-loop", "source page renders orphan retry anchor");
  assertIncludes(page, "sequencer-rpc-service", "source page renders RPC anchor");
  assertIncludes(page, "sequencer-store", "source page renders store anchor");
  assertIncludes(page, "sequencer-journal", "source page renders journal anchor");
  assertIncludes(page, "PR #127", "source page renders bridge PR");
  assertIncludes(page, "rawTransactionJam", "source page renders forbidden raw tx jam");
  assertIncludes(page, "sequencerJournalSigningKey", "source page renders forbidden journal signing key");
  assertIncludes(page, 'href="/api/nockchain/bridge-source"', "source page links API");
  assertIncludes(page, 'href="/nockchain/bridge"', "source page links parent");
  assertIncludes(bridgePage, 'href="/nockchain/bridge/source"', "bridge page links source trace page");
  assertIncludes(readme, "/nockchain/bridge/source", "README documents bridge source page");
  assertEqual(
    packageJson.scripts["test:nockchain-bridge-source-page"],
    "node scripts/test-nockchain-bridge-source-page.mjs",
    "package bridge source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-bridge-source-page",
    "full test includes bridge source page"
  );
  assertIncludes(smokeScript, "/nockchain/bridge/source", "Cloudflare smoke checks bridge source page");
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
    throw new Error(`${label}: expected ${JSON.stringify(actual)}, received ${JSON.stringify(expected)}`);
  }
}
