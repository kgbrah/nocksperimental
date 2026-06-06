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
  const pagePath = "src/app/nockchain/mining/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainMiningSourceTrace", "mining page uses trace");
  assertIncludes(page, "Nockchain Mining/PoW Source Trace", "mining page title");
  assertIncludes(page, "Source Anchors", "mining page shows source anchors");
  assertIncludes(page, "Mining Capabilities", "mining page shows capabilities");
  assertIncludes(page, "Receipt Contract", "mining page shows receipt contract");
  assertIncludes(page, "Operational Modes", "mining page shows operational modes");
  assertIncludes(page, "Diagnostic Scenarios", "mining page shows diagnostics");
  assertIncludes(page, "Local Verification", "mining page shows verification");
  assertIncludes(page, "fakenet-miner-script", "mining page shows fakenet script anchor");
  assertIncludes(page, "node-fakenet-script", "mining page shows node fakenet anchor");
  assertIncludes(page, "mainnet-miner-script", "mining page shows mainnet script anchor");
  assertIncludes(page, "mining-cli-flags", "mining page shows CLI anchor");
  assertIncludes(page, "fakenet-constants-poke", "mining page shows fakenet constants anchor");
  assertIncludes(page, "fakenet-blockchain-constants", "mining page shows constants anchor");
  assertIncludes(page, "mining-driver-bootstrap", "mining page shows driver anchor");
  assertIncludes(page, "mining-wire-contract", "mining page shows wire anchor");
  assertIncludes(page, "candidate-effect-handler", "mining page shows candidate anchor");
  assertIncludes(page, "mined-pow-poke", "mining page shows mined poke anchor");
  assertIncludes(page, "miner-kernel-pow-check", "mining page shows miner kernel anchor");
  assertIncludes(page, "pow-library", "mining page shows pow library anchor");
  assertIncludes(page, "candidate-block-state", "mining page shows candidate state anchor");
  assertIncludes(page, "structured-miner-traces", "mining page shows trace anchor");
  assertIncludes(page, "libp2p-request-pow-separation", "mining page shows libp2p pow anchor");
  assertIncludes(page, "MiningWire::Candidate", "mining page names candidate wire");
  assertIncludes(page, "set-mining-key-advanced", "mining page names key poke");
  assertIncludes(page, "enable-mining", "mining page names enable poke");
  assertIncludes(page, "check-target:mine", "mining page names target check");
  assertIncludes(page, "new_heaviest_miner", "mining page names heaviest miner trace");
  assertIncludes(page, "operator-fakenet-miner-command", "mining page shows fakenet command capability");
  assertIncludes(page, "fakenet-difficulty-controls", "mining page shows difficulty capability");
  assertIncludes(page, "proof-kernel-validation", "mining page shows proof validation capability");
  assertIncludes(page, "network-pow-separation", "mining page shows network pow separation capability");
  assertIncludes(page, "wrong-block-commitment", "mining page shows wrong commitment diagnostic");
  assertIncludes(page, "empty-routing-table", "mining page shows empty routing diagnostic");
  assertIncludes(page, "miningPkh", "mining page shows mining pkh field");
  assertIncludes(page, "fakenetPowLen", "mining page shows pow len field");
  assertIncludes(page, "rawMinerJam", "mining page shows forbidden raw miner jam");
  assertIncludes(page, "rawPowProof", "mining page shows forbidden raw pow proof");
  assertIncludes(page, "cargo check -p nockchain", "mining page shows nockchain cargo check");
  assertIncludes(page, "cargo check -p kernels-open-miner", "mining page shows miner cargo check");
  assertIncludes(page, "local-fakenet-hub", "mining page shows hub mode");
  assertIncludes(page, "local-fakenet-miner", "mining page shows miner mode");
  assertIncludes(page, "mainnet-miner", "mining page shows mainnet mode");
  assertIncludes(page, 'href="/api/nockchain/mining-source"', "mining page links API");
  assertIncludes(page, 'href="/nockchain/operations"', "mining page links operations");
  assertIncludes(page, 'href="/nockchain/sync-gossip"', "mining page links sync gossip");
  assertIncludes(page, 'href="/nockchain"', "mining page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/mining/source"', "Nockchain page links mining source page");
  assertIncludes(smokeScript, "/nockchain/mining/source", "Cloudflare smoke includes mining source page");
  assertIncludes(readme, "Nockchain Mining/PoW Source Trace", "README documents mining source page");
  assertIncludes(readme, "/nockchain/mining/source", "README documents mining page route");
  assertEqual(
    packageJson.scripts["test:nockchain-mining-source-page"],
    "node scripts/test-nockchain-mining-source-page.mjs",
    "package mining source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-mining-source-page",
    "full test includes mining source page test"
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
