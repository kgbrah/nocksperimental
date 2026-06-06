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
  const pagePath = "src/app/nockchain/api/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainApiSourceTrace", "API source page uses trace");
  assertIncludes(page, "Nockchain Public API Source Trace", "API source page title");
  assertIncludes(page, "Source Anchors", "API source page shows source anchors");
  assertIncludes(page, "API Capabilities", "API source page shows capabilities");
  assertIncludes(page, "Receipt Contract", "API source page shows receipt contract");
  assertIncludes(page, "Endpoint Modes", "API source page shows endpoint modes");
  assertIncludes(page, "Local Verification", "API source page shows verification");
  assertIncludes(page, "api-readme-contract", "API source page shows README anchor");
  assertIncludes(page, "api-binary-bootstrap", "API source page shows bootstrap anchor");
  assertIncludes(page, "public-grpc-cli-flag", "API source page shows CLI flag anchor");
  assertIncludes(page, "api-config-driver-toggle", "API source page shows config anchor");
  assertIncludes(page, "public-grpc-driver", "API source page shows public driver anchor");
  assertIncludes(page, "public-service-startup", "API source page shows service startup anchor");
  assertIncludes(page, "block-explorer-refresh", "API source page shows refresh anchor");
  assertIncludes(page, "transaction-accepted-server", "API source page shows tx accepted anchor");
  assertIncludes(page, "block-explorer-get-blocks", "API source page shows get blocks anchor");
  assertIncludes(page, "block-explorer-transaction-details", "API source page shows tx details anchor");
  assertIncludes(page, "public-api-proto", "API source page shows proto anchor");
  assertIncludes(page, "public-api-metrics", "API source page shows metrics anchor");
  assertIncludes(page, "wallet-public-tx-accepted", "API source page shows wallet tx accepted anchor");
  assertIncludes(page, "NockchainAPIConfig::EnablePublicServer", "API page names API config");
  assertIncludes(page, "NockchainBlockServiceServer", "API page names block service server");
  assertIncludes(page, "NockchainMetricsService", "API page names metrics service");
  assertIncludes(page, "run_transaction_accepted", "API page names wallet tx accepted function");
  assertIncludes(page, "public-server-enablement", "API page shows enablement capability");
  assertIncludes(page, "public-endpoint-security-posture", "API page shows security capability");
  assertIncludes(page, "tx-accepted-not-inclusion", "API page shows tx accepted capability");
  assertIncludes(page, "block-explorer-cache", "API page shows cache capability");
  assertIncludes(page, "metrics-and-health", "API page shows metrics capability");
  assertIncludes(page, "apiEndpoint", "API page shows endpoint field");
  assertIncludes(page, "accessControlPosture", "API page shows access control field");
  assertIncludes(page, "rawTransactionJam", "API page shows forbidden raw transaction");
  assertIncludes(page, "rawNounSlab", "API page shows forbidden raw noun slab");
  assertIncludes(page, "cargo check -p nockchain-api", "API page shows cargo check");
  assertIncludes(page, "private-grpc", "API page shows private mode");
  assertIncludes(page, "public-grpc", "API page shows public mode");
  assertIncludes(page, "hosted-http-manifest", "API page shows hosted mode");
  assertIncludes(page, 'href="/api/nockchain/api-source"', "API page links API");
  assertIncludes(page, 'href="/nockchain/wallet"', "API page links wallet");
  assertIncludes(page, 'href="/fakenet"', "API page links fakenet");
  assertIncludes(page, 'href="/nockchain"', "API page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/api/source"', "Nockchain page links API source page");
  assertIncludes(smokeScript, "/nockchain/api/source", "Cloudflare smoke includes API source page");
  assertIncludes(readme, "Nockchain Public API Source Trace", "README documents API source page");
  assertIncludes(readme, "/nockchain/api/source", "README documents API source page route");
  assertEqual(
    packageJson.scripts["test:nockchain-api-source-page"],
    "node scripts/test-nockchain-api-source-page.mjs",
    "package API source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-api-source-page",
    "full test includes API source page test"
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
