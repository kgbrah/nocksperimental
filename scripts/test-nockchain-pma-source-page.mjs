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
  const pagePath = "src/app/nockchain/pma/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const stateJamsPage = readText("src/app/nockchain/state-jams/page.tsx");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(page, "createNockchainPmaSourceTrace", "PMA page uses source trace");
  assertIncludes(page, "Nockchain PMA Source Trace", "PMA page title");
  assertIncludes(page, "Durability Flow", "PMA page shows durability flow");
  assertIncludes(page, "Source Anchors", "PMA page shows source anchors");
  assertIncludes(page, "Snapshot Verification", "PMA page shows snapshot verification");
  assertIncludes(page, "Event Log Contract", "PMA page shows event log contract");
  assertIncludes(page, "Receipt Contract", "PMA page shows receipt contract");
  assertIncludes(page, "Operator Guards", "PMA page shows operator guards");
  assertIncludes(page, "pma-metadata-trailer", "PMA page shows metadata anchor");
  assertIncludes(page, "pma-open-growth-recovery", "PMA page shows growth anchor");
  assertIncludes(page, "snapshot-verify-ready", "PMA page shows verify anchor");
  assertIncludes(page, "snapshot-create-ready", "PMA page shows create snapshot anchor");
  assertIncludes(page, "event-log-replay-boundary", "PMA page shows event replay anchor");
  assertIncludes(page, "kernel-event-log-restore", "PMA page shows kernel restore anchor");
  assertIncludes(page, "Pma::read_file_metadata", "PMA page names metadata function");
  assertIncludes(page, "Pma::open_with_min", "PMA page names PMA open function");
  assertIncludes(page, "verify_snapshot", "PMA page names snapshot verifier");
  assertIncludes(page, "create_ready_snapshot", "PMA page names snapshot creator");
  assertIncludes(page, "EventLog::replay_events_after", "PMA page names replay function");
  assertIncludes(page, "snapshot_source_pma_fdatasync", "PMA page shows fdatasync evidence");
  assertIncludes(page, "rawPmaSlab", "PMA page shows raw PMA forbidden field");
  assertIncludes(page, "rawEventLogSqlite", "PMA page shows raw event log forbidden field");
  assertIncludes(page, "pmaMetadataVersion", "PMA page shows metadata receipt field");
  assertIncludes(page, "snapshotUsedBlake3", "PMA page shows snapshot hash field");
  assertIncludes(page, "eventLogMaxEventNum", "PMA page shows event boundary field");
  assertIncludes(page, 'href="/api/nockchain/pma"', "PMA page links API");
  assertIncludes(page, 'href="/nockchain/state-jams"', "PMA page links state jams");
  assertIncludes(page, 'href="/nockchain/rust/source"', "PMA page links Rust source");
  assertIncludes(page, 'href="/nockchain/nockapp/source"', "PMA page links NockApp source");
  assertIncludes(page, 'href="/nockchain"', "PMA page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/pma"', "Nockchain page links PMA page");
  assertIncludes(stateJamsPage, 'href="/nockchain/pma"', "state-jams page links PMA source page");
  assertIncludes(smokeScript, "/nockchain/pma", "Cloudflare smoke includes PMA page");
  assertIncludes(readme, "Nockchain PMA Source Trace", "README documents PMA page");
  assertIncludes(readme, "/nockchain/pma", "README documents PMA page route");
  assertEqual(
    packageJson.scripts["test:nockchain-pma-source-page"],
    "node scripts/test-nockchain-pma-source-page.mjs",
    "package PMA page test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-pma-source-page",
    "full test includes PMA page test"
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
