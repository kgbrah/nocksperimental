#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import {
  canonicalizeBadgePayload as cliCanonicalize,
  badgePayloadDigest as cliDigest,
  verifyBadgeSignature as cliVerify,
  verifyEnvelope,
  resolveIssuerKey,
  loadIssuerKeyRegistry,
  loadCommittedReceipts,
  loadCommittedRevocations,
  findBadgeRevocation
} from "./nocks-verify.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const CLI = path.join(process.cwd(), "scripts/nocks-verify.mjs");
let tmpDir = "";
let tmpCounter = 0;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  assertFile("scripts/nocks-verify.mjs");

  const {
    DEV_ISSUER_SEEDS,
    ACTIVE_DEV_ISSUER_KEY_ID,
    canonicalizeBadgePayload: tsCanonicalize,
    badgePayloadDigest: tsDigest,
    verifyBadgeSignature: tsVerify,
    signBadgePayload
  } = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");

  // ---- 1. The ported primitives are BYTE-IDENTICAL to the TS source ----
  const canonShapes = [
    { a: 1, b: 2 },
    { b: 2, a: 1 },
    { z: { y: [3, 2, 1], x: "s" }, a: null, b: undefined, c: 0, d: false },
    [1, "two", { three: 3 }, null],
    { nested: { deep: { deeper: [{ k: "v" }, 2] } } },
    "plain-string",
    42,
    null,
    { sourceAnchor: { build: "b", commit: "c" }, badgeId: "x", status: "verified" }
  ];
  for (const shape of canonShapes) {
    assertEqual(
      cliCanonicalize(shape),
      tsCanonicalize(shape),
      `canonicalize parity: ${JSON.stringify(shape)}`
    );
    assertEqual(cliDigest(shape), tsDigest(shape), `digest parity: ${JSON.stringify(shape)}`);
  }

  // Key-order independence + undefined-dropping replicated exactly.
  assertEqual(
    cliCanonicalize({ a: 1, b: 2 }),
    cliCanonicalize({ b: 2, a: 1 }),
    "CLI canonicalize is order-independent"
  );
  assertEqual(
    cliCanonicalize({ a: 1, b: undefined, c: 3 }),
    cliCanonicalize({ a: 1, c: 3 }),
    "CLI canonicalize drops undefined-valued keys"
  );
  assertEqual(
    cliCanonicalize({ a: 1, b: null }) !== cliCanonicalize({ a: 1 }),
    true,
    "CLI canonicalize preserves null distinct from omitted"
  );

  // ---- 2. verifyBadgeSignature parity (sign via TS, verify via both) ----
  const seedV1 = DEV_ISSUER_SEEDS[ACTIVE_DEV_ISSUER_KEY_ID];
  const samplePayload = {
    badgeId: "badge-demo",
    status: "verified",
    sourceAnchor: { commit: "abc123", build: "build-abc123" }
  };
  const signed = signBadgePayload(samplePayload, seedV1);
  const registry = loadIssuerKeyRegistry();
  const spkiV1 = resolveIssuerKey(registry, ACTIVE_DEV_ISSUER_KEY_ID).publicKeySpki;
  assertEqual(
    cliVerify({ payload: samplePayload, signature: signed.signature, publicKeySpkiBase64: spkiV1 }),
    true,
    "CLI verifies a TS-signed payload"
  );
  assertEqual(
    tsVerify({ payload: samplePayload, signature: signed.signature, publicKeySpkiBase64: spkiV1 }),
    cliVerify({ payload: samplePayload, signature: signed.signature, publicKeySpkiBase64: spkiV1 }),
    "TS and CLI verify agree"
  );
  assertEqual(
    cliVerify({ payload: { ...samplePayload, status: "revoked" }, signature: signed.signature, publicKeySpkiBase64: spkiV1 }),
    false,
    "CLI rejects a tampered payload"
  );

  // ---- 3. Every committed badge issuance receipt is cryptographically valid;
  // active ones verify (exit 0) and revoked ones fail CLOSED (exit 1) ----
  const receipts = loadCommittedReceipts();
  const revocations = loadCommittedRevocations();
  const revokedBadgeIds = new Set(revocations.map((entry) => entry.badgeId));
  assertEqual(receipts.length > 0, true, "committed receipts present");
  for (const receipt of receipts) {
    const result = runCliJson(["verify-badge", "--file", writeTmp(receipt), "--json"]);
    // Crypto must hold for EVERY committed receipt, revoked or not.
    assertEqual(
      result.body.recomputedDigest,
      receipt.payloadDigest,
      `recomputed digest matches stamp: ${receipt.id}`
    );
    assertEqual(result.body.payloadDigestMatched, true, `digest matched: ${receipt.id}`);
    assertEqual(
      result.body.signatureCryptographicallyValid,
      true,
      `signature valid: ${receipt.id}`
    );
    assertEqual(result.body.issuerKeyResolved, true, `issuer key resolved: ${receipt.id}`);

    if (revokedBadgeIds.has(receipt.badgeId)) {
      // A committed revocation overrides a cryptographically valid receipt.
      assertEqual(result.body.verified, false, `revoked receipt fails closed: ${receipt.id}`);
      assertEqual(result.code, 1, `revoked receipt exit 1: ${receipt.id}`);
      assertEqual(result.body.revoked, true, `revoked flag set: ${receipt.id}`);
      assertEqual(result.body.reason, "badge-revoked", `revoked reason surfaced: ${receipt.id}`);
    } else {
      assertEqual(result.body.verified, true, `committed receipt verifies: ${receipt.id}`);
      assertEqual(result.code, 0, `committed receipt exit 0: ${receipt.id}`);
      assertEqual(result.body.revoked, false, `active receipt reported not-revoked: ${receipt.id}`);
    }
  }

  // ---- 3b. A committed badge revocation fails CLOSED offline so the portable
  // verdict matches the host (whose verifier requires notRevoked). The signature
  // stays valid: revocation is an independent, committed fact, checked offline. ----
  assertEqual(revokedBadgeIds.size > 0, true, "at least one committed revocation present to exercise fail-closed");
  const revokedReceipt = receipts.find((receipt) => revokedBadgeIds.has(receipt.badgeId));
  assertEqual(Boolean(revokedReceipt), true, "a committed receipt exists for the revoked badge");
  // Unit: the pure helper finds the revocation by badgeId and ignores unknown ids.
  assertEqual(
    findBadgeRevocation(revokedReceipt.badgeId, revocations)?.badgeId,
    revokedReceipt.badgeId,
    "findBadgeRevocation matches the revoked badgeId"
  );
  assertEqual(findBadgeRevocation("badge-does-not-exist", revocations), null, "findBadgeRevocation ignores unknown ids");
  assertEqual(findBadgeRevocation(null, revocations), null, "findBadgeRevocation ignores a null id");
  // --file path already covered by the loop above; assert the --digest lookup path
  // ALSO fails closed for a revoked receipt (shared revocation overlay in runVerify).
  const revByDigest = runCliJson(["verify-badge", "--digest", revokedReceipt.payloadDigest, "--json"]);
  assertEqual(revByDigest.body.verified, false, "revoked badge fails closed via --digest");
  assertEqual(revByDigest.code, 1, "revoked badge --digest exits 1");
  assertEqual(revByDigest.body.revoked, true, "revoked badge --digest flagged revoked");
  assertEqual(
    revByDigest.body.signatureCryptographicallyValid,
    true,
    "revoked badge signature is still cryptographically valid (revocation is independent)"
  );

  // A retired-key receipt must still verify (rotation does not break history).
  const retiredReceipt = receipts.find((r) => r.issuerKeyId.endsWith("dev-v0"));
  if (retiredReceipt) {
    const result = runCliJson(["verify-badge", "--file", writeTmp(retiredReceipt), "--json"]);
    assertEqual(result.body.verified, true, "retired-key receipt still verifies");
    assertEqual(result.body.issuerKeyStatus, "retired", "retired-key status surfaced");
  }

  // ---- 4. Tampered payload fails ----
  const sample = receipts[0];
  const tampered = JSON.parse(JSON.stringify(sample));
  tampered.signedPayload.reportHash = "sha256:tampered-evidence";
  const tamperedResult = runCliJson(["verify-badge", "--file", writeTmp(tampered), "--json"]);
  assertEqual(tamperedResult.body.verified, false, "tampered payload fails");
  assertEqual(tamperedResult.code, 1, "tampered payload exits non-zero");
  // Digest stamp no longer matches the mutated payload.
  assertEqual(tamperedResult.body.payloadDigestMatched, false, "tampered payload digest mismatch");

  // ---- 5. Unknown issuer key fails ----
  const bogus = JSON.parse(JSON.stringify(sample));
  bogus.issuerKeyId = "nocksperimental-registry-ed25519-bogus";
  const bogusResult = runCliJson(["verify-badge", "--file", writeTmp(bogus), "--json"]);
  assertEqual(bogusResult.body.verified, false, "unknown issuer key fails");
  assertEqual(bogusResult.body.issuerKeyResolved, false, "unknown issuer key unresolved");

  // ---- 5b. A valid signature for a DIFFERENT payload/key must not verify ----
  // (forged-signature / cross-payload replay: signed.signature is a real Ed25519
  // signature over samplePayload by v1, grafted onto this v0 receipt.)
  const swappedSig = JSON.parse(JSON.stringify(sample));
  swappedSig.signature = signed.signature;
  const swappedSigResult = runCliJson(["verify-badge", "--file", writeTmp(swappedSig), "--json"]);
  assertEqual(swappedSigResult.body.verified, false, "grafted valid-but-wrong signature fails");
  assertEqual(
    swappedSigResult.body.signatureCryptographicallyValid,
    false,
    "grafted signature is not cryptographically valid"
  );

  // ---- 5c. Cross-key replay: resolving a DIFFERENT valid issuer key must fail ----
  const otherKeyId = sample.issuerKeyId.endsWith("dev-v0")
    ? "nocksperimental-registry-ed25519-dev-v1"
    : "nocksperimental-registry-ed25519-dev-v0";
  const replay = JSON.parse(JSON.stringify(sample));
  replay.issuerKeyId = otherKeyId;
  const replayResult = runCliJson(["verify-badge", "--file", writeTmp(replay), "--json"]);
  assertEqual(replayResult.body.verified, false, "signature against a different valid key fails");
  assertEqual(replayResult.body.issuerKeyResolved, true, "the substituted valid key still resolves");
  assertEqual(
    replayResult.body.signatureCryptographicallyValid,
    false,
    "substituted key does not validate the signature"
  );

  // ---- 5d. A valid signature with NO stamped digest is accepted (signature is
  // the gate; the digest is a redundant stamp). Locks the documented behavior. ----
  const noDigest = {
    badgeId: "badge-no-digest",
    signedPayload: samplePayload,
    signature: signed.signature,
    issuerKeyId: ACTIVE_DEV_ISSUER_KEY_ID
  };
  const noDigestResult = runCliJson(["verify-badge", "--file", writeTmp(noDigest), "--json"]);
  assertEqual(noDigestResult.body.verified, true, "valid signature without a stamped digest verifies");
  assertEqual(noDigestResult.code, 0, "valid no-digest artifact exits 0");
  assertEqual(noDigestResult.body.payloadDigestMatched, null, "absent digest reported as null, not failure");

  // ---- 6. Committed-receipt lookup by --digest works, cwd-independently ----
  const fromTmpCwd = spawnSync(
    process.execPath,
    [CLI, "verify-badge", "--digest", sample.payloadDigest, "--json"],
    { cwd: mkdtempSync(path.join(tmpdir(), "nocks-verify-cwd-")), encoding: "utf8" }
  );
  assertEqual(fromTmpCwd.status, 0, "--digest lookup exits 0 from a foreign cwd");
  assertEqual(
    JSON.parse(fromTmpCwd.stdout).verified,
    true,
    "--digest lookup verifies (cwd-independent root-of-trust resolution)"
  );

  // ---- 7. stdin input path works ----
  const viaStdin = spawnSync(process.execPath, [CLI, "verify-badge", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: JSON.stringify(sample)
  });
  assertEqual(viaStdin.status, 0, "stdin receipt exits 0");
  assertEqual(JSON.parse(viaStdin.stdout).verified, true, "stdin receipt verifies");

  // ---- 8. verify-attestation: sign a synthetic attestation offline, verify it ----
  const attestationPayload = {
    version: "v0",
    observedAt: "2026-06-07T00:00:00.000Z",
    summary: { totalChecks: 15, inSyncChecks: 15 },
    checks: [{ id: "docs", status: "in-sync" }]
  };
  const attestationSig = signBadgePayload(attestationPayload, seedV1);
  const attestationEnvelope = {
    version: "v0",
    canonicalUrl: "https://example.test/api/nockchain/drift-status/attestation",
    attestation: attestationPayload,
    signature: attestationSig.signature,
    payloadDigest: attestationSig.payloadDigest,
    algorithm: "ed25519",
    issuerKeyId: ACTIVE_DEV_ISSUER_KEY_ID
  };
  const attResult = runCliJson(["verify-attestation", "--file", writeTmp(attestationEnvelope), "--json"]);
  assertEqual(attResult.body.verified, true, "synthetic attestation verifies");
  assertEqual(attResult.body.payloadDigestMatched, true, "attestation digest matches");

  const tamperedAtt = JSON.parse(JSON.stringify(attestationEnvelope));
  tamperedAtt.attestation.summary.inSyncChecks = 0;
  const tamperedAttResult = runCliJson(["verify-attestation", "--file", writeTmp(tamperedAtt), "--json"]);
  assertEqual(tamperedAttResult.body.verified, false, "tampered attestation payload fails");

  // A wrong signature on an otherwise-valid attestation must also fail (signature
  // path is enforced for attestations, not just payload tampering).
  const tamperedAttSig = JSON.parse(JSON.stringify(attestationEnvelope));
  tamperedAttSig.signature = signed.signature; // valid Ed25519 sig over a different payload
  const tamperedAttSigResult = runCliJson(["verify-attestation", "--file", writeTmp(tamperedAttSig), "--json"]);
  assertEqual(tamperedAttSigResult.body.verified, false, "attestation with a wrong signature fails");
  assertEqual(
    tamperedAttSigResult.body.signatureCryptographicallyValid,
    false,
    "attestation wrong-signature is not cryptographically valid"
  );

  // --digest is rejected for verify-attestation (no committed attestation store).
  const attDigest = spawnSync(process.execPath, [CLI, "verify-attestation", "--digest", "x"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(attDigest.status !== 0, true, "verify-attestation rejects --digest");

  // ---- 9. verifyEnvelope unit: missing payload is a clean failure, not a throw ----
  const missing = verifyEnvelope({
    payload: undefined,
    signature: "x",
    issuerKeyId: ACTIVE_DEV_ISSUER_KEY_ID,
    registry
  });
  assertEqual(missing.verified, false, "missing payload fails cleanly");
  assertEqual(missing.reason, "missing-signed-payload", "missing payload reason surfaced");

  // ---- 10. Dependency-free guarantee: only node: builtins, no @/ or typescript ----
  const cliSource = readText("scripts/nocks-verify.mjs");
  const importSpecifiers = [...cliSource.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  assertEqual(importSpecifiers.length > 0, true, "CLI has imports to check");
  for (const specifier of importSpecifiers) {
    assertEqual(
      specifier.startsWith("node:"),
      true,
      `CLI imports only node: builtins (offending: ${specifier})`
    );
  }
  assertEqual(/@\//.test(cliSource), false, "CLI has no @/ alias imports");
  assertEqual(/typescript/.test(cliSource), false, "CLI does not depend on typescript");

  // ---- 11. help exits 0 ----
  const help = spawnSync(process.execPath, [CLI, "help"], { cwd: process.cwd(), encoding: "utf8" });
  assertEqual(help.status, 0, "help exits 0");
  assertIncludes(help.stdout, "verify-badge", "help lists verify-badge");

  // ---- 12. package.json wiring ----
  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nocks-verify-cli"],
    "node scripts/test-nocks-verify-cli.mjs",
    "package test script wired"
  );
  assertEqual(
    packageJson.scripts["verify:portable"],
    "node scripts/nocks-verify.mjs",
    "package verify:portable script wired"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nocks-verify-cli",
    "full test chain includes the CLI test"
  );
  assertEqual(
    packageJson.bin["nocks-verify"],
    "./scripts/nocks-verify.mjs",
    "bin entry exposes nocks-verify"
  );

  // ---- 13. docs document the offline flow ----
  const docs = readText("docs/trust-signals.md");
  assertIncludes(docs, "verify:portable", "docs document the portable verify command");
  assertIncludes(docs, "verify-badge", "docs document the verify-badge subcommand");

  console.log("test-nocks-verify-cli: OK");
}

// --- helpers ---

function writeTmp(value) {
  if (!tmpDir) {
    tmpDir = mkdtempSync(path.join(tmpdir(), "nocks-verify-"));
  }
  // Monotonic names so two distinct artifacts can never collide and overwrite
  // each other's fixture between a write and the spawn that reads it.
  tmpCounter += 1;
  const file = path.join(tmpDir, `artifact-${tmpCounter}.json`);
  writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function runCliJson(args) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  let body;
  try {
    body = JSON.parse(result.stdout);
  } catch {
    throw new Error(`CLI did not emit JSON for ${args.join(" ")}: ${result.stdout}${result.stderr}`);
  }
  // Do NOT coerce a null status (signal/crash) to 0 — a crashed verifier must
  // not read as a passing exit.
  return { code: result.status, body };
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
