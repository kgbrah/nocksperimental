import { registryCanonicalBaseUrl } from "@/lib/registry-manifest";
import { badgeEmbedForId, resolvedBadgeForId } from "@/lib/trust-signals";

export function createBadgeEmbedBundle(badgeId: string) {
  const badge = resolvedBadgeForId(badgeId);

  if (!badge) {
    return { status: "missing" as const, badge: null, bundle: null };
  }

  const embed = badgeEmbedForId(badgeId);

  if (!embed || badge.currentStatus !== "verified" || badge.issuance?.verification.status !== "valid") {
    return { status: "not_embeddable" as const, badge, bundle: null };
  }

  return {
    status: "embeddable" as const,
    badge,
    bundle: {
      version: "v0",
      badgeId,
      canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/badges/${badgeId}/embed`,
      display: {
        label: badge.label,
        status: badge.currentStatus,
        kind: badge.kind,
        issuedAt: badge.issuedAt,
        expiresAt: badge.expiresAt,
        issuer: badge.issuer
      },
      verification: {
        status: badge.issuance.verification.status,
        algorithm: badge.issuance.verification.algorithm,
        checkedAt: badge.issuance.verification.checkedAt,
        issuanceDigest: badge.issuance.payloadDigest,
        issuerKeyId: badge.issuance.issuerKeyId
      },
      evidence: {
        reportSlug: badge.reportSlug,
        fixtureId: badge.fixtureId,
        reportHash: badge.evidence.reportHash,
        snapshotRoot: badge.evidence.snapshotRoot,
        invariantPacks: badge.evidence.invariantPacks
      },
      links: {
        badge: `${registryCanonicalBaseUrl}/api/trust/badges/${badgeId}`,
        verification: `${registryCanonicalBaseUrl}/api/trust/badges/${badgeId}/verification`,
        reportProvenance: `${registryCanonicalBaseUrl}/api/reports/generated/${badge.reportSlug}/provenance`
      },
      embed
    }
  };
}
