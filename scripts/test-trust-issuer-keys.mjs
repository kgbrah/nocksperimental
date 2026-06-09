#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  assertFile("schemas/nockapp-trust-issuer-keys.schema.json");
  assertFile("src/data/trust-issuer-keys.json");

  const data = JSON.parse(readText("src/data/trust-issuer-keys.json"));
  assertEqual(data.version, "v1", "issuer keys version");
  assertNonEmpty(data.activeKeyId, "active key id");
  assertEqual(data.issuerKeys.length >= 2, true, "at least two issuer keys for rotation");

  // Structural validation against the schema's required fields.
  for (const key of data.issuerKeys) {
    for (const field of ["keyId", "algorithm", "publicKeySpki", "validFrom", "validUntil", "status", "supersededBy"]) {
      if (!(field in key)) {
        throw new Error(`issuer key ${key.keyId} missing field ${field}`);
      }
    }
    assertEqual(key.algorithm, "ed25519", `issuer key ${key.keyId} algorithm`);
    assertNonEmpty(key.publicKeySpki, `issuer key ${key.keyId} public key`);
  }

  const {
    issuerKeyForId,
    activeIssuerKey,
    publicKeyForKeyId,
    createIssuerKeyDiscovery
  } = loadTypeScriptModule("src/lib/trust-issuer-keys.ts");

  const v0 = issuerKeyForId("nocksperimental-registry-ed25519-dev-v0");
  const v1 = issuerKeyForId("nocksperimental-registry-ed25519-dev-v1");
  const prod = issuerKeyForId("nocksperimental-registry-ed25519-prod-v1");
  assertEqual(Boolean(v0), true, "v0 key resolvable");
  assertEqual(Boolean(v1), true, "v1 key resolvable");
  assertEqual(Boolean(prod), true, "prod key resolvable");
  // Rotation: the public DEV keys are RETIRED (their seeds are public — never a live anchor);
  // a retired key must still resolve so historical demo badges keep resolving.
  assertEqual(v0.status, "retired", "v0 is retired");
  assertEqual(v1.status, "retired", "v1 is retired (rotated to the production key)");
  assertEqual(prod.status, "active", "prod key is the active anchor");
  assertEqual(v0.supersededBy, "nocksperimental-registry-ed25519-dev-v1", "v0 superseded by v1");
  assertEqual(v1.supersededBy, "nocksperimental-registry-ed25519-prod-v1", "v1 superseded by prod");
  assertEqual(activeIssuerKey().keyId, "nocksperimental-registry-ed25519-prod-v1", "active key is prod-v1");
  assertNonEmpty(publicKeyForKeyId("nocksperimental-registry-ed25519-dev-v0"), "v0 public key lookup");

  const discovery = createIssuerKeyDiscovery();
  assertEqual(discovery.activeKeyId, "nocksperimental-registry-ed25519-prod-v1", "discovery active key");
  assertEqual(discovery.issuerKeys.length, data.issuerKeys.length, "discovery exposes all keys");
  assertEqual(
    discovery.canonicalUrl,
    "https://nocksperimental.com/api/trust/keys",
    "discovery canonical url"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-issuer-keys"],
    "node scripts/test-trust-issuer-keys.mjs",
    "package issuer keys test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:trust-issuer-keys", "full test includes issuer keys test");
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

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
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
