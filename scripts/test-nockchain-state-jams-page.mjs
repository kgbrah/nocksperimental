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
  const pagePath = "src/app/nockchain/state-jams/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const zorpPage = readText("src/app/nockchain/zorp/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainStateJamRegistry", "state-jams page uses registry");
  assertIncludes(page, "createZorpUpstreamMap", "state-jams page uses Zorp map");
  assertIncludes(page, "Nockchain State Jams", "state-jams page title");
  assertIncludes(page, "Zorp state-jam folder", "state-jams page shows Zorp source");
  assertIncludes(page, "not a VESL folder", "state-jams page preserves Drive correction");
  assertIncludes(page, "metadata-only", "state-jams page shows metadata policy");
  assertIncludes(page, "rawArtifactStorage", "state-jams page shows raw artifact storage policy");
  assertIncludes(page, "forbidden", "state-jams page shows forbidden raw storage");
  assertIncludes(page, "PMA Safety", "state-jams page shows PMA safety section");
  assertIncludes(page, "checkpoint-bootstrap", "state-jams page shows checkpoint bootstrap source");
  assertIncludes(page, "pma-fast-path", "state-jams page shows PMA fast path source");
  assertIncludes(page, "event-log-replay", "state-jams page shows event log replay source");
  assertIncludes(page, "Do Not Store", "state-jams page shows raw artifact denylist");
  assertIncludes(page, "pma/*.pma", "state-jams page shows PMA slab denylist");
  assertIncludes(page, "event-log.sqlite3", "state-jams page shows event log denylist");
  assertIncludes(page, "Required Metadata", "state-jams page shows required metadata");
  assertIncludes(page, "Nockchain build or commit", "state-jams page shows build metadata");
  assertIncludes(page, "checkpoint height or event boundary", "state-jams page shows boundary metadata");
  assertIncludes(page, "Verification Questions", "state-jams page shows verification checklist");
  assertIncludes(page, "Which Nockchain commit/build produced it?", "state-jams page shows commit question");
  assertIncludes(page, "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw", "state-jams page shows Drive folder");
  assertIncludes(page, 'href="/api/nockchain/state-jams"', "state-jams page links API");
  assertIncludes(page, 'href="/nockchain/zorp"', "state-jams page links Zorp intelligence");
  assertIncludes(page, 'href="/nockchain/watch"', "state-jams page links watch board");

  assertIncludes(nockchainPage, 'href="/nockchain/state-jams"', "Nockchain page links state-jams page");
  assertIncludes(zorpPage, 'href="/nockchain/state-jams"', "Zorp page links state-jams page");
  assertIncludes(smokeScript, "/nockchain/state-jams", "Cloudflare smoke includes state-jams page");
  assertIncludes(readme, "/nockchain/state-jams", "README documents state-jams page");
  assertEqual(
    packageJson.scripts["test:nockchain-state-jams-page"],
    "node scripts/test-nockchain-state-jams-page.mjs",
    "package state-jams page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-state-jams-page",
    "full test includes state-jams page test"
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
