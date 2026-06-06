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
  const pagePath = "src/app/nockchain/rust/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const rustPage = readText("src/app/nockchain/rust/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainRustSourceGuide", "Rust source page uses guide");
  assertIncludes(page, "Nockchain Rust Source Guide", "Rust source page title");
  assertIncludes(page, "Source Anchors", "Rust source page renders anchors");
  assertIncludes(page, "Source Trace Contract", "Rust source page renders contract");
  assertIncludes(page, "Learning Path", "Rust source page renders learning path");
  assertIncludes(page, "node-runtime", "Rust source page renders node domain");
  assertIncludes(page, "mining-runtime", "Rust source page renders mining domain");
  assertIncludes(page, "p2p-sync-gossip", "Rust source page renders sync/gossip domain");
  assertIncludes(page, "nockapp-runtime", "Rust source page renders NockApp domain");
  assertIncludes(page, "pma-durability", "Rust source page renders PMA domain");
  assertIncludes(page, "runtime-stack-safety", "Rust source page renders stack safety domain");
  assertIncludes(page, "wallet-cli", "Rust source page renders wallet domain");
  assertIncludes(page, "bridge-withdrawal", "Rust source page renders bridge withdrawal domain");
  assertIncludes(page, "bridge-sequencer", "Rust source page renders bridge sequencer domain");
  assertIncludes(page, "nockup-scaffold", "Rust source page renders nockup domain");
  assertIncludes(page, "nockchain-node-main", "Rust source page renders node main anchor");
  assertIncludes(page, "libp2p-catch-up-signal", "Rust source page renders catch-up anchor");
  assertIncludes(page, "libp2p-gossip-suppression", "Rust source page renders gossip suppression anchor");
  assertIncludes(page, "nockapp-poke-peek", "Rust source page renders NockApp poke/peek anchor");
  assertIncludes(page, "pma-open-growth", "Rust source page renders PMA anchor");
  assertIncludes(page, "nockstack-frame-safety", "Rust source page renders stack safety anchor");
  assertIncludes(page, "wallet-cli-commands", "Rust source page renders wallet commands anchor");
  assertIncludes(page, "wallet-tx-planner", "Rust source page renders wallet planner anchor");
  assertIncludes(page, "bridge-sequencer-journal", "Rust source page renders bridge sequencer anchor");
  assertIncludes(page, "rawPmaSlab", "Rust source page renders forbidden PMA field");
  assertIncludes(page, "walletSeedPhrase", "Rust source page renders forbidden wallet seed");
  assertIncludes(page, "sequencerJournalSigningKey", "Rust source page renders forbidden sequencer key");
  assertIncludes(page, 'href="/api/nockchain/rust-source"', "Rust source page links API");
  assertIncludes(page, 'href="/nockchain/rust"', "Rust source page links Rust atlas");
  assertIncludes(page, 'href="/nockchain"', "Rust source page links parent");
  assertIncludes(rustPage, 'href="/nockchain/rust/source"', "Rust atlas page links source guide");
  assertIncludes(nockchainPage, 'href="/nockchain/rust/source"', "Nockchain page links Rust source guide");
  assertIncludes(readme, "/nockchain/rust/source", "README documents Rust source page");
  assertIncludes(readme, "/api/nockchain/rust-source", "README documents Rust source API");
  assertEqual(
    packageJson.scripts["test:nockchain-rust-source-page"],
    "node scripts/test-nockchain-rust-source-page.mjs",
    "package Rust source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-rust-source-page",
    "full test suite includes Rust source page test"
  );
  assertIncludes(smokeScript, "/nockchain/rust/source", "Cloudflare smoke checks Rust source page");
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
