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
  "authorized-actor",
  "numeric-range",
  "array-length-min",
  "array-length-max",
  "temporal-ordering",
  "custom-function"
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

  assertIncludes(domains, "mining-pow", "schema domain mining-pow");

  // New pack + fixture files exist.
  for (const file of [
    "packs/bridge.invariants.json",
    "packs/pma-safety.invariants.json",
    "packs/mining-pow.invariants.json",
    "fixtures/bridge-pack.lab.json",
    "fixtures/pma-safety.lab.json",
    "fixtures/mining-pow.lab.json"
  ]) {
    assertFile(file);
  }

  const { invariantPacks, invariantPackForId } = loadTypeScriptModule("src/lib/invariant-packs.ts");
  assertEqual(invariantPacks.length, 6, "invariant pack count");

  for (const pack of invariantPacks) {
    assertIncludes(domains, pack.domain, `pack ${pack.id} domain in schema`);
    assertEqual(pack.invariantCount >= 3, true, `pack ${pack.id} has at least 3 invariants`);
    assertEqual(Boolean(pack.upstreamBasis?.commit), true, `pack ${pack.id} pins upstream commit`);
  }

  // Domain CONTRACT guard: the schema enum, the runner's PACK_DOMAINS allowlist,
  // and the actual pack.domain values must describe the SAME set of domains. These
  // three live in different files and are hand-synced; without this, a future 7th
  // domain added to two of them but not the third would only surface as a first-run
  // lab failure (run-lab rejects an out-of-enum pack.domain), bypassing this gate.
  // Compared as sets (order-agnostic — introduction-date ordering is deliberate, so
  // we do NOT require alphabetical/identical order). run-lab.mjs runs its CLI on
  // import, so PACK_DOMAINS is parsed from source text rather than imported.
  const runnerPackDomains = readPackDomainsFromRunner();
  const packDomainValues = invariantPacks.map((pack) => pack.domain);
  assertSameSet(domains, runnerPackDomains, "schema domain enum == run-lab PACK_DOMAINS");
  assertSameSet(domains, packDomainValues, "schema domain enum == actual pack.domain values");

  const bridge = invariantPackForId("bridge-settlement-core-v0");
  assertEqual(bridge.domain, "bridge-settlement", "bridge pack domain");
  assertEqual(bridge.sourceAnchors.length >= 1, true, "bridge pack has source anchors");
  const pma = invariantPackForId("pma-safety-core-v0");
  assertEqual(pma.domain, "pma-safety", "pma pack domain");
  const mining = invariantPackForId("mining-pow-core-v0");
  assertEqual(mining.domain, "mining-pow", "mining pack domain");
  assertEqual(mining.sourceAnchors.length >= 1, true, "mining pack has source anchors");

  // Every invariant kind across new packs is in the catalog (no new evaluator kinds).
  for (const file of [
    "packs/bridge.invariants.json",
    "packs/pma-safety.invariants.json",
    "packs/mining-pow.invariants.json"
  ]) {
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
  const miningFixture = JSON.parse(readText("fixtures/mining-pow.lab.json"));
  assertIncludes(miningFixture.invariantPacks, "../packs/mining-pow.invariants.json", "mining fixture references pack");

  // /api/invariants surfaces packs with basis.
  const { GET } = loadTypeScriptModule("src/app/api/invariants/route.ts");
  const response = await GET();
  const body = await response.json();
  assertEqual(Array.isArray(body.packs), true, "invariants API exposes packs");
  assertEqual(body.packs.length, 6, "invariants API pack count");
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
  assertEqual(
    packageJson.scripts["lab:mining"],
    "node scripts/run-lab.mjs fixtures/mining-pow.lab.json --out .nocklab/mining-pow.report.json --markdown .nocklab/mining-pow.report.md --strict",
    "lab:mining script"
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

// Parse the PACK_DOMAINS literal from run-lab.mjs WITHOUT importing it (the runner
// reads process.argv and calls main() at module scope, so importing would run the CLI).
function readPackDomainsFromRunner() {
  const source = readText("scripts/run-lab.mjs");
  const match = source.match(/const PACK_DOMAINS\s*=\s*(\[[\s\S]*?\])/);
  if (!match) {
    throw new Error("could not locate the PACK_DOMAINS literal in scripts/run-lab.mjs");
  }
  return JSON.parse(match[1]);
}

function assertSameSet(actual, expected, label) {
  const a = [...new Set(actual)].sort();
  const b = [...new Set(expected)].sort();
  const equal = a.length === b.length && a.every((value, index) => value === b[index]);
  if (!equal) {
    throw new Error(`${label}: sets differ — ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
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
