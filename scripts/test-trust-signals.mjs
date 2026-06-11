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
    badgeEmbedForId,
    badgeEmbeds,
    badgeIssuanceReceipts,
    badgeRevocations,
    computeBenchmarkProfiles,
    issuanceForBadgeId,
    resolvedBadges,
    resolvedTrustConsumers,
    resolvedTrustConsumersForCategory,
    revocationForBadgeId,
    solverScorecards,
    tokenCompatibilityReports,
    verifiedBadges
  } = loadTypeScriptModule("src/lib/trust-signals.ts");
  const { badgePayloadDigest, verifyBadgeSignature } = loadTypeScriptModule(
    "src/lib/trust-badge-crypto.ts"
  );
  const { publicKeyForKeyId } = loadTypeScriptModule("src/lib/trust-issuer-keys.ts");

  assertEqual(badgeIssuanceReceipts.length, 12, "badge issuance receipt count");
  const paymentIssuance = issuanceForBadgeId("badge-payment-flow-verified");
  assertEqual(paymentIssuance.badgeId, "badge-payment-flow-verified", "payment issuance badge id");
  assertEqual(
    paymentIssuance.issuerKeyId,
    "nocksperimental-registry-ed25519-prod-v1",
    "payment issuance key id"
  );
  assertEqual(
    paymentIssuance.payloadDigest,
    badgePayloadDigest(paymentIssuance.signedPayload),
    "payment issuance digest matches canonical signed payload"
  );
  assertEqual(paymentIssuance.verification.status, "valid", "payment issuance verification");
  assertEqual(paymentIssuance.verification.algorithm, "ed25519", "payment issuance algorithm");
  // Real Ed25519 signature must verify against the published issuer public key.
  assertEqual(
    verifyBadgeSignature({
      payload: paymentIssuance.signedPayload,
      signature: paymentIssuance.signature,
      publicKeySpkiBase64: publicKeyForKeyId(paymentIssuance.issuerKeyId)
    }),
    true,
    "payment issuance signature verifies against issuer key"
  );
  assertEqual(
    paymentIssuance.signedPayload.sourceAnchor.commit,
    "33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "payment issuance signed payload pins upstream commit"
  );
  assertEqual(
    paymentIssuance.signedPayload.reportHash,
    "sha256:3a6d6bff59cb624f-payment-flow",
    "payment issuance report hash"
  );
  assertEqual(issuanceForBadgeId("missing-badge"), undefined, "missing issuance receipt");

  assertEqual(badgeRevocations.length, 1, "badge revocation count");
  const legacyRevocation = revocationForBadgeId("badge-payment-flow-legacy");
  assertEqual(legacyRevocation.badgeId, "badge-payment-flow-legacy", "legacy revocation badge id");
  assertEqual(
    legacyRevocation.replacementBadgeId,
    "badge-payment-flow-verified",
    "legacy revocation replacement badge id"
  );
  assertEqual(
    legacyRevocation.reason,
    "Superseded by payment-flow-v0 evidence bundle.",
    "legacy revocation reason"
  );
  assertEqual(legacyRevocation.evidence.snapshotRoot, "3a6d6bff59cb624f", "legacy revocation snapshot root");

  assertEqual(resolvedBadges.length, 12, "resolved badge count");
  const legacyBadge = resolvedBadges.find((badge) => badge.id === "badge-payment-flow-legacy");
  assertEqual(legacyBadge.currentStatus, "revoked", "legacy badge current status");
  assertEqual(legacyBadge.isRevoked, true, "legacy badge revocation flag");
  assertEqual(
    legacyBadge.revocation.replacementBadgeId,
    "badge-payment-flow-verified",
    "legacy badge replacement"
  );

  const activePaymentBadge = resolvedBadges.find((badge) => badge.id === "badge-payment-flow-verified");
  assertEqual(activePaymentBadge.currentStatus, "verified", "active payment badge current status");
  assertEqual(activePaymentBadge.isRevoked, false, "active payment badge revocation flag");
  assertEqual(activePaymentBadge.issuance.payloadDigest, paymentIssuance.payloadDigest, "active payment issuance digest");
  assertEqual(activePaymentBadge.issuance.verification.status, "valid", "active payment issuance status");
  assertEqual(activePaymentBadge.sourceAnchor.commit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "active payment badge anchor commit");
  assertEqual(activePaymentBadge.freshness, "fresh", "active payment badge freshness");
  assertEqual(legacyBadge.freshness, "stale", "legacy badge freshness is stale");

  const legacyIssuance = issuanceForBadgeId("badge-payment-flow-legacy");
  assertEqual(legacyBadge.issuance.payloadDigest, legacyIssuance.payloadDigest, "legacy badge issuance digest");

  assertEqual(resolvedTrustConsumers.length, 4, "resolved consumer count");

  const appConsumer = resolvedTrustConsumersForCategory("app")[0];
  assertEqual(appConsumer.evidenceCount, 1, "app evidence count");
  assertEqual(appConsumer.resolvedUses[0].evidenceLabel, "Payment Flow Verified", "app evidence label");
  assertEqual(appConsumer.resolvedUses[0].evidenceStatus, "verified", "app evidence status");
  assertEqual(appConsumer.resolvedUses[0].badgeId, "badge-payment-flow-verified", "app badge id");
  assertEqual(appConsumer.resolvedUses[0].snapshotRoot, "3a6d6bff59cb624f", "app snapshot root");

  const walletConsumer = resolvedTrustConsumersForCategory("wallet")[0];
  assertEqual(walletConsumer.resolvedUses[0].evidenceLabel, "MOCK token compatibility", "wallet evidence label");
  assertEqual(walletConsumer.resolvedUses[0].evidenceStatus, "compatible", "wallet evidence status");
  assertEqual(walletConsumer.resolvedUses[0].score, 96, "wallet compatibility score");
  assertEqual(walletConsumer.resolvedUses[0].badgeId, "badge-mock-token-compatible", "wallet badge id");
  assertEqual(walletConsumer.resolvedUses[0].snapshotRoot, "cd7cc46d9b8d0f59", "wallet snapshot root");

  const fundConsumer = resolvedTrustConsumersForCategory("fund")[0];
  assertEqual(fundConsumer.evidenceCount, 2, "fund evidence count");
  assertEqual(fundConsumer.resolvedUses[0].evidenceLabel, "Solver A scorecard", "fund scorecard label");
  assertEqual(fundConsumer.resolvedUses[0].evidenceStatus, "qualified", "fund scorecard status");
  assertEqual(fundConsumer.resolvedUses[0].score, 94, "fund scorecard score");
  assertEqual(fundConsumer.resolvedUses[1].evidenceLabel, "Payment Flow Verified", "fund badge label");

  const providerConsumer = resolvedTrustConsumersForCategory("provider")[0];
  assertEqual(providerConsumer.resolvedUses[0].evidenceLabel, "Alpha Compute benchmark", "provider evidence label");
  assertEqual(providerConsumer.resolvedUses[0].evidenceStatus, "qualified", "provider evidence status");
  assertEqual(providerConsumer.resolvedUses[0].score, 91, "provider benchmark score");
  assertEqual(providerConsumer.resolvedUses[0].badgeId, "badge-compute-provider-alpha", "provider badge id");
  assertEqual(providerConsumer.resolvedUses[0].snapshotRoot, "compute-alpha-jobclass-root", "provider snapshot root");

  assertEqual(badgeEmbeds.length, 11, "badge embed count");
  assertEqual(badgeEmbedForId("badge-payment-flow-legacy"), undefined, "revoked badge embed");
  const paymentEmbed = badgeEmbedForId("badge-payment-flow-verified");
  assertEqual(paymentEmbed.badgeId, "badge-payment-flow-verified", "payment embed badge id");
  assertEqual(paymentEmbed.label, "Payment Flow Verified", "payment embed label");
  assertEqual(paymentEmbed.status, "verified", "payment embed status");
  assertEqual(
    paymentEmbed.verificationUrl,
    "/trust/badges#badge-payment-flow-verified",
    "payment embed verification url"
  );
  assertEqual(
    paymentEmbed.apiUrl,
    "/api/trust/badges/badge-payment-flow-verified",
    "payment embed api url"
  );
  assertIncludes(
    paymentEmbed.htmlSnippet,
    'data-nocksperimental-badge="badge-payment-flow-verified"',
    "payment embed html badge id"
  );
  assertIncludes(
    paymentEmbed.htmlSnippet,
    'data-snapshot-root="3a6d6bff59cb624f"',
    "payment embed html snapshot root"
  );
  assertIncludes(
    paymentEmbed.htmlSnippet,
    `data-issuance-digest="${paymentIssuance.payloadDigest}"`,
    "payment embed html issuance digest"
  );
  assertIncludes(
    paymentEmbed.htmlSnippet,
    'data-freshness="fresh"',
    "payment embed html freshness"
  );
  assertIncludes(
    paymentEmbed.htmlSnippet,
    'data-issuer-key="nocksperimental-registry-ed25519-prod-v1"',
    "payment embed html issuer key"
  );
  assertIncludes(paymentEmbed.htmlSnippet, "Payment Flow Verified", "payment embed html label");
  assertIncludes(
    paymentEmbed.markdownSnippet,
    "/trust/badges#badge-payment-flow-verified",
    "payment embed markdown url"
  );
  assertEqual(badgeEmbedForId("missing-badge"), undefined, "missing badge embed");

  const labConfig = JSON.parse(readFileSync("nocklab.config.json", "utf8"));
  const configuredReportSlugs = new Set(labConfig.fixtures.map((fixture) => fixture.slug));

  for (const badge of verifiedBadges) {
    // chain-anchored certs have NO lab fixture — their evidence is the chain itself
    // (re-verified at /api/receipts/verify-chain), so they're exempt from the
    // lab-report-slug requirement that lab/model-attested certs must satisfy.
    if (badge.kind === "chain-anchored") continue;
    assertSetHas(configuredReportSlugs, badge.reportSlug, `verified badge report slug ${badge.id}`);
  }

  for (const scorecard of solverScorecards) {
    assertSetHas(configuredReportSlugs, scorecard.reportSlug, `solver scorecard report slug ${scorecard.id}`);
  }

  for (const report of tokenCompatibilityReports) {
    assertSetHas(configuredReportSlugs, report.reportSlug, `token compatibility report slug ${report.id}`);
  }

  for (const profile of computeBenchmarkProfiles) {
    assertSetHas(
      configuredReportSlugs,
      profile.benchmarkReportSlug,
      `compute benchmark report slug ${profile.id}`
    );
  }
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

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertSetHas(set, value, label) {
  if (!set.has(value)) {
    throw new Error(`${label}: expected configured lab report slug ${JSON.stringify(value)}`);
  }
}
