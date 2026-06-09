#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

main();

function main() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-trust-update-"));
  const logPath = path.join(tempDir, "trust-update-log.json");

  try {
    writeFileSync(logPath, readFileSync("src/data/trust-update-log.json", "utf8"));

    const appendArgs = [
      "scripts/append-trust-update.mjs",
      "--log",
      logPath,
      "--id",
      "update-score-history-v1",
      "--action",
      "score-history",
      "--target",
      "score-history",
      "--target-path",
      "src/data/trust-score-history.json",
      "--recorded-at",
      "2026-05-30T02:20:00.000Z",
      "--root-hash",
      "root-score-history-v1",
      "--summary",
      "Recorded a follow-up score history batch through the append-only write path."
    ];

    const dryRun = spawnSync(process.execPath, [...appendArgs, "--dry-run"], { encoding: "utf8", env: { ...process.env, NOCKS_ALLOW_DEV_SIGNING: "1" } });
    assertEqual(dryRun.status, 0, `dry-run exit status: ${dryRun.stderr}`);
    const dryRunLog = JSON.parse(dryRun.stdout);
    const sourceAfterDryRun = JSON.parse(readFileSync(logPath, "utf8"));

    assertEqual(dryRunLog.chain.entryCount, 6, "dry-run entry count");
    assertEqual(dryRunLog.chain.latestRoot, "root-score-history-v1", "dry-run latest root");
    assertEqual(sourceAfterDryRun.chain.entryCount, 5, "dry-run does not write source file");

    const writeRun = spawnSync(process.execPath, appendArgs, { encoding: "utf8", env: { ...process.env, NOCKS_ALLOW_DEV_SIGNING: "1" } });
    assertEqual(writeRun.status, 0, `write exit status: ${writeRun.stderr}`);
    const writeSummary = JSON.parse(writeRun.stdout);
    const persistedLog = JSON.parse(readFileSync(logPath, "utf8"));
    const persistedEntry = persistedLog.entries.at(-1);

    assertEqual(writeSummary.wrote, logPath, "write summary path");
    assertEqual(writeSummary.entryCount, 6, "write summary entry count");
    assertEqual(writeSummary.latestRoot, "root-score-history-v1", "write summary latest root");
    assertEqual(persistedLog.chain.entryCount, 6, "persisted entry count");
    assertEqual(persistedLog.chain.latestRoot, "root-score-history-v1", "persisted latest root");
    assertEqual(persistedEntry.sequence, 6, "persisted entry sequence");
    assertEqual(persistedEntry.previousRoot, "root-game-badge-issuance-v0", "persisted previous root");
    assertEqual(persistedEntry.signature.verificationStatus, "valid", "persisted signature status");
    assertEqual(persistedEntry.entryHash.startsWith("sha256:"), true, "persisted entry hash prefix");
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
