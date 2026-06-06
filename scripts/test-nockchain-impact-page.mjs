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
  const pagePath = "src/app/nockchain/impact/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainImpactQueue", "impact page uses queue");
  assertIncludes(page, "Nockchain Impact Queue", "impact page title");
  assertIncludes(page, "Action Lanes", "impact page renders lanes");
  assertIncludes(page, "Queue Contract", "impact page renders contract");
  assertIncludes(page, "bridge-withdrawal-release", "impact page renders bridge item");
  assertIncludes(page, "nockup-template-manifests", "impact page renders nockup item");
  assertIncludes(page, "wallet-blob-memo", "impact page renders wallet item");
  assertIncludes(page, "nockapp-export-state", "impact page renders NockApp item");
  assertIncludes(page, "pma-state-jam-provenance", "impact page renders PMA state item");
  assertIncludes(page, "fakenet-sync-gossip", "impact page renders fakenet item");
  assertIncludes(page, "zorp-jock-authoring", "impact page renders Zorp/Jock item");
  assertIncludes(page, "nockchain-benchmarking", "impact page renders benchmark item");
  assertIncludes(page, "sourceIds", "impact page labels source IDs");
  assertIncludes(page, "sourceUrls", "impact page labels source URLs");
  assertIncludes(page, "repo:zorp-corp/knock", "impact page renders Knock source ID");
  assertIncludes(page, "repo:zorp-corp/sppark", "impact page renders sppark source ID");
  assertIncludes(
    page,
    "https://github.com/zorp-corp/knock/blob/master/README.md",
    "impact page renders Knock source URL"
  );
  assertIncludes(
    page,
    "https://github.com/zorp-corp/sppark/blob/main/README.md",
    "impact page renders sppark source URL"
  );
  assertIncludes(page, "rawPmaSlab", "impact page renders PMA forbidden field");
  assertIncludes(page, "rawStateJam", "impact page renders state-jam forbidden field");
  assertIncludes(page, "walletSeedPhrase", "impact page renders wallet forbidden field");
  assertIncludes(page, "privateSpendKey", "impact page renders spend-key forbidden field");
  assertIncludes(page, 'href="/api/nockchain/impact"', "impact page links API");
  assertIncludes(page, 'href="/nockchain/watch"', "impact page links watch page");
  assertIncludes(page, 'href="/nockchain/pr-radar"', "impact page links PR radar");
  assertIncludes(page, 'href="/nockchain"', "impact page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/impact"', "Nockchain page links impact page");
  assertIncludes(readme, "Nockchain Impact Queue", "README documents impact queue");
  assertIncludes(readme, "/api/nockchain/impact", "README documents impact API");
  assertIncludes(readme, "/nockchain/impact", "README documents impact page");
  assertEqual(
    packageJson.scripts["test:nockchain-impact-api"],
    "node scripts/test-nockchain-impact-api.mjs",
    "package impact API test script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-impact-page"],
    "node scripts/test-nockchain-impact-page.mjs",
    "package impact page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-impact-api", "full suite includes impact API test");
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-impact-page", "full suite includes impact page test");
  assertIncludes(smokeScript, "/api/nockchain/impact", "Cloudflare smoke checks impact API");
  assertIncludes(smokeScript, "/nockchain/impact", "Cloudflare smoke checks impact page");
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
