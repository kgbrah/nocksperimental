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
  const pagePath = "src/app/nockchain/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const homePage = readText("src/app/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainDocsAtlas", "Nockchain page uses docs atlas");
  assertIncludes(page, "createNockchainStateJamRegistry", "Nockchain page uses state-jam registry");
  assertIncludes(page, "createNockchainReceiptProvenance", "Nockchain page uses shared receipt provenance");
  assertIncludes(page, "createZorpUpstreamMap", "Nockchain page uses Zorp upstream map");
  assertIncludes(page, "Nockchain Evidence", "Nockchain page title");
  assertIncludes(page, "Protocol Drift Alert", "Nockchain page renders protocol drift alert");
  assertIncludes(page, "Zorp State-Jam Watch", "Nockchain page renders state-jam watch");
  assertIncludes(page, "Zorp/Nockchain Monitor", "Nockchain page renders Zorp monitor");
  assertIncludes(page, "protocol-014-status-drift", "Nockchain page renders drift alert id");
  assertIncludes(page, "docsAtlas", "Nockchain page renders docs atlas provenance");
  assertIncludes(page, "latestConsensusCritical", "Nockchain page renders latest consensus spec");
  assertIncludes(page, "Tier 0", "Nockchain page explains Tier 0 docs");
  assertIncludes(page, "Tier 1", "Nockchain page explains Tier 1 docs");
  assertIncludes(page, "docConsistencyAlerts", "Nockchain page renders receipt fields");
  assertIncludes(page, "stateJamRegistry", "Nockchain page renders state-jam registry provenance");
  assertIncludes(page, "PMA Safety", "Nockchain page renders PMA safety");
  assertIncludes(page, "checkpoint-bootstrap", "Nockchain page renders PMA checkpoint bootstrap");
  assertIncludes(page, "pma-fast-path", "Nockchain page renders PMA fast path");
  assertIncludes(page, "zorpMap", "Nockchain page renders Zorp map provenance");
  assertIncludes(page, "zorp-corp", "Nockchain page renders Zorp org source");
  assertIncludes(page, "not a VESL folder", "Nockchain page preserves Drive folder correction");
  assertIncludes(page, 'href="/api/nockchain/docs-atlas"', "Nockchain page links docs atlas API");
  assertIncludes(page, 'href="/api/nockchain/upstream"', "Nockchain page links upstream API");
  assertIncludes(page, 'href="/api/nockchain/zorp"', "Nockchain page links Zorp map API");
  assertIncludes(page, 'href="/api/nockchain/state-jams"', "Nockchain page links state-jams API");
  assertIncludes(page, 'href="/api/nockchain/nockup/receipts"', "Nockchain page links Nockup receipts");
  assertIncludes(homePage, 'href="/nockchain"', "home page links Nockchain page");
  assertIncludes(readme, "/nockchain", "README documents Nockchain page");
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-page",
    "full test suite includes Nockchain page test"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-page"],
    "node scripts/test-nockchain-page.mjs",
    "package Nockchain page test script"
  );
  assertIncludes(smokeScript, "/nockchain", "Cloudflare smoke checks Nockchain page");
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
