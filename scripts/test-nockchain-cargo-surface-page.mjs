#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/cargo-surface/page.tsx";
  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const rustPage = readText("src/app/nockchain/rust/page.tsx");
  const knowledgePage = readText("src/app/nockchain/knowledge-spine/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainCargoSurface", "cargo surface page uses surface");
  assertIncludes(page, "Nockchain Cargo Surface", "cargo surface page title");
  assertIncludes(page, "Target Summary", "cargo surface page renders target summary");
  assertIncludes(page, "High-Signal Cargo Crates", "cargo surface page renders crates");
  assertIncludes(page, "Verification Matrix", "cargo surface page renders verification matrix");
  assertIncludes(page, "Evidence Contract", "cargo surface page renders evidence contract");
  assertIncludes(page, "nockchain-wallet", "cargo surface page renders wallet crate");
  assertIncludes(page, "wallet-tx-builder", "cargo surface page renders tx builder");
  assertIncludes(page, "nockchain-libp2p-io", "cargo surface page renders libp2p crate");
  assertIncludes(page, "nockapp-chkjam-to-state-jam", "cargo surface page renders NockApp helper");
  assertIncludes(page, "pma_growth", "cargo surface page renders PMA bench");
  assertIncludes(page, "cargo binary is not installed in this WSL environment", "cargo surface page renders local limitation");
  assertIncludes(page, "rawPmaSlab", "cargo surface page renders forbidden PMA");
  assertIncludes(page, "walletSeedPhrase", "cargo surface page renders forbidden seed");
  assertIncludes(page, 'href="/api/nockchain/cargo-surface"', "cargo surface page links API");
  assertIncludes(page, 'href="/nockchain/rust"', "cargo surface page links Rust atlas");
  assertIncludes(page, 'href="/nockchain/knowledge-spine"', "cargo surface page links knowledge spine");

  assertIncludes(nockchainPage, 'href="/nockchain/cargo-surface"', "Nockchain page links cargo surface");
  assertIncludes(rustPage, 'href="/nockchain/cargo-surface"', "Rust page links cargo surface");
  assertIncludes(knowledgePage, 'href="/nockchain/cargo-surface"', "Knowledge spine page links cargo surface");
  assertIncludes(smokeScript, "/nockchain/cargo-surface", "Cloudflare smoke includes cargo surface page");
  assertIncludes(readme, "/nockchain/cargo-surface", "README documents cargo surface page");
  assertEqual(
    packageJson.scripts["test:nockchain-cargo-surface-page"],
    "node scripts/test-nockchain-cargo-surface-page.mjs",
    "package cargo surface page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-cargo-surface-page", "full test includes cargo surface page");
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
