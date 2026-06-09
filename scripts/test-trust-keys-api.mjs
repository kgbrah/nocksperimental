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
  const { GET } = loadTypeScriptModule("src/app/api/trust/keys/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "keys status code");
  assertEqual(response.headers["Cache-Control"], "public, max-age=300", "keys cache control");
  assertEqual(body.version, "v1", "keys version");
  assertEqual(body.algorithm, "ed25519", "keys algorithm");
  assertEqual(body.activeKeyId, "nocksperimental-registry-ed25519-prod-v1", "keys active id");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/trust/keys", "keys canonical url");
  assertEqual(body.issuerKeys.length >= 2, true, "keys count");

  for (const key of body.issuerKeys) {
    assertNonEmpty(key.keyId, "key id");
    assertNonEmpty(key.publicKeySpki, "key public spki");
    assertEqual(["active", "retired"].includes(key.status), true, `key ${key.keyId} status`);
  }

  assertEqual(
    body.links.badgeVerifier,
    "https://nocksperimental.com/api/trust/badges/verify",
    "keys link to verifier"
  );

  // Discovery surface is wired into the registry + openapi.
  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  const endpoint = registryBody.endpoints.find((entry) => entry.id === "trust-issuer-keys");
  assertEqual(endpoint?.path, "/api/trust/keys", "registry exposes issuer keys endpoint");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.trustIssuerKeys,
    "https://nocksperimental.com/api/trust/keys",
    "well-known links issuer keys"
  );
  assertIncludes(wellKnownBody.capabilities, "trust-issuer-key-discovery", "well-known capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    Boolean(openApiBody.paths["/api/trust/keys"]?.get),
    true,
    "OpenAPI documents issuer keys path"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-keys-api"],
    "node scripts/test-trust-keys-api.mjs",
    "package keys api test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:trust-keys-api", "full test includes keys api test");
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
      const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;
      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") return require(aliasPath);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      if (existsSync(jsonPath)) return require(jsonPath);
      throw new Error(`Unsupported module alias: ${specifier}`);
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
