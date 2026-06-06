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
  const pagePath = "src/app/nockchain/zorp/monitor/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const zorpPage = readText("src/app/nockchain/zorp/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createZorpMonitorRunbook", "monitor page uses runbook");
  assertIncludes(page, "Zorp Monitor Runbook", "monitor page title");
  assertIncludes(page, "Monitor Run Contract", "monitor page shows run contract");
  assertIncludes(page, "Finding Schema", "monitor page shows finding schema");
  assertIncludes(page, "Classification Flow", "monitor page shows classification flow");
  assertIncludes(page, "Route Matrix", "monitor page shows route matrix");
  assertIncludes(page, "Freshness Probes", "monitor page shows freshness probes");
  assertIncludes(page, "monitor-zorp-and-nockchain-sources", "monitor page shows automation id");
  assertIncludes(page, "watch-vesl-drive-folder", "monitor page shows superseded VESL-named automation");
  assertIncludes(page, "zorp-github-org", "monitor page shows Zorp source");
  assertIncludes(page, "zorp-nockchain-legacy-redirect", "monitor page shows legacy redirect source");
  assertIncludes(page, "canonical-nockchain-repository", "monitor page shows canonical source");
  assertIncludes(page, "zorp-state-jam-drive", "monitor page shows Drive source");
  assertIncludes(page, "canonical-nockchain", "monitor page shows canonical class");
  assertIncludes(page, "zorp-authoring", "monitor page shows authoring class");
  assertIncludes(page, "zorp-lineage", "monitor page shows lineage class");
  assertIncludes(page, "state-artifact-provenance", "monitor page shows state artifact class");
  assertIncludes(page, "canonical-nockchain-runtime", "monitor page shows canonical route matrix");
  assertIncludes(page, "zorp-authoring-fixtures", "monitor page shows authoring route matrix");
  assertIncludes(page, "state-jam-artifacts", "monitor page shows state jam route matrix");
  assertIncludes(page, "nockchainMiningSourceTrace", "monitor page routes mining trace");
  assertIncludes(page, "nockchainPmaSourceTrace", "monitor page routes PMA trace");
  assertIncludes(page, "upstreamSourceUrl", "monitor page shows finding source URL field");
  assertIncludes(page, "nocksperimentalSurface", "monitor page shows finding surface field");
  assertIncludes(page, "rawArtifactPolicy", "monitor page shows raw artifact policy");
  assertIncludes(page, "rawStateJam", "monitor page shows forbidden state jam");
  assertIncludes(page, "rawPmaSlab", "monitor page shows forbidden PMA slab");
  assertIncludes(page, "node scripts/run-zorp-monitor-snapshot.mjs --json", "monitor page shows snapshot command");
  assertIncludes(page, 'href="/api/nockchain/zorp/monitor"', "monitor page links API");
  assertIncludes(page, 'href="/nockchain/zorp"', "monitor page links Zorp page");
  assertIncludes(page, 'href="/nockchain/watch"', "monitor page links watch page");
  assertIncludes(page, 'href="/nockchain"', "monitor page links Nockchain page");

  assertIncludes(zorpPage, 'href="/nockchain/zorp/monitor"', "Zorp page links monitor page");
  assertIncludes(nockchainPage, 'href="/nockchain/zorp/monitor"', "Nockchain page links monitor page");
  assertIncludes(smokeScript, "/nockchain/zorp/monitor", "Cloudflare smoke includes monitor page");
  assertIncludes(readme, "Zorp Monitor Runbook", "README documents monitor page");
  assertIncludes(readme, "/nockchain/zorp/monitor", "README documents monitor page route");
  assertEqual(
    packageJson.scripts["test:zorp-monitor-runbook-page"],
    "node scripts/test-zorp-monitor-runbook-page.mjs",
    "package Zorp monitor page test"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:zorp-monitor-runbook-page", "full test includes Zorp monitor page");
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
