#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const CATALOG_KINDS = new Set([
  "numeric-min",
  "state-equals",
  "poke-actors-declared",
  "supply-conservation",
  "timeline-state",
  "authorized-actor"
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  // Schema widened with the new domains + optional anchoring fields.
  const schema = JSON.parse(readText("schemas/nockapp-invariant-pack.schema.json"));
  const domains = schema.properties.domain.enum;
  assertIncludes(domains, "bridge-settlement", "schema domain bridge-settlement");
  assertIncludes(domains, "pma-safety", "schema domain pma-safety");
  assertEqual(Boolean(schema.properties.upstreamBasis), true, "schema has upstreamBasis");
  assertEqual(Boolean(schema.properties.sourceAnchors), true, "schema has sourceAnchors");

  // New pack + fixture files exist.
  for (const file of [
    "packs/bridge.invariants.json",
    "packs/pma-safety.invariants.json",
    "fixtures/bridge-pack.lab.json",
    "fixtures/pma-safety.lab.json"
  ]) {
    assertFile(file);
  }

  const { invariantPacks, invariantPackForId } = loadTypeScriptModule("src/lib/invariant-packs.ts");
  assertEqual(invariantPacks.length, 5, "invariant pack count");

  for (const pack of invariantPacks) {
    assertIncludes(domains, pack.domain, `pack ${pack.id} domain in schema`);
    assertEqual(pack.invariantCount >= 3, true, `pack ${pack.id} has at least 3 invariants`);
    assertEqual(Boolean(pack.upstreamBasis?.commit), true, `pack ${pack.id} pins upstream commit`);
  }

  const bridge = invariantPackForId("bridge-settlement-core-v0");
  assertEqual(bridge.domain, "bridge-settlement", "bridge pack domain");
  assertEqual(bridge.sourceAnchors.length >= 1, true, "bridge pack has source anchors");
  const pma = invariantPackForId("pma-safety-core-v0");
  assertEqual(pma.domain, "pma-safety", "pma pack domain");

  // Every invariant kind across new packs is in the catalog (no new evaluator kinds).
  for (const file of ["packs/bridge.invariants.json", "packs/pma-safety.invariants.json"]) {
    const pack = JSON.parse(readText(file));
    for (const invariant of pack.invariants) {
      assertIncludes([...CATALOG_KINDS], invariant.kind, `${file} kind ${invariant.kind} in catalog`);
    }
  }

  // The runner rejects packs with an out-of-enum domain at load time (item 10).
  assertRunnerRejectsBadPackDomain();

  // Fixtures reference the packs.
  const bridgeFixture = JSON.parse(readText("fixtures/bridge-pack.lab.json"));
  assertIncludes(bridgeFixture.invariantPacks, "../packs/bridge.invariants.json", "bridge fixture references pack");
  const pmaFixture = JSON.parse(readText("fixtures/pma-safety.lab.json"));
  assertIncludes(pmaFixture.invariantPacks, "../packs/pma-safety.invariants.json", "pma fixture references pack");

  // /api/invariants surfaces packs with basis.
  const { GET } = loadTypeScriptModule("src/app/api/invariants/route.ts");
  const response = await GET();
  const body = await response.json();
  assertEqual(Array.isArray(body.packs), true, "invariants API exposes packs");
  assertEqual(body.packs.length, 5, "invariants API pack count");
  const apiBridge = body.packs.find((pack) => pack.id === "bridge-settlement-core-v0");
  assertEqual(apiBridge.upstreamBasis.commit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "API pack basis commit");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:invariant-packs"],
    "node scripts/test-invariant-packs.mjs",
    "package invariant packs test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:invariant-packs", "full test includes invariant packs test");
  assertEqual(
    packageJson.scripts["lab:bridge:pack"],
    "node scripts/run-lab.mjs fixtures/bridge-pack.lab.json --out .nocklab/bridge-pack.report.json --markdown .nocklab/bridge-pack.report.md --strict",
    "lab:bridge:pack script"
  );
  assertEqual(
    packageJson.scripts["lab:pma"],
    "node scripts/run-lab.mjs fixtures/pma-safety.lab.json --out .nocklab/pma-safety.report.json --markdown .nocklab/pma-safety.report.md --strict",
    "lab:pma script"
  );
}

function assertRunnerRejectsBadPackDomain() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-pack-domain-"));
  try {
    const pack = JSON.parse(readText("packs/bridge.invariants.json"));
    pack.domain = "bridgez";
    const packPath = path.join(tempDir, "case.invariants.json");
    writeFileSync(packPath, JSON.stringify(pack, null, 2));

    const fixture = JSON.parse(readText("fixtures/bridge-pack.lab.json"));
    fixture.invariantPacks = [packPath];
    const fixturePath = path.join(tempDir, "case.lab.json");
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

    const result = spawnSync(process.execPath, ["scripts/run-lab.mjs", fixturePath], {
      encoding: "utf8",
      cwd: process.cwd()
    });
    assertEqual(result.status, 1, "runner exits 1 on bad pack domain");
    assertIncludes(
      result.stderr ?? "",
      `${packPath}: domain "bridgez" is not a known domain`,
      "runner reports located bad-domain error"
    );
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);
  if (moduleCache.has(modulePath)) return moduleCache.get(modulePath).exports;
  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;
  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);
  const moduleDir = path.dirname(modulePath);
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(moduleDir), compiled, modulePath, moduleDir);
  return compiled.exports;
}

function createModuleRequire(moduleDir) {
  return (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (jsonBody, init = {}) => ({
            headers: init.headers ?? {},
            status: init.status ?? 200,
            json: async () => jsonBody
          })
        }
      };
    }
    if (specifier.startsWith("@/")) {
      const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;
      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") return require(aliasPath);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      if (existsSync(jsonPath)) return require(jsonPath);
      throw new Error(`Unsupported module alias: ${specifier}`);
    }
    if (specifier.startsWith(".")) {
      const resolved = path.resolve(moduleDir, specifier);
      const tsPath = `${resolved}.ts`;
      if (existsSync(resolved) && resolved.endsWith(".json")) return require(resolved);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      return require(resolved);
    }
    return require(specifier);
  };
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

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}
