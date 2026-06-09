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
  const badgeBundle = loadTypeScriptModule("src/lib/trust-badge-verification.ts")
    .createBadgeVerificationBundle("badge-payment-flow-verified");
  const { GET } = loadTypeScriptModule("src/app/api/trust/badges/verify/route.ts");

  const verified = await GET(createRequest({
    badgeId: badgeBundle.badgeId,
    payloadDigest: badgeBundle.issuance.payloadDigest,
    signature: badgeBundle.issuance.signature,
    issuerKeyId: badgeBundle.issuance.issuerKeyId
  }));
  const verifiedBody = await verified.json();

  assertEqual(verified.status, 200, "verified status code");
  assertEqual(verifiedBody.version, "v0", "verify version");
  assertEqual(verifiedBody.subject, "nocksperimental.com", "verify subject");
  assertEqual(verifiedBody.canonicalUrl, "https://nocksperimental.com/api/trust/badges/verify", "canonical URL");
  assertEqual(verifiedBody.verified, true, "matching badge verifies");
  assertEqual(verifiedBody.checks.badgeFound, true, "badge found check");
  assertEqual(verifiedBody.checks.issuanceFound, true, "issuance found check");
  assertEqual(verifiedBody.checks.payloadDigestMatched, true, "payload digest match check");
  assertEqual(verifiedBody.checks.signatureMatched, true, "signature match check");
  assertEqual(verifiedBody.checks.issuerKeyMatched, true, "issuer key match check");
  assertEqual(verifiedBody.checks.activeVerifiedStatus, true, "active verified status check");
  assertEqual(verifiedBody.checks.payloadBoundToBadge, true, "signed payload bound to badge check");
  assertEqual(verifiedBody.checks.notRevoked, true, "not revoked check");
  assertEqual(verifiedBody.checks.publicEmbedAvailable, true, "public embed check");
  assertEqual(verifiedBody.checks.exactIssuanceMatch, true, "exact issuance match check");
  assertEqual(verifiedBody.match.badgeId, "badge-payment-flow-verified", "matched badge id");
  assertEqual(verifiedBody.match.payloadDigest, badgeBundle.issuance.payloadDigest, "matched payload digest");
  assertEqual(verifiedBody.match.signature, badgeBundle.issuance.signature, "matched signature");
  assertEqual(verifiedBody.match.links.verification, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/verification", "verification link");
  assertEqual(verifiedBody.match.links.embed, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/embed", "embed link");
  assertEqual(verifiedBody.match.links.reportProvenance, "https://nocksperimental.com/api/reports/generated/payment-flow/provenance", "provenance link");
  // Pillar 2: real Ed25519 verification + upstream freshness.
  assertEqual(verifiedBody.checks.signatureCryptographicallyValid, true, "cryptographic signature valid");
  assertEqual(verifiedBody.checks.issuerKeyResolved, true, "issuer key resolved");
  assertEqual(verifiedBody.checks.upstreamFresh, true, "verified badge is upstream-fresh");
  assertEqual(verifiedBody.freshness, "fresh", "verified badge freshness");
  assertEqual(verifiedBody.staleWarning, false, "verified badge no stale warning");
  assertEqual(verifiedBody.match.links.issuerKeys, "https://nocksperimental.com/api/trust/keys", "issuer key discovery link");
  assertEqual(verifiedBody.match.sourceAnchor.commit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "matched source anchor commit");

  // Cross-badge replay: a valid signature from another badge must not verify here.
  const solverBundle = loadTypeScriptModule("src/lib/trust-badge-verification.ts")
    .createBadgeVerificationBundle("badge-solver-a-qualified");
  const replay = await GET(createRequest({
    badgeId: "badge-payment-flow-verified",
    signature: solverBundle.issuance.signature
  }));
  const replayBody = await replay.json();
  assertEqual(replayBody.verified, false, "cross-badge replay does not verify");
  assertEqual(replayBody.checks.signatureMatched, false, "cross-badge replay signature mismatch");

  // Revoked + stale legacy badge: cryptographically valid signature, but not verified.
  const legacyVerify = await GET(createRequest({ badgeId: "badge-payment-flow-legacy" }));
  const legacyBody = await legacyVerify.json();
  assertEqual(legacyBody.verified, false, "revoked legacy badge not verified");
  assertEqual(legacyBody.checks.notRevoked, false, "legacy badge is revoked");
  assertEqual(legacyBody.checks.signatureCryptographicallyValid, true, "legacy signature still cryptographically valid");
  assertEqual(legacyBody.freshness, "stale", "legacy badge is stale");
  assertEqual(legacyBody.staleWarning, true, "legacy badge raises stale warning");

  const badSignature = await GET(createRequest({
    badgeId: badgeBundle.badgeId,
    payloadDigest: badgeBundle.issuance.payloadDigest,
    signature: "sig:wrong"
  }));
  const badSignatureBody = await badSignature.json();

  assertEqual(badSignature.status, 200, "bad signature status code");
  assertEqual(badSignatureBody.verified, false, "bad signature does not verify");
  assertEqual(badSignatureBody.checks.badgeFound, true, "bad signature badge found");
  assertEqual(badSignatureBody.checks.payloadDigestMatched, true, "bad signature digest matched");
  assertEqual(badSignatureBody.checks.signatureMatched, false, "bad signature check");
  assertEqual(badSignatureBody.checks.exactIssuanceMatch, false, "bad signature exact match");
  assertEqual(badSignatureBody.match, null, "bad signature match");

  // COR-B: tampering a live badge field that the signature does not re-cover must
  // fail verification via payloadBoundToBadge, even though the (untouched) signed
  // payload copy still verifies cryptographically.
  await assertTamperedBadgeFailsBinding();

  const missingIdentifier = await GET(createRequest({ signature: badgeBundle.issuance.signature }));
  const missingIdentifierBody = await missingIdentifier.json();

  assertEqual(missingIdentifier.status, 400, "missing identifier status");
  assertEqual(missingIdentifierBody.error, "Missing badgeId or payloadDigest query parameter", "missing identifier error");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/trust/badges/verify"]?.get?.summary,
    "Badge issuance verifier",
    "OpenAPI badge verifier path"
  );
}

async function assertTamperedBadgeFailsBinding() {
  const { verifyTrustBadgeIssuance } = loadTypeScriptModule("src/lib/trust-badge-verifier.ts");
  const { resolvedBadgeForId } = loadTypeScriptModule("src/lib/trust-signals.ts");

  const badge = resolvedBadgeForId("badge-payment-flow-verified");
  const issuance = badge.issuance;

  // Baseline: untampered badge verifies and is bound.
  const baseline = verifyTrustBadgeIssuance({
    badgeId: badge.id,
    payloadDigest: issuance.payloadDigest,
    signature: issuance.signature,
    issuerKeyId: issuance.issuerKeyId
  });
  assertEqual(baseline.verified, true, "baseline tamper-check badge verifies");
  assertEqual(baseline.checks.payloadBoundToBadge, true, "baseline tamper-check bound to badge");

  // Tamper the live badge field WITHOUT re-signing (signedPayload copy untouched).
  const originalReportHash = badge.evidence.reportHash;
  badge.evidence.reportHash = "sha256:tampered-not-resigned";

  try {
    const tampered = verifyTrustBadgeIssuance({
      badgeId: badge.id,
      payloadDigest: issuance.payloadDigest,
      signature: issuance.signature,
      issuerKeyId: issuance.issuerKeyId
    });

    assertEqual(tampered.verified, false, "tampered badge does not verify");
    assertEqual(tampered.checks.payloadBoundToBadge, false, "tampered badge not bound to signed payload");
    // The signature still covers the untouched signedPayload copy.
    assertEqual(
      tampered.checks.signatureCryptographicallyValid,
      true,
      "tampered badge signature still cryptographically valid over signed copy"
    );
  } finally {
    badge.evidence.reportHash = originalReportHash;
  }

  // baseDeploymentHash binding (live-base app-report parity with kernelHash): a badge that claims a
  // deployed-contract identity hash the signed payload does NOT carry must fail payloadBoundToBadge,
  // so an unsigned/forged deployment-identity claim cannot ride on an otherwise-valid signature.
  try {
    badge.evidence.baseDeploymentHash = "sha256:unsigned-base-deployment-hash";
    const tampered = verifyTrustBadgeIssuance({
      badgeId: badge.id,
      payloadDigest: issuance.payloadDigest,
      signature: issuance.signature,
      issuerKeyId: issuance.issuerKeyId
    });
    assertEqual(tampered.checks.payloadBoundToBadge, false, "unsigned baseDeploymentHash not bound to signed payload");
    assertEqual(tampered.verified, false, "badge with an unsigned baseDeploymentHash does not verify");
    assertEqual(tampered.checks.signatureCryptographicallyValid, true, "signature still valid over the untouched signed copy");
  } finally {
    delete badge.evidence.baseDeploymentHash;
  }
}

function createRequest(params) {
  const url = new URL("https://nocksperimental.com/api/trust/badges/verify");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return new Request(url);
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
