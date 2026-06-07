#!/usr/bin/env node

// nocks-verify — standalone, dependency-free offline verifier for Nocksperimental
// trust artifacts (signed badge issuance receipts and drift-status attestations).
//
// PORTABLE TRUST: this script imports ONLY node: builtins. It re-implements the
// canonicalization, digest, and Ed25519 verification primitives from
// src/lib/trust-badge-crypto.ts byte-for-byte, and resolves issuer public keys
// from the committed root-of-trust registry (src/data/trust-issuer-keys.json).
// An external NockApp developer can therefore verify a badge/attestation entirely
// offline — without running the repo toolchain (no TypeScript) and without
// trusting (or contacting) the nocksperimental.com host.
//
// scripts/test-nocks-verify-cli.mjs cross-checks the ported primitives against
// the TypeScript source on every run, so any canonicalization drift fails CI.
//
// It verifies signature + payload-digest + issuer-key resolution only. Revocation
// and live freshness are out-of-band (the hosted registry / API), by design.

import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve the repo root from this script's location so the committed
// root-of-trust data loads regardless of the caller's cwd.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_KEYS_PATH = path.join(REPO_ROOT, "src/data/trust-issuer-keys.json");
const SIGNALS_PATH = path.join(REPO_ROOT, "src/data/trust-signals.json");

// ---------------------------------------------------------------------------
// Pure crypto primitives — ported VERBATIM from src/lib/trust-badge-crypto.ts.
// Keep these byte-identical; the companion test asserts parity with the TS source.
// ---------------------------------------------------------------------------

export function canonicalizeBadgePayload(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeBadgePayload(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      // Drop undefined-valued keys, mirroring JSON.stringify (which omits them),
      // so an unset optional signed field canonicalizes identically to omitting
      // it. null stays distinct.
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeBadgePayload(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function badgePayloadDigest(payload) {
  return `sha256:${createHash("sha256").update(canonicalizeBadgePayload(payload)).digest("hex")}`;
}

export function verifyBadgeSignature({ payload, signature, publicKeySpkiBase64 }) {
  if (!signature || !publicKeySpkiBase64) {
    return false;
  }

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeySpkiBase64, "base64"),
      format: "der",
      type: "spki"
    });
    const message = Buffer.from(canonicalizeBadgePayload(payload), "utf8");

    return verify(null, message, publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Root-of-trust data loading + issuer-key resolution.
// ---------------------------------------------------------------------------

export function loadIssuerKeyRegistry(keysPath) {
  // A consumer can pin a production-exported registry via --keys; otherwise the
  // committed registry (dev keys) is used verbatim.
  const resolved = keysPath ? path.resolve(process.cwd(), keysPath) : DEFAULT_KEYS_PATH;
  return JSON.parse(readFileSync(resolved, "utf8"));
}

export function resolveIssuerKey(registry, keyId) {
  const keys = Array.isArray(registry?.issuerKeys) ? registry.issuerKeys : [];
  // Resolve retired keys too, so historical badges keep verifying after rotation.
  return keys.find((key) => key.keyId === keyId) ?? null;
}

export function loadCommittedReceipts() {
  const signals = JSON.parse(readFileSync(SIGNALS_PATH, "utf8"));
  return Array.isArray(signals?.badgeIssuanceReceipts) ? signals.badgeIssuanceReceipts : [];
}

// ---------------------------------------------------------------------------
// Core verification — pure: takes the resolved registry as input.
// Verifies an envelope { payload, signature, payloadDigest?, issuerKeyId }.
// ---------------------------------------------------------------------------

export function verifyEnvelope({ payload, signature, payloadDigest, issuerKeyId, registry }) {
  if (payload === undefined || payload === null) {
    return {
      verified: false,
      issuerKeyId: issuerKeyId ?? null,
      issuerKeyResolved: false,
      issuerKeyStatus: null,
      recomputedDigest: null,
      stampedDigest: payloadDigest ?? null,
      payloadDigestMatched: false,
      signatureCryptographicallyValid: false,
      reason: "missing-signed-payload"
    };
  }

  const issuerKey = resolveIssuerKey(registry, issuerKeyId);
  const issuerKeyResolved = Boolean(issuerKey);
  const recomputedDigest = badgePayloadDigest(payload);
  // A null stamped digest (envelope without payloadDigest) is allowed; only a
  // present-but-mismatched digest fails.
  const payloadDigestMatched = payloadDigest === undefined ? null : recomputedDigest === payloadDigest;
  const signatureCryptographicallyValid = issuerKeyResolved
    ? verifyBadgeSignature({ payload, signature, publicKeySpkiBase64: issuerKey.publicKeySpki })
    : false;
  const verified =
    issuerKeyResolved && signatureCryptographicallyValid && payloadDigestMatched !== false;

  return {
    verified,
    issuerKeyId: issuerKeyId ?? null,
    issuerKeyResolved,
    issuerKeyStatus: issuerKey?.status ?? null,
    recomputedDigest,
    stampedDigest: payloadDigest ?? null,
    payloadDigestMatched,
    signatureCryptographicallyValid
  };
}

// ---------------------------------------------------------------------------
// CLI plumbing.
// ---------------------------------------------------------------------------

function parseFlags(args) {
  const opts = { file: undefined, digest: undefined, keys: undefined, json: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      opts.json = true;
      continue;
    }

    if (arg === "--file" || arg === "--digest" || arg === "--keys") {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      opts[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return opts;
}

function readStdin() {
  // fd 0; throws on an interactive TTY with no piped input.
  return readFileSync(0, "utf8");
}

function loadArtifact(opts, { allowDigestLookup }) {
  if (opts.file) {
    return JSON.parse(readFileSync(path.resolve(process.cwd(), opts.file), "utf8"));
  }

  if (opts.digest) {
    if (!allowDigestLookup) {
      throw new Error("--digest lookup is only supported for verify-badge");
    }
    const receipt = loadCommittedReceipts().find((entry) => entry.payloadDigest === opts.digest);
    if (!receipt) {
      throw new Error(`No committed badge issuance receipt found with payloadDigest ${opts.digest}`);
    }
    return receipt;
  }

  const raw = readStdin();
  if (!raw.trim()) {
    throw new Error("No artifact provided. Pass --file <path>, --digest <digest>, or pipe JSON via stdin.");
  }
  return JSON.parse(raw);
}

function emit(result, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const lines = [
    `nocks-verify: ${result.kind}${result.subject ? ` ${result.subject}` : ""}`,
    `  verified:                        ${result.verified ? "PASS" : "FAIL"}`,
    `  issuerKeyId:                     ${result.issuerKeyId ?? "(none)"}`,
    `  issuerKeyResolved:               ${result.issuerKeyResolved}`,
    `  issuerKeyStatus:                 ${result.issuerKeyStatus ?? "(unresolved)"}`,
    `  payloadDigestMatched:            ${result.payloadDigestMatched}`,
    `  signatureCryptographicallyValid: ${result.signatureCryptographicallyValid}`
  ];
  if (result.reason) {
    lines.push(`  reason:                          ${result.reason}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

// verify-badge and verify-attestation share one verification core; they differ
// only in which field carries the signed payload, whether --digest receipt
// lookup is allowed (only badges have a committed receipt store), and which
// fields name the subject for display.
const ARTIFACT_KINDS = {
  "verify-badge": {
    kind: "badge",
    payloadField: "signedPayload",
    allowDigestLookup: true,
    subjectFields: ["badgeId", "id"]
  },
  "verify-attestation": {
    kind: "attestation",
    payloadField: "attestation",
    allowDigestLookup: false,
    subjectFields: ["subject", "canonicalUrl"]
  }
};

function runVerify(opts, spec) {
  const registry = loadIssuerKeyRegistry(opts.keys);
  const artifact = loadArtifact(opts, { allowDigestLookup: spec.allowDigestLookup });
  const result = verifyEnvelope({
    payload: artifact[spec.payloadField],
    signature: artifact.signature,
    payloadDigest: artifact.payloadDigest,
    issuerKeyId: artifact.issuerKeyId,
    registry
  });
  const subject = spec.subjectFields.map((field) => artifact[field]).find((value) => value != null) ?? null;
  emit({ kind: spec.kind, subject, ...result }, opts.json);
  return result.verified ? 0 : 1;
}

const HELP = `nocks-verify — offline verifier for Nocksperimental trust artifacts

Usage:
  nocks-verify verify-badge        [--file <receipt.json> | --digest <payloadDigest> | <stdin>] [--keys <registry.json>] [--json]
  nocks-verify verify-attestation  [--file <attestation.json> | <stdin>]                        [--keys <registry.json>] [--json]
  nocks-verify help

Verifies the Ed25519 signature and payload digest of a badge issuance receipt or
a drift-status attestation against the committed issuer-key registry. Runs fully
offline with no dependencies and never contacts nocksperimental.com.

Options:
  --file <path>     Read the artifact JSON from a file.
  --digest <d>      (verify-badge only) Look up a committed badge receipt by its payloadDigest.
  --keys <path>     Use a pinned/exported issuer-key registry instead of the committed one
                    (needed only for production keys signed with NOCKS_BADGE_ISSUER_SIGNING_SEED).
  --json            Emit the structured result as JSON.

Exit code 0 when verified, non-zero otherwise. Revocation and live freshness are
out-of-band (the hosted registry / API) and are NOT checked here.`;

export function main(argv) {
  const args = argv.slice(2);
  const sub = args[0];

  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const spec = ARTIFACT_KINDS[sub];
  if (!spec) {
    process.stderr.write(`Unknown subcommand: ${sub}\n${HELP}\n`);
    return 2;
  }

  let opts;
  try {
    opts = parseFlags(args.slice(1));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  try {
    return runVerify(opts, spec);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

// True when this file is the process entry point (not imported). Compares
// import.meta.url against the invoked path AND its realpath, so it holds whether
// invoked as `node scripts/nocks-verify.mjs`, via the `nocks-verify` bin symlink
// (argv[1] is the .bin symlink while import.meta.url is the resolved real path),
// or under --preserve-symlinks. Stays false when imported by the test.
function isMainModule() {
  const argv1 = process.argv[1];
  if (!argv1) {
    return false;
  }

  const candidates = new Set([argv1]);
  try {
    candidates.add(realpathSync(argv1));
  } catch {
    // argv1 may not resolve; the raw candidate above still covers direct runs.
  }

  for (const candidate of candidates) {
    if (import.meta.url === pathToFileURL(candidate).href) {
      return true;
    }
  }

  return false;
}

// Only execute the CLI when run directly, so the test can import the pure helpers.
if (isMainModule()) {
  process.exitCode = main(process.argv);
}
