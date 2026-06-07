#!/usr/bin/env node

// Item 15: fixture builder + `nocklab new-fixture` scaffold.
//
// run-lab.mjs has no exports and runs main() at module load, so the round-trip
// must invoke the CLI as a subprocess via spawnSync (the pattern in
// test-trust-update-append-cli.mjs). The scaffold defaults to mock-fakenet so the
// generated fixture round-trips to a clean passing report offline (no live gRPC /
// fakenock).

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { createFixture, scaffoldFixture, validateFixture } from "./fixture-builder.mjs";

main();

function main() {
  builderOutputIsValid();
  missingRequiredFieldFails();
  scaffoldDefaultsToMockFakenet();
  newFixtureVerbRoundTrips();
  packageWiring();
}

// (a) Builder output passes validateFixture.
function builderOutputIsValid() {
  const fixture = createFixture({
    app: { name: "Demo", slug: "demo-app", version: "1.0.0", kernel: "demo-kernel" }
  });
  assertEqual(validateFixture(fixture).length, 0, "createFixture output passes validateFixture");
  assertEqual(fixture.app.slug, "demo-app", "createFixture keeps slug");
  assertEqual(fixture.id, "demo-app-v0", "createFixture derives id from slug");
  assertEqual(fixture.environment.mode, "mock-fakenet", "createFixture defaults to mock-fakenet");
  // Honor additionalProperties:false on app/environment.
  assertEqual(
    JSON.stringify(Object.keys(fixture.app).sort()),
    JSON.stringify(["kernel", "name", "slug", "version"]),
    "app emits exactly the allowed keys"
  );
  assertEqual(
    JSON.stringify(Object.keys(fixture.environment).sort()),
    JSON.stringify(["fakenetCommand", "grpcEndpoint", "mode", "notes"]),
    "environment emits exactly the allowed keys"
  );

  const scaffold = scaffoldFixture({ slug: "scaffold-demo", type: "poke" });
  assertEqual(validateFixture(scaffold).length, 0, "scaffoldFixture output passes validateFixture");
}

// (c) A deliberately-missing required field fails validateFixture.
function missingRequiredFieldFails() {
  const fixture = createFixture({ app: { slug: "missing-field-demo" } });
  delete fixture.environment;
  const errors = validateFixture(fixture);
  assertEqual(errors.length > 0, true, "missing environment fails validateFixture");
  assertIncludes(
    errors.join("\n"),
    "missing required field: environment",
    "validateFixture reports the missing field"
  );

  const badStep = createFixture({ app: { slug: "bad-step-demo" } });
  badStep.steps[0].type = "pokee";
  assertIncludes(
    validateFixture(badStep).join("\n"),
    "is not one of fakenet|poke|peek|invariant|bridge",
    "validateFixture reports bad step.type enum"
  );
}

function scaffoldDefaultsToMockFakenet() {
  const peek = scaffoldFixture({ slug: "peek-default" });
  assertEqual(peek.environment.mode, "mock-fakenet", "scaffold default mode is mock-fakenet");
  assertEqual(peek.steps[0].type, "peek", "scaffold default type is peek");

  const poke = scaffoldFixture({ slug: "poke-default", type: "poke" });
  assertEqual(poke.steps[0].type, "poke", "scaffold poke type");

  let threw = false;
  try {
    scaffoldFixture({ slug: "bad-type-demo", type: "bridge" });
  } catch {
    threw = true;
  }
  assertEqual(threw, true, "scaffold rejects unsupported --type");
}

// (b) The generated fixture round-trips through run-lab.mjs as a subprocess,
// producing a passing report.
function newFixtureVerbRoundTrips() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-fixture-builder-"));
  try {
    const outPath = path.join(tempDir, "round-trip.lab.json");
    const scaffolded = runLab([
      "new-fixture",
      "--slug",
      "round-trip-app",
      "--type",
      "poke",
      "--out",
      outPath
    ]);
    assertEqual(scaffolded.status, 0, `new-fixture exit status: ${scaffolded.stderr}`);
    assertIncludes(scaffolded.stdout, outPath, "new-fixture reports the written path");

    const written = JSON.parse(readFileSync(outPath, "utf8"));
    assertEqual(validateFixture(written).length, 0, "scaffolded file on disk passes validateFixture");
    assertEqual(written.environment.mode, "mock-fakenet", "scaffolded file is mock-fakenet");

    // Round-trip: run the generated fixture and confirm a report is emitted with
    // a passing summary (mock-fakenet, so no live deps).
    const run = runLab([outPath]);
    assertEqual(run.status, 0, `round-trip run exit status: ${run.stderr}`);
    const report = JSON.parse(run.stdout);
    assertEqual(report.fixtureId, "round-trip-app-v0", "round-trip report fixtureId");
    assertEqual(report.summary.status, "pass", "round-trip report passes");

    // --slug requirement is enforced.
    const missingSlug = runLab(["new-fixture", "--type", "peek"]);
    assertEqual(missingSlug.status, 1, "new-fixture without --slug exits 1");
    assertIncludes(missingSlug.stderr, "new-fixture requires --slug", "new-fixture --slug error");
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function packageWiring() {
  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:fixture-builder"],
    "node scripts/test-fixture-builder.mjs",
    "package fixture-builder test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:fixture-builder",
    "full test includes fixture-builder test"
  );
}

// --- helpers ---

function runLab(verbArgs) {
  const result = spawnSync(process.execPath, ["scripts/run-lab.mjs", ...verbArgs], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
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
