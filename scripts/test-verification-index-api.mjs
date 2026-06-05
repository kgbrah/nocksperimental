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
  const { GET } = loadTypeScriptModule("src/app/api/verify/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "verification index status code");
  assertEqual(body.version, "v0", "verification index version");
  assertEqual(body.service, "nocksperimental", "verification index service");
  assertEqual(body.subject, "nocksperimental.com", "verification index subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/verify", "canonical URL");
  assertGreaterThan(body.verifierCount, 2, "verifier count");
  assertGreaterThan(body.counts.badges, 0, "badge count");
  assertGreaterThan(body.counts.generatedReports, 0, "generated report count");
  assertGreaterThan(body.counts.trustUpdates, 0, "trust update count");

  assertVerifier(
    body,
    "badge-issuance",
    "/api/trust/badges/verify",
    "Verify badge issuance by badge id, payload digest, signature, or issuer key"
  );
  assertVerifier(
    body,
    "generated-report",
    "/api/reports/generated/verify",
    "Verify generated report hashes and snapshot roots"
  );
  assertVerifier(
    body,
    "registry-checkpoint",
    "/api/registry/checkpoint",
    "Verify registry counts, roots, and append-only trust update state"
  );
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");
  assertEqual(body.links.openApi, "https://nocksperimental.com/openapi.json", "OpenAPI link");
  assertEqual(body.links.checkpoint, "https://nocksperimental.com/api/registry/checkpoint", "checkpoint link");
  assertStartsWith(body.samples.badgeIssuance.url, "https://nocksperimental.com/api/trust/badges/verify?", "badge sample URL");
  assertIncludes(body.samples.badgeIssuance.url, "badge-payment-flow-verified", "badge sample id");
  assertIncludes(body.samples.badgeIssuance.url, "payloadDigest=", "badge sample digest");
  assertStartsWith(body.samples.generatedReport.url, "https://nocksperimental.com/api/reports/generated/verify?", "report sample URL");
  assertIncludes(body.samples.generatedReport.url, "appSlug=payment-flow", "report sample slug");
  assertIncludes(body.samples.generatedReport.url, "reportHash=", "report sample hash");
  assertEqual(body.samples.registryCheckpoint.label, "Registry checkpoint", "checkpoint sample label");
  assertEqual(body.samples.registryCheckpoint.url, "https://nocksperimental.com/api/registry/checkpoint", "checkpoint sample URL");
  assertGreaterThan(body.samples.registryCheckpoint.counts.badges, 0, "checkpoint sample badge count");
  assertGreaterThan(body.samples.registryCheckpoint.counts.generatedReports, 0, "checkpoint sample report count");
  assertGreaterThan(body.samples.registryCheckpoint.counts.trustUpdates, 0, "checkpoint sample update count");
  assertStartsWith(body.samples.registryCheckpoint.roots.checkpoint, "sha256:", "checkpoint sample root");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(registryBody, "verification-index", "/api/verify", "Verification endpoint index");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(wellKnownBody.links.verification, "https://nocksperimental.com/api/verify", "well-known verification link");
  assertIncludes(wellKnownBody.capabilities, "public-verification-index", "well-known verification capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/verify"]?.get?.summary,
    "Verification endpoint index",
    "OpenAPI verification index path"
  );
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

function assertVerifier(body, id, pathName, description) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);
  assertEqual(verifier?.description, description, `${id} verifier description`);
  assertEqual(Array.isArray(verifier?.queryParameters), true, `${id} verifier query parameters`);
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
