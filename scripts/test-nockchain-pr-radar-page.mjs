#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/pr-radar/page.tsx";
  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const watchPage = readText("src/app/nockchain/watch/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainPrRadar", "PR radar page uses radar");
  assertIncludes(page, "Nockchain PR Radar", "PR radar page title");
  assertIncludes(page, "Open Pull Requests", "PR radar page renders open PRs");
  assertIncludes(page, "Risk Classes", "PR radar page renders risk classes");
  assertIncludes(page, "Review Contract", "PR radar page renders review contract");
  assertIncludes(page, "PR #125", "PR radar page renders Nockup manifest PR");
  assertIncludes(page, "PR #116", "PR radar page renders wallet PR");
  assertIncludes(page, "PR #119", "PR radar page renders NockApp export PR");
  assertIncludes(page, "nockup-fixture-manifest", "PR radar page renders Nockup risk class");
  assertIncludes(page, "wallet-transaction-metadata", "PR radar page renders wallet risk class");
  assertIncludes(page, "nockapp-state-export", "PR radar page renders export state risk class");
  assertIncludes(page, "rawStateJam", "PR radar page shows forbidden raw state");
  assertIncludes(page, "walletSeedPhrase", "PR radar page shows forbidden wallet seed");
  assertIncludes(page, 'href="/api/nockchain/pr-radar"', "PR radar page links API");
  assertIncludes(page, 'href="/nockchain/watch"', "PR radar page links watch page");
  assertIncludes(page, 'href="/nockchain"', "PR radar page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/pr-radar"', "Nockchain page links PR radar");
  assertIncludes(watchPage, 'href="/nockchain/pr-radar"', "Watch page links PR radar");
  assertIncludes(smokeScript, "/nockchain/pr-radar", "Cloudflare smoke includes PR radar page");
  assertIncludes(readme, "/nockchain/pr-radar", "README documents PR radar page");
  assertEqual(
    packageJson.scripts["test:nockchain-pr-radar-page"],
    "node scripts/test-nockchain-pr-radar-page.mjs",
    "package PR radar page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-pr-radar-page", "full test includes PR radar page");
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}
