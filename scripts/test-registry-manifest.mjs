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
  const { GET } = loadTypeScriptModule("src/app/api/registry/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "registry status code");
  assertEqual(body.version, "v0", "registry version");
  assertEqual(body.service, "nocksperimental", "registry service");
  assertEqual(body.canonicalBaseUrl, "https://nocksperimental.com", "canonical base URL");
  assertEndpoint(body, "registry-checkpoint", "/api/registry/checkpoint", "Registry integrity checkpoint");
  assertEndpoint(body, "verification-index", "/api/verify", "Verification endpoint index");
  assertEndpoint(body, "health", "/api/health", "Public runtime readiness probe");
  assertEndpoint(body, "trust-overview", "/api/trust", "Trust registry overview");
  assertEndpoint(body, "verified-badges", "/api/trust/badges", "Verified badge registry");
  assertEndpoint(body, "generated-reports", "/api/reports/generated", "Generated lab report index");
  assertEndpoint(body, "registry-updates", "/api/trust/updates", "Signed trust registry update log");
  assertEqual(body.counts.badges, body.trustSignals.verifiedBadges.length, "badge count");
  assertEqual(body.counts.trustConsumers, body.trustSignals.trustConsumers.length, "trust consumer count");
  assertGreaterThan(body.counts.generatedReports, 0, "generated report count");
  assertGreaterThan(body.counts.trustUpdates, 0, "trust update count");
  assertEqual(body.latestTrustUpdate.status, "verified", "latest trust update status");
  assertNonEmpty(body.latestTrustUpdate.rootHash, "latest trust root hash");
  assertValidIsoDate(body.publishedAt, "registry publishedAt");
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

function assertEndpoint(body, id, pathName, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  assertEqual(endpoint?.path, pathName, `${id} endpoint path`);
  assertEqual(endpoint?.url, `${body.canonicalBaseUrl}${pathName}`, `${id} endpoint URL`);
  assertEqual(endpoint?.description, description, `${id} endpoint description`);
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

function assertNonEmpty(actual, label) {
  if (typeof actual !== "string" || actual.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(actual)}`);
  }
}

function assertValidIsoDate(value, label) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label}: expected ISO date, got ${JSON.stringify(value)}`);
  }
}
