#!/usr/bin/env node

// Aggregate verification for the invariant-pack pillar. Reports are gitignored
// (.nocklab), so this generates them via lab:ci and asserts the new packs pass,
// then runs the focused pack + basis tests.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

main();

function main() {
  for (const file of [
    "schemas/nockapp-invariant-pack.schema.json",
    "packs/bridge.invariants.json",
    "packs/pma-safety.invariants.json",
    "packs/mining-pow.invariants.json",
    "fixtures/bridge-pack.lab.json",
    "fixtures/pma-safety.lab.json",
    "fixtures/mining-pow.lab.json",
    "docs/invariants.md"
  ]) {
    assertFile(file);
  }

  // Generate all lab reports (writes .nocklab/<slug>.report.{json,md}).
  run("npm", ["run", "lab:ci"]);

  const bridge = readReport("bridge-pack");
  assertEqual(bridge.summary.status, "pass", "bridge-pack report status");
  assertEqual(bridge.summary.invariantsFailed, 0, "bridge-pack invariants failed");
  assertEqual(
    bridge.invariantPacks.some((pack) => pack.domain === "bridge-settlement"),
    true,
    "bridge-pack report includes bridge-settlement domain"
  );
  assertEqual(
    bridge.invariantPacks.some((pack) => pack.upstreamBasis?.commit),
    true,
    "bridge-pack report carries upstream basis"
  );

  const pma = readReport("pma-safety");
  assertEqual(pma.summary.status, "pass", "pma-safety report status");
  assertEqual(pma.summary.invariantsFailed, 0, "pma-safety invariants failed");
  assertEqual(
    pma.invariantPacks.some((pack) => pack.domain === "pma-safety"),
    true,
    "pma-safety report includes pma-safety domain"
  );

  const mining = readReport("mining-pow");
  assertEqual(mining.summary.status, "pass", "mining-pow report status");
  assertEqual(mining.summary.invariantsFailed, 0, "mining-pow invariants failed");
  assertEqual(
    mining.invariantPacks.some((pack) => pack.domain === "mining-pow"),
    true,
    "mining-pow report includes mining-pow domain"
  );
  assertEqual(
    mining.invariantPacks.some((pack) => pack.upstreamBasis?.commit),
    true,
    "mining-pow report carries upstream basis"
  );

  // Per-step state diffs are rendered in Markdown.
  const bridgeMd = readText(".nocklab/bridge-pack.report.md");
  if (!/ {2}- settlement\.\w+: .+ -> .+/.test(bridgeMd)) {
    throw new Error("bridge-pack report markdown is missing per-step state diffs");
  }

  // Focused tests.
  run("npm", ["run", "test:invariant-packs"]);
  run("npm", ["run", "test:invariant-pack-basis"]);

  console.log("verify:invariant-packs OK");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readReport(slug) {
  return JSON.parse(readText(`.nocklab/${slug}.report.json`));
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
