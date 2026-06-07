import { createNockchainDriftStatus } from "@/lib/nockchain-drift-status";
import { activeIssuerKey } from "@/lib/trust-issuer-keys";
import { badgeIssuerSigningSeed, signBadgePayload } from "@/lib/trust-badge-crypto";
import { registryCanonicalBaseUrl, registryServiceName, registrySubject } from "@/lib/registry-manifest";

// Premium, signed attestation over the current upstream drift status. Composes
// Pillar 1 (drift-status snapshot) with Pillar 2 (Ed25519 issuer signing): the
// attestation is offline-verifiable against the published issuer public key, so
// a consumer can prove "as of observedAt, Nocksperimental's drift status was X".

export function createNockchainDriftAttestation() {
  const status = createNockchainDriftStatus();
  const key = activeIssuerKey();

  const attestation = {
    service: registryServiceName,
    subject: registrySubject,
    status: status.status,
    observedAt: status.observedAt,
    generatedAt: status.generatedAt,
    summary: status.summary,
    checks: status.checks.map((check) => ({ id: check.id, status: check.status }))
  };

  const seed = badgeIssuerSigningSeed(key?.keyId);
  const signed = signBadgePayload(attestation, seed);

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/drift-status/attestation`,
    attestation,
    signature: signed.signature,
    payloadDigest: signed.payloadDigest,
    algorithm: signed.algorithm,
    issuerKeyId: key?.keyId ?? null,
    freshness: status.freshness,
    links: {
      driftStatus: `${registryCanonicalBaseUrl}/api/nockchain/drift-status`,
      issuerKeys: `${registryCanonicalBaseUrl}/api/trust/keys`
    }
  };
}
