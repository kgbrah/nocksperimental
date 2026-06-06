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
  const pagePath = "src/app/nockchain/nockapp/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainNockAppAtlas", "NockApp page uses atlas");
  assertIncludes(page, "NockApp Runtime Atlas", "NockApp page title");
  assertIncludes(page, "Source Authority", "NockApp page renders source authority");
  assertIncludes(page, "Runtime Boundaries", "NockApp page renders runtime boundaries");
  assertIncludes(page, "poke-effects", "NockApp page renders poke boundary");
  assertIncludes(page, "peek-reads", "NockApp page renders peek boundary");
  assertIncludes(page, "pma-durability", "NockApp page renders PMA boundary");
  assertIncludes(page, "grpc-private-endpoint", "NockApp page renders gRPC boundary");
  assertIncludes(page, "nockup-fixture", "NockApp page renders Nockup boundary");
  assertIncludes(page, "Receipt Contract", "NockApp page renders receipt contract");
  assertIncludes(page, "rawPmaSlab", "NockApp page renders forbidden raw PMA field");
  assertIncludes(page, "walletSeedPhrase", "NockApp page renders forbidden seed phrase field");
  assertIncludes(page, "Probe Templates", "NockApp page renders probe templates");
  assertIncludes(page, "poke-roundtrip", "NockApp page renders poke template");
  assertIncludes(page, "state-export-snapshot", "NockApp page renders state export template");
  assertIncludes(page, "Zorp lineage", "NockApp page names Zorp lineage");
  assertIncludes(page, 'href="/api/nockchain/nockapp-atlas"', "NockApp page links API");
  assertIncludes(page, 'href="/nockchain"', "NockApp page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/nockapp"', "Nockchain page links NockApp page");
  assertIncludes(readme, "/nockchain/nockapp", "README documents NockApp page");
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockapp-page",
    "full test includes NockApp page test"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-nockapp-page"],
    "node scripts/test-nockchain-nockapp-page.mjs",
    "package NockApp page test script"
  );
  assertIncludes(smokeScript, "/nockchain/nockapp", "Cloudflare smoke checks NockApp page");
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
