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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/drift-status/attestation/route.ts");
  const { verifyBadgeSignature } = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");
  const { activeIssuerKey, publicKeyForKeyId } = loadTypeScriptModule("src/lib/trust-issuer-keys.ts");

  const response = await GET(new Request("https://nocksperimental.com/api/nockchain/drift-status/attestation"));
  const body = await response.json();

  assertEqual(response.status, 200, "attestation status code");
  assertEqual(body.version, "v0", "attestation version");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/drift-status/attestation",
    "attestation canonical url"
  );
  assertEqual(body.algorithm, "ed25519", "attestation algorithm");
  assertEqual(body.issuerKeyId, activeIssuerKey().keyId, "attestation signed by active issuer key");
  assertNonEmpty(body.signature, "attestation signature");
  assertNonEmpty(body.attestation.observedAt, "attestation observedAt");
  assertEqual(typeof body.attestation.summary.totalChecks, "number", "attestation summary totalChecks");
  assertEqual(Array.isArray(body.attestation.checks), true, "attestation per-check list");

  // The attestation must verify offline against the published active issuer key.
  assertEqual(
    verifyBadgeSignature({
      payload: body.attestation,
      signature: body.signature,
      publicKeySpkiBase64: publicKeyForKeyId(body.issuerKeyId)
    }),
    true,
    "attestation signature verifies against published issuer key"
  );

  // Tampering the attestation breaks verification.
  assertEqual(
    verifyBadgeSignature({
      payload: { ...body.attestation, status: "tampered" },
      signature: body.signature,
      publicKeySpkiBase64: publicKeyForKeyId(body.issuerKeyId)
    }),
    false,
    "tampered attestation fails verification"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:drift-status-attestation-api"],
    "node scripts/test-drift-status-attestation-api.mjs",
    "package attestation api test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:drift-status-attestation-api",
    "full test includes attestation api test"
  );
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

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}: expected non-empty string`);
  }
}
