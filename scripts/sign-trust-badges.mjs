#!/usr/bin/env node

// Maintainer tool: regenerates the committed issuer-key registry
// (src/data/trust-issuer-keys.json) and re-signs every badge issuance receipt
// in src/data/trust-signals.json with real Ed25519 signatures over the canonical
// signed payload (now including the upstream sourceAnchor). Deterministic: uses
// the dev issuer seeds so committed signatures are reproducible. Pass --dry-run
// to print without writing. Not part of `npm test`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

// Upstream anchors: most badges pin the current commit (fresh); the legacy
// revoked badge pins an older commit so it computes "stale" in fixtures.
const CURRENT_ANCHOR = {
  commit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  build: "build-33ba97b1e206dd89b15c61b72b7802caf2136c18"
};
const STALE_ANCHOR = {
  commit: "5d022ced5504e1f2a3b4c5d6e7f80910a1b2c3d4",
  build: "build-5d022ced5504e1f2a3b4c5d6e7f80910a1b2c3d4"
};
const STALE_BADGE_IDS = new Set(["badge-payment-flow-legacy"]);

const ISSUER_KEYS = [
  {
    keyId: "nocksperimental-registry-ed25519-dev-v0",
    algorithm: "ed25519",
    validFrom: "2026-05-01T00:00:00.000Z",
    validUntil: "2026-06-01T00:00:00.000Z",
    status: "retired",
    supersededBy: "nocksperimental-registry-ed25519-dev-v1"
  },
  {
    keyId: "nocksperimental-registry-ed25519-dev-v1",
    algorithm: "ed25519",
    validFrom: "2026-06-01T00:00:00.000Z",
    validUntil: null,
    status: "active",
    supersededBy: null
  }
];

main();

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const crypto = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");

  const issuerKeys = {
    version: "v0",
    activeKeyId: crypto.ACTIVE_DEV_ISSUER_KEY_ID,
    issuerKeys: ISSUER_KEYS.map((key) => ({
      ...key,
      publicKeySpki: crypto.publicKeySpkiFromSeed(crypto.DEV_ISSUER_SEEDS[key.keyId])
    }))
  };

  const trustSignals = JSON.parse(readText("src/data/trust-signals.json"));

  for (const badge of trustSignals.verifiedBadges) {
    badge.sourceAnchor = STALE_BADGE_IDS.has(badge.id) ? { ...STALE_ANCHOR } : { ...CURRENT_ANCHOR };
  }

  for (const issuance of trustSignals.badgeIssuanceReceipts) {
    const badge = trustSignals.verifiedBadges.find((entry) => entry.id === issuance.badgeId);

    if (!badge) {
      throw new Error(`Issuance ${issuance.id} references unknown badge ${issuance.badgeId}`);
    }

    issuance.signedPayload = {
      badgeId: badge.id,
      status: issuance.signedPayload.status,
      reportHash: badge.evidence.reportHash,
      snapshotRoot: badge.evidence.snapshotRoot,
      issuedAt: issuance.signedPayload.issuedAt,
      expiresAt: issuance.signedPayload.expiresAt,
      sourceAnchor: { ...badge.sourceAnchor }
    };

    const seed = crypto.DEV_ISSUER_SEEDS[issuance.issuerKeyId];

    if (!seed) {
      throw new Error(`No dev seed for issuer key ${issuance.issuerKeyId}`);
    }

    const signed = crypto.signBadgePayload(issuance.signedPayload, seed);
    issuance.payloadDigest = signed.payloadDigest;
    issuance.signature = signed.signature;
    issuance.verification = {
      ...issuance.verification,
      status: "valid",
      algorithm: signed.algorithm
    };
  }

  const keysSerialized = `${JSON.stringify(issuerKeys, null, 2)}\n`;
  const signalsSerialized = `${JSON.stringify(trustSignals, null, 2)}\n`;

  if (dryRun) {
    process.stdout.write("=== src/data/trust-issuer-keys.json ===\n");
    process.stdout.write(keysSerialized);
    process.stdout.write("=== src/data/trust-signals.json (issuance receipts re-signed) ===\n");
    for (const issuance of trustSignals.badgeIssuanceReceipts) {
      process.stdout.write(
        `${issuance.id}: key=${issuance.issuerKeyId} digest=${issuance.payloadDigest}\n`
      );
    }
    return;
  }

  writeFileSync(path.join(process.cwd(), "src/data/trust-issuer-keys.json"), keysSerialized);
  writeFileSync(path.join(process.cwd(), "src/data/trust-signals.json"), signalsSerialized);
  console.log(
    `Signed ${trustSignals.badgeIssuanceReceipts.length} issuance receipts and wrote ${issuerKeys.issuerKeys.length} issuer keys.`
  );
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
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

      if (existsSync(`${aliasPath}`) && path.extname(aliasPath) === ".json") {
        return require(aliasPath);
      }
      if (existsSync(tsPath)) {
        return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      }
      if (existsSync(jsonPath)) {
        return require(jsonPath);
      }
      throw new Error(`Unsupported module alias: ${specifier}`);
    }

    return require(specifier);
  };
}
