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
  const pagePath = "src/app/fakenet/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const homePage = readText("src/app/page.tsx");
  const copyCommandCard = readText("src/components/copy-command-card.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "createLocalFakenetReadiness", "fakenet page uses readiness data");
  assertIncludes(page, "Local Fakenet", "fakenet page title");
  assertIncludes(page, "readiness.status", "fakenet page renders readiness status");
  assertIncludes(page, "readiness.checks.health", "fakenet page renders health check");
  assertIncludes(page, "readiness.checks.balance", "fakenet page renders balance check");
  assertIncludes(page, "readiness.checks.chain", "fakenet page renders chain check");
  assertIncludes(page, "readiness.wallet.address", "fakenet page renders wallet address");
  assertIncludes(page, "readiness.failures.map", "fakenet page renders failure details");
  assertIncludes(page, 'href="/api/fakenet"', "fakenet page links to JSON API");
  assertIncludes(page, "readiness.reports.map", "fakenet page renders source reports");
  assertIncludes(homePage, 'href="/fakenet"', "home page fakenet link");
  assertIncludes(homePage, "TERMINAL_COMMANDS", "home page defines terminal command cards");
  assertIncludes(
    homePage,
    "git clone https://github.com/kgbrah/nocksperimental.git",
    "home page exposes install command"
  );
  assertIncludes(homePage, "npm run dev", "home page exposes run command");
  assertIncludes(homePage, "npm run lab:sample", "home page exposes sample lab command");
  assertIncludes(homePage, "npm run lab:ci", "home page exposes CI lab command");
  assertIncludes(homePage, "npm run verify:portable", "home page exposes portable verifier command");
  assertIncludes(homePage, "npx nocklab run --config nocklab.config.json --ci --strict", "home page exposes custom config command");
  assertIncludes(copyCommandCard, "useCopy", "copy command card uses clipboard hook");
  assertIncludes(copyCommandCard, "Copy", "copy command card renders copy state");
  assertIncludes(
    packageJson.scripts.test,
    "test:local-fakenet-readiness-page",
    "full test suite includes fakenet readiness page test"
  );
  assertIncludes(smokeScript, "/fakenet", "Cloudflare smoke checks fakenet page");
  assertIncludes(deploymentDocs, "/fakenet", "deployment docs mention fakenet page");
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
