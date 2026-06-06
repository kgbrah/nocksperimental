#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const pagePath = "src/app/nockchain/drift-status/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainDriftStatus", "drift-status page uses reader");
  assertIncludes(page, "Drift Status", "drift-status page title");
  assertIncludes(page, "Drift Checks", "drift-status page lists checks");
  assertIncludes(page, "How this refreshes", "drift-status page documents refresh");
  assertIncludes(page, "freshness", "drift-status page surfaces freshness");
  assertIncludes(page, "/api/nockchain/drift-status", "drift-status page links to JSON");
  assertIncludes(page, "refresh:nockchain-drift-status", "drift-status page names refresh command");

  assertEqual(
    packageJson.scripts["test:nockchain-drift-status-page"],
    "node scripts/test-nockchain-drift-status-page.mjs",
    "package drift-status page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-drift-status-page",
    "full test includes drift-status page test"
  );

  const readme = readText("README.md");
  assertIncludes(readme, "/api/nockchain/drift-status", "README documents drift-status API");
  assertIncludes(readme, "refresh:nockchain-drift-status", "README documents refresh command");
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}
