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
  const pagePath = "src/app/registry/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const homePage = readText("src/app/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "createRegistryManifest", "registry page uses manifest data");
  assertIncludes(page, "createRegistryCheckpoint", "registry page uses checkpoint data");
  assertIncludes(page, "Registry", "registry page title");
  assertIncludes(page, "manifest.counts.badges", "registry page renders manifest badge count");
  assertIncludes(page, "manifest.latestTrustUpdate.status", "registry page renders trust update status");
  assertIncludes(page, "manifest.endpoints.map", "registry page renders endpoint index");
  assertIncludes(page, "checkpoint.roots.checkpoint", "registry page renders checkpoint root");
  assertIncludes(page, "checkpoint.checks.appendOnlyTrustUpdates", "registry page renders append-only check");
  assertIncludes(page, "checkpoint.fakenetEvidence.status", "registry page renders fakenet evidence status");
  assertIncludes(page, 'href="/api/registry"', "registry page links manifest API");
  assertIncludes(page, 'href="/api/registry/checkpoint"', "registry page links checkpoint API");
  assertIncludes(page, 'href="/openapi.json"', "registry page links OpenAPI spec");
  assertIncludes(page, 'href="/verify"', "registry page links verification page");
  assertIncludes(page, 'href="/trust/feed"', "registry page links trust feed page");
  assertIncludes(page, "toSameOriginHref", "registry page keeps canonical links same-origin");
  assertIncludes(homePage, 'href="/registry"', "home page registry link");
  assertIncludes(
    packageJson.scripts.test,
    "test:registry-page",
    "full test suite includes registry page test"
  );
  assertIncludes(smokeScript, "/registry", "Cloudflare smoke checks registry page");
  assertIncludes(deploymentDocs, "/registry", "deployment docs mention registry page");
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
