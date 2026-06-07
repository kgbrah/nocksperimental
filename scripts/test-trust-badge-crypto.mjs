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
  const {
    DEV_ISSUER_SEEDS,
    ACTIVE_DEV_ISSUER_KEY_ID,
    canonicalizeBadgePayload,
    badgePayloadDigest,
    publicKeySpkiFromSeed,
    signBadgePayload,
    verifyBadgeSignature,
    badgeIssuerSigningSeed
  } = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");

  const seedV0 = DEV_ISSUER_SEEDS["nocksperimental-registry-ed25519-dev-v0"];
  const seedV1 = DEV_ISSUER_SEEDS["nocksperimental-registry-ed25519-dev-v1"];
  assertNonEmpty(seedV0, "dev seed v0");
  assertNonEmpty(seedV1, "dev seed v1");

  const payload = {
    badgeId: "badge-demo",
    status: "verified",
    reportHash: "sha256:demo",
    snapshotRoot: "demo-root",
    issuedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2027-06-01T00:00:00.000Z",
    sourceAnchor: { commit: "abc123", build: "build-abc123" }
  };

  // Canonicalization is key-order independent.
  assertEqual(
    canonicalizeBadgePayload({ a: 1, b: 2 }),
    canonicalizeBadgePayload({ b: 2, a: 1 }),
    "canonicalization is order independent"
  );

  // COR-E: undefined-valued keys are dropped (mirrors JSON.stringify), so an
  // optional signed field that is unset canonicalizes identically to omitting it.
  assertEqual(
    canonicalizeBadgePayload({ a: 1, b: undefined, c: 3 }),
    canonicalizeBadgePayload({ a: 1, c: 3 }),
    "undefined-valued keys are dropped during canonicalization"
  );

  // null stays distinct from a dropped/undefined key.
  assertEqual(
    canonicalizeBadgePayload({ a: 1, b: null }) !== canonicalizeBadgePayload({ a: 1 }),
    true,
    "null is preserved (distinct from omitted undefined)"
  );
  assertEqual(badgePayloadDigest(payload).startsWith("sha256:"), true, "digest is sha256 prefixed");

  // Deterministic signing (Ed25519 is deterministic per RFC 8032).
  const sigA = signBadgePayload(payload, seedV0);
  const sigB = signBadgePayload(payload, seedV0);
  assertEqual(sigA.signature, sigB.signature, "signing is deterministic");
  assertEqual(sigA.algorithm, "ed25519", "algorithm is ed25519");

  const pubV0 = publicKeySpkiFromSeed(seedV0);
  const pubV1 = publicKeySpkiFromSeed(seedV1);
  assertEqual(pubV0 !== pubV1, true, "distinct seeds produce distinct public keys");

  // Good verify.
  assertEqual(
    verifyBadgeSignature({ payload, signature: sigA.signature, publicKeySpkiBase64: pubV0 }),
    true,
    "valid signature verifies"
  );

  // Tampered payload fails.
  const tampered = { ...payload, reportHash: "sha256:tampered" };
  assertEqual(
    verifyBadgeSignature({ payload: tampered, signature: sigA.signature, publicKeySpkiBase64: pubV0 }),
    false,
    "tampered payload fails verification"
  );

  // Wrong key fails (replay against a different issuer key).
  assertEqual(
    verifyBadgeSignature({ payload, signature: sigA.signature, publicKeySpkiBase64: pubV1 }),
    false,
    "wrong issuer key fails verification"
  );

  // Garbage signature fails gracefully.
  assertEqual(
    verifyBadgeSignature({ payload, signature: "not-base64-sig", publicKeySpkiBase64: pubV0 }),
    false,
    "garbage signature fails verification"
  );

  // Default signing seed falls back to the active dev key when env is unset.
  assertEqual(
    badgeIssuerSigningSeed(),
    DEV_ISSUER_SEEDS[ACTIVE_DEV_ISSUER_KEY_ID],
    "default signing seed is the active dev key"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-badge-crypto"],
    "node scripts/test-trust-badge-crypto.mjs",
    "package crypto test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:trust-badge-crypto",
    "full test includes crypto test"
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
