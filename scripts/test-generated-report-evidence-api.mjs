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
  const { GET } = loadTypeScriptModule("src/app/api/reports/generated/[appSlug]/evidence/route.ts");
  const response = await GET(createRequest(), createContext("payment-flow"));
  const body = await response.json();

  assertEqual(response.status, 200, "evidence status code");
  assertEqual(body.version, "v0", "evidence version");
  assertEqual(body.appSlug, "payment-flow", "app slug");
  assertEqual(body.fixtureId, "payment-flow-v0", "fixture id");
  assertEqual(body.status, "pass", "report status");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/reports/generated/payment-flow/evidence", "canonical URL");
  assertEqual(body.subject, "nocksperimental.com", "evidence subject");
  assertStartsWith(body.artifacts.reportHash, "sha256:", "report hash");
  assertNonEmpty(body.artifacts.snapshotRoot, "snapshot root");
  assertEqual(body.artifacts.reportHash, body.badgeCandidate.evidence.reportHash, "badge candidate report hash");
  assertEqual(body.artifacts.snapshotRoot, body.badgeCandidate.evidence.snapshotRoot, "badge candidate snapshot root");
  assertIncludes(body.badgeCandidate.evidence.invariantPacks, "payments-core-v0", "badge candidate invariant pack");
  assertEqual(body.checks.reportFound, true, "report found check");
  assertEqual(body.checks.reportHashBoundToBadge, true, "report hash binding check");
  assertEqual(body.checks.snapshotRootBoundToBadge, true, "snapshot root binding check");
  assertEqual(body.checks.invariantPacksBoundToBadge, true, "invariant pack binding check");
  assertEqual(body.checks.registryLinksAvailable, true, "registry link check");
  assertEqual(body.registry.registry, "https://nocksperimental.com/api/registry", "registry link");
  assertEqual(body.registry.checkpoint, "https://nocksperimental.com/api/registry/checkpoint", "checkpoint link");
  assertEqual(body.registry.openApi, "https://nocksperimental.com/openapi.json", "OpenAPI link");
  assertEqual(body.links.report, "https://nocksperimental.com/api/reports/generated/payment-flow", "report link");
  assertEqual(body.links.provenance, "https://nocksperimental.com/api/reports/generated/payment-flow/provenance", "provenance link");
  assertEqual(body.links.evidence, body.canonicalUrl, "evidence link");
  assertEqual(body.summary.stepsPassed, body.summary.stepsTotal, "all steps pass");
  assertGreaterThan(body.summary.invariantsTotal, 0, "invariants total");
  assertGreaterThan(body.evidence.snapshotCount, 0, "snapshot count");
  assertGreaterThan(body.evidence.invariantPackCount, 0, "invariant pack count");

  const missing = await GET(createRequest(), createContext("missing-app"));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing report status");
  assertEqual(missingBody.error, "Generated report not found", "missing report error");
  assertEqual(missingBody.appSlug, "missing-app", "missing report slug");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/reports/generated/{appSlug}/evidence"]?.get?.summary,
    "Generated report evidence bundle",
    "OpenAPI evidence path"
  );
}

function createRequest() {
  return {};
}

function createContext(appSlug) {
  return {
    params: Promise.resolve({ appSlug })
  };
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
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
          json: (body, init = {}) => ({
            headers: init.headers ?? {},
            status: init.status ?? 200,
            json: async () => body
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertGreaterThan(actual, expectedMinimum, label) {
  if (!(actual > expectedMinimum)) {
    throw new Error(`${label}: expected more than ${expectedMinimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNonEmpty(actual, label) {
  if (typeof actual !== "string" || actual.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(actual)}`);
  }
}
