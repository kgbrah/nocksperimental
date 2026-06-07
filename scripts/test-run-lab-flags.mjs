#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

main();

function main() {
  const fixture = "fixtures/hello-counter.lab.json";

  // Baseline: a well-formed invocation still succeeds.
  const ok = runLab([fixture]);
  assertEqual(ok.status, 0, `valid fixture invocation exits 0: ${ok.stderr}`);

  // Item 2: a value-taking flag must not swallow the next flag as its value.
  const eats = runLab([fixture, "--out", "--strict"]);
  assertEqual(eats.status, 1, "--out with no value exits 1");
  assertIncludes(eats.stderr, "nocklab: --out requires a value", "--out reports a clean located error");
  assertEqual(
    existsSync(path.join(process.cwd(), "--strict")),
    false,
    "--out with no value does not write a file named --strict"
  );
  // Defensive cleanup in case a regression wrote the bad file.
  rmSync(path.join(process.cwd(), "--strict"), { force: true });

  // Item 2: run --config with no value must throw rather than fall through to fixture mode.
  const config = runLab(["run", "--config"]);
  assertEqual(config.status, 1, "run --config with no value exits 1");
  assertIncludes(config.stderr, "nocklab: --config requires a value", "--config reports a clean located error");

  // Item 6: an unknown / misspelled flag must fail loudly instead of being ignored.
  const typo = runLab([fixture, "--markdwon", "/tmp/should-not-be-written.md"]);
  assertEqual(typo.status, 1, "unknown flag exits 1");
  assertIncludes(typo.stderr, "nocklab: unknown option: --markdwon", "unknown flag reports located error");
  assertEqual(typo.stdout, "", "unknown flag does not dump a report to stdout");

  // Item 6: every known flag stays allowed (boolean and value flags both pass).
  const known = runLab([fixture, "--strict"]);
  assertEqual(known.status, 0, `known boolean flag --strict still works: ${known.stderr}`);

  // --help short-circuits before flag validation and exits 0.
  const help = runLab(["--help"]);
  assertEqual(help.status, 0, "--help exits 0");
  assertIncludes(help.stdout, "Usage:", "--help prints usage");
}

function runLab(extraArgs) {
  const result = spawnSync(process.execPath, ["scripts/run-lab.mjs", ...extraArgs], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!String(haystack).includes(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}
