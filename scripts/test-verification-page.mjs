#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

main();

function main() {
  const pagePath = "src/app/verify/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const homePage = readText("src/app/page.tsx");
  const trustPage = readText("src/app/trust/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "createVerificationIndex", "verification page uses index data");
  assertIncludes(page, "Verification", "verification page title");
  assertIncludes(page, "/api/verify", "verification page API link");
  assertIncludes(page, "verification.verifiers.map", "verification page renders verifier cards");
  assertIncludes(page, "href={verifier.path}", "verification page verifier links");
  assertIncludes(page, "{verifier.path}", "verification page verifier paths");
  assertIncludes(page, "toSameOriginHref", "verification page keeps sample links same-origin");
  assertIncludes(page, "samples.badgeIssuance", "verification page badge sample");
  assertIncludes(page, "samples.generatedReport", "verification page report sample");
  assertIncludes(page, "samples.registryCheckpoint", "verification page checkpoint sample");
  assertIncludes(page, 'label="Registry checkpoint"', "verification page checkpoint sample label");
  assertIncludes(page, 'icon="checkpoint"', "verification page checkpoint sample icon");
  assertIncludes(homePage, 'href="/verify"', "home page verification link");
  assertIncludes(trustPage, 'href: "/verify"', "trust page verification link");
  assertIncludes(smokeScript, "/verify", "Cloudflare smoke checks verification page");
  assertIncludes(deploymentDocs, "/verify", "deployment docs verification page");
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
