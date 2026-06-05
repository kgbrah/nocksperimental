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
  const { GET } = loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "well-known status code");
  assertEqual(body.version, "v0", "well-known version");
  assertEqual(body.service, "nocksperimental", "well-known service");
  assertEqual(body.canonicalBaseUrl, "https://nocksperimental.com", "canonical base URL");
  assertEqual(body.subject, "nocksperimental.com", "manifest subject");
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");
  assertEqual(body.links.health, "https://nocksperimental.com/api/health", "health link");
  assertEqual(body.links.checkpoint, "https://nocksperimental.com/api/registry/checkpoint", "checkpoint link");
  assertEqual(body.links.verification, "https://nocksperimental.com/api/verify", "verification link");
  assertEqual(body.links.verifiedBadges, "https://nocksperimental.com/api/trust/badges", "badges link");
  assertEqual(body.links.trustUpdates, "https://nocksperimental.com/api/trust/updates", "trust updates link");
  assertIncludes(body.capabilities, "verified-badges", "verified badges capability");
  assertIncludes(body.capabilities, "append-only-trust-updates", "trust update capability");
  assertIncludes(body.capabilities, "registry-checkpoints", "checkpoint capability");
  assertIncludes(body.capabilities, "public-verification-index", "verification capability");
  assertIncludes(body.capabilities, "cloudflare-workers", "deployment capability");
  assertGreaterThan(body.counts.badges, 0, "badge count");
  assertGreaterThan(body.counts.generatedReports, 0, "generated report count");
  assertGreaterThan(body.counts.trustUpdates, 0, "trust update count");
  assertEqual(body.latestTrustUpdate.status, "verified", "latest update status");
  assertNonEmpty(body.latestTrustUpdate.rootHash, "latest update root");
  assertValidIsoDate(body.publishedAt, "well-known publishedAt");
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

function assertValidIsoDate(value, label) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label}: expected ISO date, got ${JSON.stringify(value)}`);
  }
}
