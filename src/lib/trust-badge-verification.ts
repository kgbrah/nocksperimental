import { registryCanonicalBaseUrl } from "@/lib/registry-manifest";
import { badgeEmbedForId, resolvedBadgeForId } from "@/lib/trust-signals";

export function createBadgeVerificationBundle(badgeId: string) {
  const badge = resolvedBadgeForId(badgeId);

  if (!badge) {
    return null;
  }

  const replacement = badge.revocation?.replacementBadgeId
    ? resolvedBadgeForId(badge.revocation.replacementBadgeId)
    : undefined;
  const embed = badgeEmbedForId(badgeId);

  return {
    version: "v0",
    badgeId,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/badges/${badgeId}/verification`,
    currentStatus: badge.currentStatus,
    isRevoked: badge.isRevoked,
    checks: {
      badgeFound: true,
      issuanceFound: Boolean(badge.issuance),
      publicEmbedAvailable: Boolean(embed)
    },
    badge,
    issuance: badge.issuance ?? null,
    evidence: badge.evidence,
    revocation: badge.revocation ?? null,
    replacement: replacement
      ? {
          badgeId: replacement.id,
          currentStatus: replacement.currentStatus,
          url: `${registryCanonicalBaseUrl}/api/trust/badges/${replacement.id}/verification`
        }
      : null,
    embed: embed ?? null
  };
}
