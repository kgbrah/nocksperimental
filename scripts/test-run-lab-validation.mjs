#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

main();

function main() {
  parityWithCatalog();
  invariantRequiredFieldRegressions();
  enumRegressions();
  packDomainRegressions();
  packageWiring();
}

// Item 3: the runner's per-kind required-fields table must match the canonical
// src/lib/lab-report.ts invariantCatalog requiredFields (a 4th drift copy guard).
function parityWithCatalog() {
  const catalog = loadInvariantCatalog();
  const runnerTable = extractRunnerRequiredFields();

  const catalogKinds = catalog.map((item) => item.kind).sort();
  const runnerKinds = Object.keys(runnerTable).sort();
  assertEqual(
    JSON.stringify(runnerKinds),
    JSON.stringify(catalogKinds),
    "runner required-fields table covers the same kinds as invariantCatalog"
  );

  for (const item of catalog) {
    const runnerFields = [...(runnerTable[item.kind] ?? [])].sort();
    const catalogFields = [...item.requiredFields].sort();
    assertEqual(
      JSON.stringify(runnerFields),
      JSON.stringify(catalogFields),
      `runner required fields for ${item.kind} match catalog`
    );
  }
}

function invariantRequiredFieldRegressions() {
  // numeric-min with min deleted -> located error, no false fail.
  withFixture(
    (fixture) => {
      for (const invariant of fixture.invariants) {
        if (invariant.kind === "numeric-min") delete invariant.min;
      }
    },
    (result) => {
      assertEqual(result.status, 1, "numeric-min missing min exits 1");
      assertIncludes(
        result.stderr,
        'requires numeric field "min"',
        "numeric-min missing min reports located error"
      );
    }
  );

  // numeric-min with string min -> rejected (always-false otherwise).
  withFixture(
    (fixture) => {
      for (const invariant of fixture.invariants) {
        if (invariant.kind === "numeric-min") invariant.min = "0";
      }
    },
    (result) => {
      assertEqual(result.status, 1, "numeric-min string min exits 1");
      assertIncludes(
        result.stderr,
        'requires numeric field "min"',
        "numeric-min string min reports located error"
      );
    }
  );

  // numeric-range missing max -> located error (new kind).
  withFixture(
    (fixture) => {
      fixture.invariants.push({
        id: "range-bad",
        title: "Range bad",
        severity: "low",
        kind: "numeric-range",
        path: "counter",
        min: 0
      });
    },
    (result) => {
      assertEqual(result.status, 1, "numeric-range missing max exits 1");
      assertIncludes(
        result.stderr,
        'requires numeric field "max"',
        "numeric-range missing max reports located error"
      );
    }
  );

  // temporal-ordering missing after -> located error (present-type field).
  withFixture(
    (fixture) => {
      fixture.invariants.push({
        id: "order-bad",
        title: "Order bad",
        severity: "low",
        kind: "temporal-ordering",
        path: "events",
        field: "type",
        before: "a"
      });
    },
    (result) => {
      assertEqual(result.status, 1, "temporal-ordering missing after exits 1");
      assertIncludes(
        result.stderr,
        'requires field "after"',
        "temporal-ordering missing after reports located error"
      );
    }
  );

  // custom-function referencing an unregistered name -> rejected at load time.
  withFixture(
    (fixture) => {
      fixture.invariants.push({
        id: "custom-bad",
        title: "Custom bad",
        severity: "low",
        kind: "custom-function",
        fn: "does-not-exist",
        path: "ledger.balances"
      });
    },
    (result) => {
      assertEqual(result.status, 1, "custom-function unknown fn exits 1");
      assertIncludes(
        result.stderr,
        'references unknown fn "does-not-exist"',
        "custom-function unknown fn reports located error"
      );
    }
  );
}

function enumRegressions() {
  // Item 9: typo'd step.type must fail instead of silently passing.
  withFixture(
    (fixture) => {
      fixture.steps[1].type = "pokee";
    },
    (result) => {
      assertEqual(result.status, 1, "bad step.type exits 1");
      assertIncludes(
        result.stderr,
        "is not one of fakenet|poke|peek|invariant|bridge",
        "bad step.type reports located enum error"
      );
    }
  );

  // Item 9: typo'd invariant.kind must fail with a located enum error.
  withFixture(
    (fixture) => {
      fixture.invariants[1].kind = "timelin-state";
    },
    (result) => {
      assertEqual(result.status, 1, "bad invariant.kind exits 1");
      assertIncludes(result.stderr, "is not one of", "bad invariant.kind reports located enum error");
    }
  );
}

// Item 10: pack domain / severity / kind enums are validated at load time.
function packDomainRegressions() {
  withPack(
    (pack) => {
      pack.domain = "bridgez";
    },
    (result, packPath) => {
      assertEqual(result.status, 1, "bad pack domain exits 1");
      assertIncludes(
        result.stderr,
        `${packPath}: domain "bridgez" is not a known domain`,
        "bad pack domain reports located error"
      );
    }
  );

  withPack(
    (pack) => {
      pack.invariants[0].severity = "blocker";
    },
    (result) => {
      assertEqual(result.status, 1, "bad pack severity exits 1");
      assertIncludes(
        result.stderr,
        "is not one of critical|high|medium|low",
        "bad pack severity reports located error"
      );
    }
  );
}

function packageWiring() {
  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:run-lab-validation"],
    "node scripts/test-run-lab-validation.mjs",
    "package run-lab validation test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:run-lab-validation",
    "full test includes run-lab validation test"
  );
}

// --- helpers ---

function withFixture(mutate, assertResult) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-run-lab-validation-"));
  try {
    const fixture = JSON.parse(readText("fixtures/hello-counter.lab.json"));
    delete fixture.invariantPacks;
    mutate(fixture);
    const fixturePath = path.join(tempDir, "case.lab.json");
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
    assertResult(runLab([fixturePath]), fixturePath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function withPack(mutate, assertResult) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-run-lab-pack-"));
  try {
    const pack = JSON.parse(readText("packs/bridge.invariants.json"));
    mutate(pack);
    const packPath = path.join(tempDir, "case.invariants.json");
    writeFileSync(packPath, JSON.stringify(pack, null, 2));

    const fixture = JSON.parse(readText("fixtures/bridge-pack.lab.json"));
    fixture.invariantPacks = [packPath];
    const fixturePath = path.join(tempDir, "case.lab.json");
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

    assertResult(runLab([fixturePath]), packPath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function runLab(extraArgs) {
  const result = spawnSync(process.execPath, ["scripts/run-lab.mjs", ...extraArgs], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function loadInvariantCatalog() {
  const source = readText("src/lib/lab-report.ts");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const compiled = { exports: {} };
  const run = new Function("exports", "require", "module", output);
  run(compiled.exports, require, compiled);
  return compiled.exports.invariantCatalog;
}

// run-lab.mjs has no exports and runs main() at module load, so extract the
// INVARIANT_REQUIRED_FIELDS table from its source text.
function extractRunnerRequiredFields() {
  const source = readText("scripts/run-lab.mjs");
  const match = source.match(/const INVARIANT_REQUIRED_FIELDS = (\{[\s\S]*?\n\});/);
  if (!match) {
    throw new Error("Could not locate INVARIANT_REQUIRED_FIELDS in scripts/run-lab.mjs");
  }
  const table = new Function(`return (${match[1]});`)();
  const result = {};
  for (const [kind, requirements] of Object.entries(table)) {
    result[kind] = requirements.map((requirement) => requirement.field);
  }
  return result;
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
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
