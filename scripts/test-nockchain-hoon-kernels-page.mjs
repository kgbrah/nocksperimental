#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/hoon-kernels/page.tsx";
  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const rustPage = readText("src/app/nockchain/rust/page.tsx");
  const nockAppSourcePage = readText("src/app/nockchain/nockapp/source/page.tsx");
  const knowledgePage = readText("src/app/nockchain/knowledge-spine/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainHoonKernelAtlas", "Hoon page uses atlas");
  assertIncludes(page, "Nockchain Hoon Kernel Atlas", "Hoon page title");
  assertIncludes(page, "Compiled Jam Targets", "Hoon page renders jam targets");
  assertIncludes(page, "Kernel Interfaces", "Hoon page renders kernels");
  assertIncludes(page, "Rust Embedding", "Hoon page renders Rust embedding");
  assertIncludes(page, "Evidence Contract", "Hoon page renders evidence contract");
  assertIncludes(page, "assets/dumb.jam", "Hoon page renders dumb jam");
  assertIncludes(page, "assets/miner.jam", "Hoon page renders miner jam");
  assertIncludes(page, "assets/wal.jam", "Hoon page renders wallet jam");
  assertIncludes(page, "assets/peek.jam", "Hoon page renders peek jam");
  assertIncludes(page, "assets/bridge.jam", "Hoon page renders bridge jam");
  assertIncludes(page, "dumbnet-consensus", "Hoon page renders consensus kernel");
  assertIncludes(page, "nockchain-peek", "Hoon page renders peek kernel");
  assertIncludes(page, "rawJamBytes", "Hoon page renders raw jam forbidden");
  assertIncludes(page, "walletSeedPhrase", "Hoon page renders seed forbidden");
  assertIncludes(page, 'href="/api/nockchain/hoon-kernels"', "Hoon page links API");
  assertIncludes(page, 'href="/nockchain/cargo-surface"', "Hoon page links cargo surface");
  assertIncludes(page, 'href="/nockchain/nockapp/source"', "Hoon page links NockApp source");

  assertIncludes(nockchainPage, 'href="/nockchain/hoon-kernels"', "Nockchain page links Hoon kernels");
  assertIncludes(rustPage, 'href="/nockchain/hoon-kernels"', "Rust page links Hoon kernels");
  assertIncludes(nockAppSourcePage, 'href="/nockchain/hoon-kernels"', "NockApp source page links Hoon kernels");
  assertIncludes(knowledgePage, 'href="/nockchain/hoon-kernels"', "Knowledge spine page links Hoon kernels");
  assertIncludes(smokeScript, "/nockchain/hoon-kernels", "Cloudflare smoke includes Hoon page");
  assertIncludes(readme, "/nockchain/hoon-kernels", "README documents Hoon page");
  assertEqual(
    packageJson.scripts["test:nockchain-hoon-kernels-page"],
    "node scripts/test-nockchain-hoon-kernels-page.mjs",
    "package Hoon page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-hoon-kernels-page", "full test includes Hoon page");
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
