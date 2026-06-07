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
  assertFileExists("src/lib/trust-freshness.ts");
  assertFileExists("src/app/api/trust/freshness/route.ts");

  await assertRoute();
  await assertDiscovery();
  assertLeafModule();
  assertPackageWiring();
}

async function assertRoute() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/freshness/route.ts");
  const response = await GET();

  assertEqual(response.status, 200, "trust freshness route status");
  assertEqual(
    response.headers["Cache-Control"],
    "public, max-age=60",
    "trust freshness Cache-Control header"
  );

  const body = await response.json();

  for (const field of [
    "version",
    "service",
    "subject",
    "canonicalUrl",
    "overall",
    "currentUpstream",
    "badges",
    "launchEvidence",
    "driftStatus",
    "links"
  ]) {
    assertHas(body, field, `trust freshness body field ${field}`);
  }

  assertEqual(body.version, "v0", "trust freshness version");
  assertEqual(body.service, "nocksperimental", "trust freshness service");
  assertEqual(body.subject, "nocksperimental.com", "trust freshness subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/trust/freshness",
    "trust freshness canonical url"
  );

  // currentUpstream must surface the pinned commit/build + drift status.
  assertNonEmpty(body.currentUpstream.commit, "currentUpstream commit");
  assertEqual(
    body.currentUpstream.commit,
    "33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "currentUpstream commit matches pinned commit"
  );
  assertEqual(
    body.currentUpstream.build,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "currentUpstream build matches pinned build"
  );
  assertNonEmpty(body.currentUpstream.driftStatus, "currentUpstream driftStatus");

  // badges + launchEvidence freshness count sections.
  assertFreshnessCounts(body.badges.freshness, "badges.freshness");
  assertFreshnessCounts(body.launchEvidence.freshness, "launchEvidence.freshness");
  assertEqual(typeof body.badges.total, "number", "badges.total is a number");
  assertEqual(typeof body.launchEvidence.total, "number", "launchEvidence.total is a number");

  const launchTotal =
    body.launchEvidence.freshness.fresh +
    body.launchEvidence.freshness.stale +
    body.launchEvidence.freshness.unknown;
  assertEqual(launchTotal, body.launchEvidence.total, "launchEvidence freshness totals match total");

  const badgeTotal =
    body.badges.freshness.fresh + body.badges.freshness.stale + body.badges.freshness.unknown;
  assertEqual(badgeTotal, body.badges.total, "badge freshness totals match total");

  // driftStatus summary section.
  assertNonEmpty(body.driftStatus.status, "driftStatus.status");
  assertEqual(typeof body.driftStatus.stale, "boolean", "driftStatus.stale is a boolean");
  assertHas(body.driftStatus, "summary", "driftStatus.summary present");
  assertEqual(
    typeof body.driftStatus.summary.totalChecks,
    "number",
    "driftStatus.summary.totalChecks is a number"
  );

  // overall verdict must be one of the known values and consistent with inputs.
  const validOverall = new Set(["drift-detected", "stale-evidence", "anchored"]);
  if (!validOverall.has(body.overall)) {
    throw new Error(
      `trust freshness overall: expected drift-detected|stale-evidence|anchored, got ${JSON.stringify(body.overall)}`
    );
  }

  const expectedOverall =
    body.driftStatus.status !== "in-sync"
      ? "drift-detected"
      : body.badges.freshness.stale > 0 || body.launchEvidence.freshness.stale > 0
        ? "stale-evidence"
        : "anchored";
  assertEqual(body.overall, expectedOverall, "trust freshness overall verdict matches inputs");

  // links section.
  assertEqual(
    body.links.self,
    "https://nocksperimental.com/api/trust/freshness",
    "trust freshness self link"
  );
  assertEqual(
    body.links.driftStatus,
    "https://nocksperimental.com/api/nockchain/drift-status",
    "trust freshness drift-status link"
  );
  assertEqual(
    body.links.launchEvidence,
    "https://nocksperimental.com/api/launch-evidence",
    "trust freshness launch-evidence link"
  );
  assertEqual(
    body.links.badges,
    "https://nocksperimental.com/api/trust/badges",
    "trust freshness badges link"
  );
}

async function assertDiscovery() {
  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "trust-freshness", "/api/trust/freshness");

  const wellKnown = await loadTypeScriptModule(
    "src/app/.well-known/nocksperimental.json/route.ts"
  ).GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.trustFreshness,
    "https://nocksperimental.com/api/trust/freshness",
    "well-known trust freshness link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "trust-freshness-rollup",
    "well-known trust-freshness-rollup capability"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/trust/freshness"]?.get?.summary,
    "Unified trust-evidence freshness rollup",
    "OpenAPI trust freshness summary"
  );
}

function assertLeafModule() {
  // trust-freshness must be a leaf: imported only by its own route.
  const libDir = path.join(process.cwd(), "src/lib");
  const offenders = [];
  walkSourceFiles(libDir).forEach((file) => {
    const source = readFileSync(file, "utf8");
    if (/from\s+["']@\/lib\/trust-freshness["']/.test(source)) {
      offenders.push(path.relative(process.cwd(), file));
    }
  });

  const appDir = path.join(process.cwd(), "src/app");
  walkSourceFiles(appDir).forEach((file) => {
    const rel = path.relative(process.cwd(), file);
    if (rel === "src/app/api/trust/freshness/route.ts") {
      return;
    }
    const source = readFileSync(file, "utf8");
    if (/from\s+["']@\/lib\/trust-freshness["']/.test(source)) {
      offenders.push(rel);
    }
  });

  if (offenders.length > 0) {
    throw new Error(
      `trust-freshness must be a leaf imported only by its route, but found imports in: ${offenders.join(", ")}`
    );
  }
}

function assertPackageWiring() {
  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-freshness-api"],
    "node scripts/test-trust-freshness-api.mjs",
    "package trust-freshness-api test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:trust-freshness-api",
    "full test chain includes trust-freshness-api test"
  );
}

function assertFreshnessCounts(counts, label) {
  if (!counts || typeof counts !== "object") {
    throw new Error(`${label}: expected object, got ${JSON.stringify(counts)}`);
  }
  for (const key of ["fresh", "stale", "unknown"]) {
    if (typeof counts[key] !== "number") {
      throw new Error(`${label}.${key}: expected number, got ${JSON.stringify(counts[key])}`);
    }
  }
}

function walkSourceFiles(dir) {
  const { readdirSync, statSync } = require("node:fs");
  const out = [];

  if (!existsSync(dir)) {
    return out;
  }

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...walkSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  assertFileExists(relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && [".ts", ".tsx"].includes(path.extname(aliasPath))) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(tsxPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsxPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertEndpoint(body, id, pathName) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  assertEqual(endpoint?.path, pathName, `${id} endpoint path`);
  assertEqual(endpoint?.url, `${body.canonicalBaseUrl}${pathName}`, `${id} endpoint URL`);
}

function assertFileExists(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function assertHas(object, key, label) {
  if (object == null || !(key in object)) {
    throw new Error(`${label}: missing key ${key}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
}
