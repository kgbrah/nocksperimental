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
  const pagePath = "src/app/trust/freshness/page.tsx";
  assertFile(pagePath);
  const page = readText(pagePath);

  assertIncludes(page, "createTrustFreshnessRollup", "freshness page uses the rollup lib");
  assertIncludes(page, "Trust Evidence Freshness", "freshness page title");
  assertIncludes(page, "Freshness by evidence type", "freshness page lists evidence types");
  assertIncludes(page, "/api/trust/freshness", "freshness page links to the JSON");
  assertIncludes(page, "/nockchain/drift-status", "freshness page links to drift status");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-freshness-page"],
    "node scripts/test-trust-freshness-page.mjs",
    "package freshness page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:trust-freshness-page",
    "full test includes freshness page test"
  );
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
