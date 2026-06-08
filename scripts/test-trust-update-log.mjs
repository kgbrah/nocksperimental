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
  const {
    appendTrustUpdateToLog,
    latestTrustUpdateForTarget,
    trustUpdateChainSummary,
    trustUpdateEntries,
    trustUpdateLog,
    trustUpdateSignedPayload,
    trustUpdatesForTarget,
    validateTrustUpdateChain
  } = loadTypeScriptModule("src/lib/trust-update-log.ts");

  assertEqual(trustUpdateLog.chain.algorithm, "sha256-dev-chain-v0", "update chain algorithm");
  assertEqual(trustUpdateLog.chain.source, "src/data/trust-update-log.json", "update chain source");
  assertEqual(trustUpdateEntries.length, 4, "update entry count");

  const validation = validateTrustUpdateChain();
  assertEqual(validation.isAppendOnly, true, "append-only chain flag");
  assertEqual(validation.entryCount, 4, "append-only entry count");
  assertEqual(validation.signedEntryCount, 4, "signed entry count");
  assertEqual(validation.validSignatureCount, 4, "valid signature count");
  assertEqual(validation.brokenLinkCount, 0, "broken link count");
  assertEqual(validation.invalidSignatureCount, 0, "invalid signature count");
  assertEqual(validation.latestRoot, "root-score-history-v0", "latest chain root");

  assertEqual(trustUpdateChainSummary.latestRoot, validation.latestRoot, "summary latest root");
  assertEqual(trustUpdateChainSummary.entryCount, 4, "summary entry count");
  assertEqual(trustUpdateChainSummary.targets, "trust-signals,badge-issuance,badge-revocation,score-history", "summary targets");

  assertEqual(trustUpdateEntries[0].previousRoot, "genesis", "genesis previous root");
  assertEqual(
    trustUpdateEntries[1].previousRoot,
    trustUpdateEntries[0].rootHash,
    "issuance previous root"
  );
  assertEqual(
    trustUpdateEntries[2].previousRoot,
    trustUpdateEntries[1].rootHash,
    "revocation previous root"
  );
  assertEqual(
    trustUpdateEntries[3].previousRoot,
    trustUpdateEntries[2].rootHash,
    "score history previous root"
  );

  const scoreHistoryUpdates = trustUpdatesForTarget("score-history");
  assertEqual(scoreHistoryUpdates.length, 1, "score history update count");
  assertEqual(scoreHistoryUpdates[0].targetPath, "src/data/trust-score-history.json", "score history target path");
  assertEqual(scoreHistoryUpdates[0].signature.verificationStatus, "valid", "score history signature status");

  const latestScoreHistoryUpdate = latestTrustUpdateForTarget("score-history");
  assertEqual(latestScoreHistoryUpdate.rootHash, "root-score-history-v0", "latest score history root");
  assertEqual(latestTrustUpdateForTarget("missing-target"), undefined, "missing target update");

  const appendedLog = appendTrustUpdateToLog(trustUpdateLog, {
    id: "update-score-history-v1",
    action: "score-history",
    target: "score-history",
    targetPath: "src/data/trust-score-history.json",
    recordedAt: "2026-05-30T02:20:00.000Z",
    rootHash: "root-score-history-v1",
    summary: "Recorded a follow-up score history batch through the append-only write path."
  });
  const appendedEntry = appendedLog.entries.at(-1);
  const appendedValidation = validateTrustUpdateChain(appendedLog);

  assertEqual(trustUpdateLog.chain.entryCount, 4, "append helper does not mutate original count");
  assertEqual(trustUpdateLog.chain.latestRoot, "root-score-history-v0", "append helper does not mutate original root");
  assertEqual(appendedLog.chain.entryCount, 5, "appended chain entry count");
  assertEqual(appendedLog.chain.latestRoot, "root-score-history-v1", "appended latest root");
  assertEqual(appendedEntry.sequence, 5, "appended entry sequence");
  assertEqual(appendedEntry.previousRoot, "root-score-history-v0", "appended previous root");
  assertEqual(appendedEntry.signature.issuerKeyId, "nocksperimental-registry-ed25519-dev-v0", "default issuer key");
  assertEqual(appendedEntry.signature.algorithm, "ed25519-devnet-v0", "default signature algorithm");
  assertEqual(appendedEntry.signature.verificationStatus, "valid", "default signature status");
  assertEqual(appendedEntry.entryHash.startsWith("sha256:"), true, "generated entry hash prefix");
  // The appended signature must be a REAL Ed25519 signature (not the old placeholder
  // string) that verifies against the issuer key's public key, and tamper-evident.
  assertEqual(
    appendedEntry.signature.signature.startsWith("ed25519-dev-sig-"),
    false,
    "appended signature is not the old placeholder string"
  );
  const crypto = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");
  const appendedSeedSpki = crypto.publicKeySpkiFromSeed(
    crypto.DEV_ISSUER_SEEDS[appendedEntry.signature.issuerKeyId]
  );
  assertEqual(
    crypto.verifyBadgeSignature({
      payload: trustUpdateSignedPayload(appendedEntry),
      signature: appendedEntry.signature.signature,
      publicKeySpkiBase64: appendedSeedSpki
    }),
    true,
    "appended Ed25519 signature verifies against the issuer key"
  );
  assertEqual(
    crypto.verifyBadgeSignature({
      payload: { ...trustUpdateSignedPayload(appendedEntry), summary: "tampered" },
      signature: appendedEntry.signature.signature,
      publicKeySpkiBase64: appendedSeedSpki
    }),
    false,
    "tampering a signed field fails Ed25519 verification"
  );
  assertEqual(appendedValidation.isAppendOnly, true, "appended log remains append-only");
  assertEqual(appendedValidation.entryCount, 5, "appended validation count");
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
