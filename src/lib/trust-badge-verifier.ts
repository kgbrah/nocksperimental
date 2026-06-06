import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";
import {
  badgeEmbedForId,
  badgeIssuanceReceipts,
  resolvedBadgeForId
} from "@/lib/trust-signals";
import { verifyBadgeSignature } from "@/lib/trust-badge-crypto";
import { issuerKeyForId, publicKeyForKeyId } from "@/lib/trust-issuer-keys";

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

  const issuerKey = issuance ? issuerKeyForId(issuance.issuerKeyId) : undefined;
  const publicKeySpki = issuance ? publicKeyForKeyId(issuance.issuerKeyId) : undefined;

  const payloadDigestMatched = payloadDigest ? issuance?.payloadDigest === payloadDigest : Boolean(issuance);
  const signatureMatched = signature ? issuance?.signature === signature : true;
  const issuerKeyMatched = issuerKeyId ? issuance?.issuerKeyId === issuerKeyId : true;
  const issuerKeyResolved = Boolean(publicKeySpki);
  const issuerKeyActive = issuerKey?.status === "active";
  const signatureCryptographicallyValid = Boolean(
    issuance &&
      publicKeySpki &&
      verifyBadgeSignature({
        payload: issuance.signedPayload,
        signature: issuance.signature,
        publicKeySpkiBase64: publicKeySpki
      })
  );
  const activeVerifiedStatus =
    badge?.currentStatus === "verified" && issuance?.verification.status === "valid";
  const freshness = badge?.freshness ?? "unknown";
  const staleWarning = freshness === "stale";

  const exactIssuanceMatch = Boolean(
    badge &&
      issuance &&
      payloadDigestMatched &&
      signatureMatched &&
      issuerKeyMatched &&
      signatureCryptographicallyValid &&
      activeVerifiedStatus &&
      !badge.isRevoked
  );

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/badges/verify`,
    verified: exactIssuanceMatch,
    freshness,
    staleWarning,
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
      issuerKeyResolved,
      issuerKeyActive,
      signatureCryptographicallyValid,
      activeVerifiedStatus,
      notRevoked: badge ? !badge.isRevoked : false,
      upstreamFresh: freshness === "fresh",
      publicEmbedAvailable: Boolean(embed),
      exactIssuanceMatch
    },
    match: exactIssuanceMatch && badge && issuance
      ? {
          badgeId: badge.id,
          label: badge.label,
          kind: badge.kind,
          currentStatus: badge.currentStatus,
          freshness,
          reportSlug: badge.reportSlug,
          fixtureId: badge.fixtureId,
          reportHash: badge.evidence.reportHash,
          snapshotRoot: badge.evidence.snapshotRoot,
          sourceAnchor: badge.sourceAnchor,
          payloadDigest: issuance.payloadDigest,
          signature: issuance.signature,
          issuerKeyId: issuance.issuerKeyId,
          verificationStatus: issuance.verification.status,
          links: {
            verification: `${registryCanonicalBaseUrl}/api/trust/badges/${badge.id}/verification`,
            embed: `${registryCanonicalBaseUrl}/api/trust/badges/${badge.id}/embed`,
            issuerKeys: `${registryCanonicalBaseUrl}/api/trust/keys`,
            reportProvenance: `${registryCanonicalBaseUrl}/api/reports/generated/${badge.reportSlug}/provenance`
          }
        }
      : null
  };
}
