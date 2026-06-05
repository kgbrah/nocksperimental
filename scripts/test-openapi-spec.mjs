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
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(response.status, 200, "OpenAPI status code");
  assertEqual(spec.openapi, "3.1.0", "OpenAPI version");
  assertEqual(spec.info.title, "Nocksperimental Trust Registry API", "OpenAPI title");
  assertEqual(spec.info.version, "v0", "OpenAPI info version");
  assertEqual(spec.servers[0].url, "https://nocksperimental.com", "OpenAPI server");
  assertPath(spec, "/.well-known/nocksperimental.json", "Nocksperimental trust discovery manifest");
  assertPath(spec, "/api/health", "Public runtime readiness probe");
  assertPath(spec, "/api/registry", "Public registry manifest");
  assertPath(spec, "/api/verify", "Verification endpoint index");
  assertPath(spec, "/api/trust", "Trust registry overview");
  assertPath(spec, "/api/trust/badges", "Verified badge registry");
  assertPath(spec, "/api/trust/badges/verify", "Badge issuance verifier");
  assertPath(spec, "/api/reports/generated", "Generated lab report index");
  assertPath(spec, "/api/reports/generated/verify", "Generated report evidence verifier");
  assertPath(spec, "/api/reports/generated/{appSlug}/evidence", "Generated report evidence bundle");
  assertPath(spec, "/api/trust/updates", "Signed trust registry update log");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(wellKnownBody.links.openApi, "https://nocksperimental.com/openapi.json", "well-known OpenAPI link");
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

function assertPath(spec, pathName, summary) {
  assertEqual(spec.paths[pathName]?.get?.summary, summary, `${pathName} summary`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
