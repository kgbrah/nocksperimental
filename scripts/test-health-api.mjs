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
  const { GET } = loadTypeScriptModule("src/app/api/health/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "health status code");
  assertEqual(body.status, "ok", "health status");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.deployment.target, "cloudflare-workers", "deployment target");
  assertEqual(body.deployment.domain, "nocksperimental.com", "deployment domain");
  assertEqual(body.checks.reportHistory.status, "ok", "report history check");
  assertGreaterThan(body.checks.reportHistory.count, 0, "report history count");
  assertEqual(body.checks.trustRegistry.status, "ok", "trust registry check");
  assertGreaterThan(body.checks.trustRegistry.badges, 0, "trust badge count");
  assertGreaterThan(body.checks.trustRegistry.resolvedBadges, 0, "resolved badge count");
  assertGreaterThan(body.checks.trustRegistry.trustUpdates, 0, "trust update count");
  assertEqual(body.checks.workspaces.status, "ok", "workspaces check");
  assertGreaterThan(body.checks.workspaces.count, 0, "workspace count");
  assertValidIsoDate(body.checkedAt, "health checkedAt");
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

function assertValidIsoDate(value, label) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label}: expected ISO date, got ${JSON.stringify(value)}`);
  }
}
