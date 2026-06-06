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
  const snapshotPath = "src/data/nockchain-drift-status.json";
  assertFile(snapshotPath);
  const snapshot = JSON.parse(readText(snapshotPath));
  assertEqual(snapshot.version, "v0", "snapshot version");
  assertNonEmpty(snapshot.observedAt, "snapshot observedAt");
  assertNonEmpty(snapshot.generatedAt, "snapshot generatedAt");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["refresh:nockchain-drift-status"],
    "node scripts/refresh-drift-status.mjs",
    "package refresh drift-status script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-drift-status-api"],
    "node scripts/test-nockchain-drift-status-api.mjs",
    "package drift-status api test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-drift-status-api",
    "full test includes drift-status api test"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/drift-status/route.ts");
  const response = await GET();
  const body = await response.json();

  for (const field of [
    "version",
    "status",
    "observedAt",
    "generatedAt",
    "source",
    "aggregateCommand",
    "summary",
    "checks",
    "freshness",
    "links"
  ]) {
    assertHas(body, field, `drift-status body field ${field}`);
  }

  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/drift-status", "canonical url");
  assertEqual(
    body.aggregateCommand,
    "npm run check:nockchain-upstream-drift -- --json",
    "drift-status aggregate command"
  );
  assertEqual(body.summary.totalChecks, body.checks.length, "summary total matches checks length");

  for (const check of body.checks) {
    for (const field of ["id", "label", "domain", "status", "observedAt"]) {
      assertNonEmpty(check[field], `check ${check.id} field ${field}`);
    }
  }

  // The published check id set must equal the aggregate watch board's checks.
  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  const aggregateIds = watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id).sort();
  const statusIds = body.checks.map((check) => check.id).sort();
  assertEqual(
    JSON.stringify(statusIds),
    JSON.stringify(aggregateIds),
    "drift-status check ids match aggregate watch board"
  );
  assertIncludes(statusIds, "pma-source", "drift-status includes PMA source check");
  assertIncludes(statusIds, "mining-source", "drift-status includes mining source check");

  assertEqual(typeof body.freshness.maxAgeHours, "number", "freshness maxAgeHours is a number");
  assertEqual(typeof body.freshness.stale, "boolean", "freshness stale is a boolean");
  if (body.freshness.ageHours !== null && typeof body.freshness.ageHours !== "number") {
    throw new Error("freshness ageHours must be a number or null");
  }

  assertEqual(
    body.links.page,
    "https://nocksperimental.com/nockchain/drift-status",
    "drift-status page link"
  );

  // Reader must not perform any network fetch; assert the lib source is fetch-free.
  const libSource = readText("src/lib/nockchain-drift-status.ts");
  if (/\bfetch\s*\(/.test(libSource)) {
    throw new Error("drift-status reader must not call fetch");
  }
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
  }

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

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire() {
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
      return loadAliasModule(specifier);
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertHas(object, key, label) {
  if (object == null || !(key in object)) {
    throw new Error(`${label}: missing key ${key}`);
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

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}: expected non-empty string, received ${JSON.stringify(value)}`);
  }
}
