#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { GET } = loadTypeScriptModule("src/app/api/invariants/packs/verify/route.ts");
  const { invariantPackForId } = loadTypeScriptModule("src/lib/invariant-packs.ts");
  const { invariantPackHash } = loadTypeScriptModule("src/lib/invariant-pack-verifier.ts");

  const pack = invariantPackForId("bridge-settlement-core-v0");
  const expectedHash = invariantPackHash(pack);

  // Valid pack id verifies.
  const ok = await GET(request({ packId: "bridge-settlement-core-v0" }));
  const okBody = await ok.json();
  assertEqual(ok.status, 200, "verify status code");
  assertEqual(okBody.verified, true, "valid pack verifies");
  assertEqual(okBody.checks.packFound, true, "pack found");
  assertEqual(okBody.checks.upstreamBasisPinned, true, "upstream basis pinned");
  assertEqual(okBody.pack.upstreamBasis.commit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "pack basis commit");
  assertEqual(okBody.pack.packHash, expectedHash, "pack hash matches verifier hash");

  // Matching packHash passes the hash check.
  const matched = await GET(request({ packId: "bridge-settlement-core-v0", packHash: expectedHash }));
  const matchedBody = await matched.json();
  assertEqual(matchedBody.checks.packHashMatched, true, "matching pack hash");
  assertEqual(matchedBody.verified, true, "matching pack hash verifies");

  // Wrong packHash fails the hash check.
  const wrong = await GET(request({ packId: "bridge-settlement-core-v0", packHash: "sha256:wrong" }));
  const wrongBody = await wrong.json();
  assertEqual(wrongBody.checks.packHashMatched, false, "wrong pack hash mismatch");
  assertEqual(wrongBody.verified, false, "wrong pack hash does not verify");

  // Missing packId -> 400.
  const missing = await GET(request({}));
  const missingBody = await missing.json();
  assertEqual(missing.status, 400, "missing packId status");
  assertEqual(missingBody.error, "Missing packId query parameter", "missing packId error");

  // Unknown packId -> 404 + not verified.
  const unknown = await GET(request({ packId: "no-such-pack" }));
  const unknownBody = await unknown.json();
  assertEqual(unknown.status, 404, "unknown pack status");
  assertEqual(unknownBody.verified, false, "unknown pack not verified");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:invariant-pack-verify-api"],
    "node scripts/test-invariant-pack-verify-api.mjs",
    "package invariant pack verify api test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:invariant-pack-verify-api",
    "full test includes invariant pack verify api test"
  );
}

function request(params) {
  const url = new URL("https://nocksperimental.com/api/invariants/packs/verify");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
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
