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
  const pagePath = "src/app/nockchain/nockup/source/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainNockupSourceTrace", "Nockup source page uses trace");
  assertIncludes(page, "Nockchain Nockup Source Trace", "Nockup source page title");
  assertIncludes(page, "Source Anchors", "Nockup source page shows source anchors");
  assertIncludes(page, "Nockup Capabilities", "Nockup source page shows capabilities");
  assertIncludes(page, "Receipt Contract", "Nockup source page shows receipt contract");
  assertIncludes(page, "Upstream Watch", "Nockup source page shows watch");
  assertIncludes(page, "Local Verification", "Nockup source page shows verification");
  assertIncludes(page, "nockup-readme-contract", "Nockup source page shows README anchor");
  assertIncludes(page, "nockup-manifest-schema", "Nockup source page shows manifest anchor");
  assertIncludes(page, "nockup-template-init", "Nockup source page shows template init anchor");
  assertIncludes(page, "nockup-template-cache", "Nockup source page shows template cache anchor");
  assertIncludes(page, "nockup-dependency-resolver", "Nockup source page shows resolver anchor");
  assertIncludes(page, "nockup-registry-install-path", "Nockup source page shows registry install path anchor");
  assertIncludes(page, "nockup-package-install-links", "Nockup source page shows package links anchor");
  assertIncludes(page, "nockup-cache-index", "Nockup source page shows cache anchor");
  assertIncludes(page, "NockAppManifest", "Nockup source page names NockAppManifest");
  assertIncludes(page, "download_templates", "Nockup source page names download_templates");
  assertIncludes(page, "Resolver::resolve", "Nockup source page names Resolver::resolve");
  assertIncludes(page, "link_registry_package", "Nockup source page names link_registry_package");
  assertIncludes(page, "PackageCache::cache_package", "Nockup source page names cache_package");
  assertIncludes(page, "manifest-template-selection", "Nockup source page shows manifest capability");
  assertIncludes(page, "template-cache-and-toolchain-channel", "Nockup source page shows template capability");
  assertIncludes(page, "registry-install-path-symlinks", "Nockup source page shows install path capability");
  assertIncludes(page, "experimental-untrusted-code-warning", "Nockup source page shows warning capability");
  assertIncludes(page, "templateCommit", "Nockup source page shows template commit field");
  assertIncludes(page, "manifestHash", "Nockup source page shows manifest hash field");
  assertIncludes(page, "resolvedPackageCommits", "Nockup source page shows resolved commits field");
  assertIncludes(page, "lockfileHash", "Nockup source page shows lockfile hash field");
  assertIncludes(page, "rawTemplateArchive", "Nockup source page shows forbidden template archive");
  assertIncludes(page, "rawCompiledJam", "Nockup source page shows forbidden jam");
  assertIncludes(page, "gpgPrivateKey", "Nockup source page shows forbidden GPG key");
  assertIncludes(page, "cargo check -p nockup", "Nockup source page shows cargo check command");
  assertIncludes(page, "PR #125", "Nockup source page shows PR 125");
  assertIncludes(page, "PR #120", "Nockup source page shows PR 120");
  assertIncludes(page, 'href="/api/nockchain/nockup/source"', "Nockup source page links API");
  assertIncludes(page, 'href="/api/nockchain/nockup/submit"', "Nockup source page links submit API");
  assertIncludes(page, 'href="/nockchain/testkit-e2e"', "Nockup source page links testkit");
  assertIncludes(page, 'href="/nockchain"', "Nockup source page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/nockup/source"', "Nockchain page links Nockup source page");
  assertIncludes(smokeScript, "/nockchain/nockup/source", "Cloudflare smoke includes Nockup source page");
  assertIncludes(readme, "Nockchain Nockup Source Trace", "README documents Nockup source page");
  assertIncludes(readme, "/nockchain/nockup/source", "README documents Nockup source page route");
  assertEqual(
    packageJson.scripts["test:nockchain-nockup-source-page"],
    "node scripts/test-nockchain-nockup-source-page.mjs",
    "package Nockup source page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockup-source-page",
    "full test includes Nockup source page test"
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
