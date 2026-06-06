#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/knowledge-spine/page.tsx";
  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const rustPage = readText("src/app/nockchain/rust/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainKnowledgeSpine", "knowledge spine page uses spine");
  assertIncludes(page, "Nockchain Knowledge Spine", "knowledge spine page title");
  assertIncludes(page, "Document Fingerprints", "knowledge spine page renders fingerprints");
  assertIncludes(page, "Workspace Manifest", "knowledge spine page renders workspace manifest");
  assertIncludes(page, "Coverage Matrix", "knowledge spine page renders coverage matrix");
  assertIncludes(page, "Monitoring Contract", "knowledge spine page renders monitoring contract");
  assertIncludes(page, "Drift Check", "knowledge spine page renders drift check");
  assertIncludes(page, "npm run check:nockchain-docs-drift -- --json", "knowledge spine page renders drift command");
  assertIncludes(
    page,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md",
    "knowledge spine page renders raw START_HERE source"
  );
  assertIncludes(page, "Expertise Ladder", "knowledge spine page renders expertise ladder");
  assertIncludes(page, "START_HERE.md", "knowledge spine page renders START_HERE");
  assertIncludes(page, "crates/nockchain-wallet/README.md", "knowledge spine page renders wallet README");
  assertIncludes(page, "61f86959050831147bebb6f350be297d7a0f2f68d476c8bfac15928efebd71aa", "knowledge spine page renders doc hash");
  assertIncludes(page, "workspaceMemberHash", "knowledge spine page renders workspace hash label");
  assertIncludes(page, "rawPmaSlab", "knowledge spine page renders forbidden PMA");
  assertIncludes(page, "walletSeedPhrase", "knowledge spine page renders forbidden seed");
  assertIncludes(page, 'href="/api/nockchain/knowledge-spine"', "knowledge spine page links API");
  assertIncludes(page, 'href="/nockchain"', "knowledge spine page links parent");
  assertIncludes(page, 'href="/nockchain/rust"', "knowledge spine page links Rust atlas");
  assertIncludes(page, 'href="/nockchain/pr-radar"', "knowledge spine page links PR radar");

  assertIncludes(nockchainPage, 'href="/nockchain/knowledge-spine"', "Nockchain page links knowledge spine");
  assertIncludes(rustPage, 'href="/nockchain/knowledge-spine"', "Rust page links knowledge spine");
  assertIncludes(smokeScript, "/nockchain/knowledge-spine", "Cloudflare smoke includes knowledge spine page");
  assertIncludes(readme, "/nockchain/knowledge-spine", "README documents knowledge spine page");
  assertEqual(
    packageJson.scripts["test:nockchain-knowledge-spine-page"],
    "node scripts/test-nockchain-knowledge-spine-page.mjs",
    "package knowledge spine page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-knowledge-spine-page",
    "full test includes knowledge spine page"
  );
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
