import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";
import {
  badgeEmbedForId,
  badgeIssuanceReceipts,
  resolvedBadgeForId
} from "@/lib/trust-signals";

type BadgeVerificationInput = {
  badgeId?: string | null;
  payloadDigest?: string | null;
  signature?: string | null;
  issuerKeyId?: string | null;
};

export function verifyTrustBadgeIssuance({
  badgeId,
  payloadDigest,
  signature,
  issuerKeyId
}: BadgeVerificationInput) {
  const issuanceByDigest = payloadDigest
    ? badgeIssuanceReceipts.find((issuance) => issuance.payloadDigest === payloadDigest)
    : undefined;
  const candidateBadgeId = badgeId ?? issuanceByDigest?.badgeId ?? "";
  const badge = candidateBadgeId ? resolvedBadgeForId(candidateBadgeId) : undefined;
  const issuance = badge?.issuance ?? issuanceByDigest;
  const embed = badge ? badgeEmbedForId(badge.id) : undefined;
  const payloadDigestMatched = payloadDigest ? issuance?.payloadDigest === payloadDigest : Boolean(issuance);
  const signatureMatched = signature ? issuance?.signature === signature : true;
  const issuerKeyMatched = issuerKeyId ? issuance?.issuerKeyId === issuerKeyId : true;
  const activeVerifiedStatus = badge?.currentStatus === "verified" && issuance?.verification.status === "valid";
  const exactIssuanceMatch = Boolean(
    badge &&
      issuance &&
      payloadDigestMatched &&
      signatureMatched &&
      issuerKeyMatched &&
      activeVerifiedStatus &&
      !badge.isRevoked
  );

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/badges/verify`,
    verified: exactIssuanceMatch,
    query: {
      badgeId: badgeId ?? null,
      payloadDigest: payloadDigest ?? null,
      signature: signature ?? null,
      issuerKeyId: issuerKeyId ?? null
    },
    checks: {
      badgeFound: Boolean(badge),
      issuanceFound: Boolean(issuance),
      payloadDigestMatched,
      signatureMatched,
      issuerKeyMatched,
      activeVerifiedStatus,
      notRevoked: badge ? !badge.isRevoked : false,
      publicEmbedAvailable: Boolean(embed),
      exactIssuanceMatch
    },
    match: exactIssuanceMatch && badge && issuance
      ? {
          badgeId: badge.id,
          label: badge.label,
          kind: badge.kind,
          currentStatus: badge.currentStatus,
          reportSlug: badge.reportSlug,
          fixtureId: badge.fixtureId,
          reportHash: badge.evidence.reportHash,
          snapshotRoot: badge.evidence.snapshotRoot,
          payloadDigest: issuance.payloadDigest,
          signature: issuance.signature,
          issuerKeyId: issuance.issuerKeyId,
          verificationStatus: issuance.verification.status,
          links: {
            verification: `${registryCanonicalBaseUrl}/api/trust/badges/${badge.id}/verification`,
            embed: `${registryCanonicalBaseUrl}/api/trust/badges/${badge.id}/embed`,
            reportProvenance: `${registryCanonicalBaseUrl}/api/reports/generated/${badge.reportSlug}/provenance`
          }
        }
      : null
  };
}
