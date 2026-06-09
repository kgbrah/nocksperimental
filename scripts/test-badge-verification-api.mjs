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
  const trustSignals = require(path.join(process.cwd(), "src/data/trust-signals.json"));
  const expectedDigest = trustSignals.badgeIssuanceReceipts.find(
    (issuance) => issuance.badgeId === "badge-payment-flow-verified"
  ).payloadDigest;

  const { GET } = loadTypeScriptModule("src/app/api/trust/badges/[badgeId]/verification/route.ts");
  const response = await GET(createRequest(), createContext("badge-payment-flow-verified"));
  const body = await response.json();

  assertEqual(response.status, 200, "verification status code");
  assertEqual(body.version, "v0", "verification version");
  assertEqual(body.badgeId, "badge-payment-flow-verified", "verification badge id");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/verification", "canonical URL");
  assertEqual(body.currentStatus, "verified", "current status");
  assertEqual(body.isRevoked, false, "active revocation flag");
  assertEqual(body.checks.badgeFound, true, "badge found check");
  assertEqual(body.checks.issuanceFound, true, "issuance found check");
  assertEqual(body.checks.publicEmbedAvailable, true, "public embed check");
  assertEqual(body.issuance.verification.status, "valid", "issuance verification status");
  assertEqual(body.issuance.issuerKeyId, "nocksperimental-registry-ed25519-prod-v1", "issuer key id");
  assertEqual(body.issuance.payloadDigest, expectedDigest, "payload digest");
  assertEqual(body.evidence.reportHash, "sha256:3a6d6bff59cb624f-payment-flow", "report hash");
  assertEqual(body.evidence.snapshotRoot, "3a6d6bff59cb624f", "snapshot root");
  assertEqual(body.revocation, null, "active badge revocation");
  assertEqual(body.replacement, null, "active badge replacement");
  assertEqual(body.embed.badgeId, "badge-payment-flow-verified", "embed badge id");

  const missing = await GET(createRequest(), createContext("missing-badge"));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing badge status");
  assertEqual(missingBody.error, "Badge not found", "missing badge error");
  assertEqual(missingBody.badgeId, "missing-badge", "missing badge id");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/trust/badges/{badgeId}/verification"]?.get?.summary,
    "Badge verification bundle",
    "OpenAPI badge verification path"
  );
}

function createRequest() {
  return {};
}

function createContext(badgeId) {
  return {
    params: Promise.resolve({ badgeId })
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
