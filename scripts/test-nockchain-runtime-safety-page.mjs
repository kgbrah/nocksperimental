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
  const pagePath = "src/app/nockchain/runtime-safety/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const rustSourcePage = readText("src/app/nockchain/rust/source/page.tsx");
  const pmaPage = readText("src/app/nockchain/pma/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainRuntimeSafetyTrace", "runtime safety page uses trace");
  assertIncludes(page, "Nockchain Runtime Safety Trace", "runtime safety page title");
  assertIncludes(page, "Source Anchors", "runtime safety page shows source anchors");
  assertIncludes(page, "Runtime Safety Classes", "runtime safety page shows runtime safety classes");
  assertIncludes(page, "Receipt Contract", "runtime safety page shows receipt contract");
  assertIncludes(page, "Operator Triage", "runtime safety page shows operator triage");
  assertIncludes(page, "Local Verification", "runtime safety page shows local verification");
  assertIncludes(page, "nockstack-frame-bounds", "runtime safety page shows frame bounds anchor");
  assertIncludes(page, "nockstack-frame-lifecycle", "runtime safety page shows frame lifecycle anchor");
  assertIncludes(page, "interpreter-stack-frame-preserve", "runtime safety page shows interpreter anchor");
  assertIncludes(page, "cue-stack-deserialization", "runtime safety page shows cue anchor");
  assertIncludes(page, "rub-backref-bounds", "runtime safety page shows rub/backref anchor");
  assertIncludes(page, "jam-traversal-bounds", "runtime safety page shows jam anchor");
  assertIncludes(page, "noun-space-provenance", "runtime safety page shows noun space anchor");
  assertIncludes(page, "hamt-fixed-depth-preserve", "runtime safety page shows HAMT anchor");
  assertIncludes(page, "pma-direct-reader-bounds", "runtime safety page shows PMA reader anchor");
  assertIncludes(page, "NockStack::is_in_frame", "runtime safety page names frame bounds symbol");
  assertIncludes(page, "NockStack::frame_push", "runtime safety page names frame push symbol");
  assertIncludes(page, "Context::with_stack_frame", "runtime safety page names interpreter frame symbol");
  assertIncludes(page, "cue_bitslice_with_mode", "runtime safety page names cue symbol");
  assertIncludes(page, "rub_backref", "runtime safety page names backref symbol");
  assertIncludes(page, "NounSpace::with_brand", "runtime safety page names noun brand symbol");
  assertIncludes(page, "PmaDirectReader::read_u64", "runtime safety page names PMA reader symbol");
  assertIncludes(page, "stack-frame-pointer-outside-arena", "runtime safety page shows frame issue class");
  assertIncludes(page, "jam-cue-malformed-input", "runtime safety page shows jam/cue issue class");
  assertIncludes(page, "p2p-jam-empty-buffer", "runtime safety page shows P2P jam/cue issue class");
  assertIncludes(page, "height-bound-worker-panic", "runtime safety page shows height issue class");
  assertIncludes(page, "noun-space-stale-epoch", "runtime safety page shows noun-space epoch issue class");
  assertIncludes(page, "runtimeSafetyIssue", "runtime safety page shows receipt issue field");
  assertIncludes(page, "stackFrameCheck", "runtime safety page shows stack-frame receipt field");
  assertIncludes(page, "cueValidationError", "runtime safety page shows cue validation field");
  assertIncludes(page, "pmaOffsetBoundsCheck", "runtime safety page shows PMA bounds receipt field");
  assertIncludes(page, "supportBundleTraceId", "runtime safety page shows support bundle field");
  assertIncludes(page, "rawJamPayload", "runtime safety page shows forbidden jam payload");
  assertIncludes(page, "rawPmaSlab", "runtime safety page shows forbidden PMA slab");
  assertIncludes(page, "rawStackMemory", "runtime safety page shows forbidden stack memory");
  assertIncludes(page, "cargo check -p nockvm", "runtime safety page shows local verification command");
  assertIncludes(page, 'href="/api/nockchain/runtime-safety"', "runtime safety page links API");
  assertIncludes(page, 'href="/nockchain/rust/source"', "runtime safety page links Rust source");
  assertIncludes(page, 'href="/nockchain/pma"', "runtime safety page links PMA");
  assertIncludes(page, 'href="/nockchain/pr-radar"', "runtime safety page links PR radar");
  assertIncludes(page, 'href="/nockchain"', "runtime safety page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/runtime-safety"', "Nockchain page links runtime safety page");
  assertIncludes(rustSourcePage, 'href="/nockchain/runtime-safety"', "Rust source page links runtime safety page");
  assertIncludes(pmaPage, 'href="/nockchain/runtime-safety"', "PMA page links runtime safety page");
  assertIncludes(smokeScript, "/nockchain/runtime-safety", "Cloudflare smoke includes runtime safety page");
  assertIncludes(readme, "Nockchain Runtime Safety Trace", "README documents runtime safety page");
  assertIncludes(readme, "/nockchain/runtime-safety", "README documents runtime safety page route");
  assertEqual(
    packageJson.scripts["test:nockchain-runtime-safety-page"],
    "node scripts/test-nockchain-runtime-safety-page.mjs",
    "package runtime safety page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-runtime-safety-page",
    "full test includes runtime safety page test"
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
