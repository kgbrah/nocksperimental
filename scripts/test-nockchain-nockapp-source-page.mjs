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
  const pagePath = "src/app/nockchain/nockapp/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockAppPage = readText("src/app/nockchain/nockapp/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainNockAppSourceTrace", "source page uses source trace");
  assertIncludes(page, "NockApp Source Trace", "source page title");
  assertIncludes(page, "Source Anchors", "source page renders source anchors");
  assertIncludes(page, "Runtime Flow", "source page renders runtime flow");
  assertIncludes(page, "Trace Contract", "source page renders trace contract");
  assertIncludes(page, "nockapp-runtime", "source page renders runtime anchor");
  assertIncludes(page, "driver-io-action", "source page renders driver anchor");
  assertIncludes(page, "poke-effect-broadcast", "source page renders poke anchor");
  assertIncludes(page, "peek-result-boundary", "source page renders peek anchor");
  assertIncludes(page, "private-grpc-boundary", "source page renders private gRPC anchor");
  assertIncludes(page, "public-grpc-boundary", "source page renders public gRPC anchor");
  assertIncludes(page, "event-log-sqlite", "source page renders event log anchor");
  assertIncludes(page, "pma-regression-suite", "source page renders PMA regression anchor");
  assertIncludes(page, "PR #119", "source page renders export_state watch");
  assertIncludes(page, "rawPmaSlab", "source page renders forbidden PMA field");
  assertIncludes(page, "rawEventLog", "source page renders forbidden event log field");
  assertIncludes(page, 'href="/api/nockchain/nockapp-source"', "source page links API");
  assertIncludes(page, 'href="/nockchain/nockapp"', "source page links parent");
  assertIncludes(nockAppPage, 'href="/nockchain/nockapp/source"', "NockApp page links source trace page");
  assertIncludes(readme, "/nockchain/nockapp/source", "README documents NockApp source page");
  assertEqual(
    packageJson.scripts["test:nockchain-nockapp-source-page"],
    "node scripts/test-nockchain-nockapp-source-page.mjs",
    "package NockApp source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockapp-source-page",
    "full test includes NockApp source page"
  );
  assertIncludes(smokeScript, "/nockchain/nockapp/source", "Cloudflare smoke checks NockApp source page");
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
