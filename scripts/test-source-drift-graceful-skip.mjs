#!/usr/bin/env node

// Source-drift checks must DEGRADE GRACEFULLY when upstream is unreachable (offline,
// rate-limited, GitHub down) so contributors can author and run lab fixtures without
// network access. The shared engine (scripts/lib/source-drift-check.mjs) catches a
// failed live fetch and emits status:"skipped" with exit 0 — never a false drift/fail.
// We force the failure deterministically by pointing the GitHub API base at a
// non-resolvable host via NOCKS_DRIFT_GITHUB_API.

import { spawnSync } from "node:child_process";
import process from "node:process";

const CHECK = "scripts/check-nockchain-mining-source-drift.mjs";

const result = spawnSync(process.execPath, [CHECK, "--json"], {
  encoding: "utf8",
  cwd: process.cwd(),
  env: { ...process.env, NOCKS_DRIFT_GITHUB_API: "http://offline.invalid" }
});

assertEqual(result.status, 0, "unreachable upstream exits 0 (skip, not fail)");

let body;
try {
  body = JSON.parse(result.stdout);
} catch {
  throw new Error(`expected JSON skip report, got: ${result.stdout}${result.stderr}`);
}

assertEqual(body.status, "skipped", "report status is skipped when upstream is unreachable");
assertIncludes(body.reason, "upstream unavailable", "skip report surfaces a clear reason");

console.log("test-source-drift-graceful-skip: OK");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}
