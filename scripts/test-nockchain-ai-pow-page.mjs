#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/ai-pow/page.tsx";
  const libPath = "src/lib/nockchain-ai-pow.ts";
  const docPath = "docs/research/ai-pow-readiness-2026.md";
  assertFile(pagePath);
  assertFile(libPath);
  assertFile(docPath);

  const page = readText(pagePath);
  const lib = readText(libPath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const watchBoard = readText("docs/nockchain-watch.md");
  const prRadarLib = readText("src/lib/nockchain-pr-radar.ts");
  const packageJson = JSON.parse(readText("package.json"));
  const readme = readText("README.md");

  // Page renders from the single-source-of-truth lib.
  assertIncludes(page, "createNockchainAiPowIntelligence", "AI-PoW page uses the intelligence lib");
  assertIncludes(page, "AI Proof-of-Useful-Work readiness", "AI-PoW page title");
  assertIncludes(page, "monitoring, not protocol authority", "AI-PoW page carries the monitoring caveat");
  assertIncludes(page, "not merged", "AI-PoW page states the PR is not merged");
  assertIncludes(page, "Compact recursive certificate", "AI-PoW page renders the certificate section");
  assertIncludes(page, 'href="/nockchain"', "AI-PoW page links parent");
  assertIncludes(page, 'href="/nockchain/pr-radar"', "AI-PoW page links PR radar");

  // The lib must keep the verified PR facts and the safety posture.
  assertIncludes(lib, "preview-open-pr", "lib defaults to preview (unmerged) status");
  assertIncludes(lib, "https://github.com/nockchain/nockchain/pull/124", "lib cites PR #124");
  assertIncludes(lib, "tacryt-socryp", "lib records the author");
  assertIncludes(lib, "ai-pow-miner", "lib records the miner crate");
  assertIncludes(lib, "ai-pow-zk", "lib records the zk crate");
  assertIncludes(lib, "125,382 bytes", "lib records the artifact size measurement");
  assertIncludes(lib, "privateSolverKey", "lib forbids ingesting solver private keys");
  assertIncludes(lib, "compactCertificateBytes", "lib defines the compute-cost evidence field");

  // Locally-measured proving benchmark must be present AND clearly preview/non-authoritative.
  assertIncludes(lib, "provingBenchmark", "lib carries the measured proving benchmark");
  assertIncludes(lib, "compactCertificateBytes: 122597", "lib records measured certificate bytes");
  assertIncludes(lib, "proveWallMs: 10465", "lib records measured prove wall");
  assertIncludes(lib, "preview: true", "proving benchmark is flagged preview");
  assertIncludes(page, "measured locally (preview)", "page labels the benchmark preview");
  assertIncludes(page, "not a live runtime claim", "page states benchmark is not a runtime claim");

  // Cross-surface wiring: index links it; the watch board + PR radar already track it.
  assertIncludes(nockchainPage, 'href="/nockchain/ai-pow"', "Nockchain index links AI-PoW page");
  assertIncludes(watchBoard, "IMPLEMENTATION OPEN", "watch board Front #2 flipped to implementation open");
  assertIncludes(watchBoard, "PR #124", "watch board cites PR #124");
  assertIncludes(prRadarLib, "ai-pow-miner", "PR radar #124 entry updated with crate detail");

  assertIncludes(readme, "/nockchain/ai-pow", "README documents the AI-PoW page");

  assertEqual(
    packageJson.scripts["test:nockchain-ai-pow-page"],
    "node scripts/test-nockchain-ai-pow-page.mjs",
    "package AI-PoW page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-ai-pow-page", "full test includes AI-PoW page");

  console.log("nockchain-ai-pow-page: OK");
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
