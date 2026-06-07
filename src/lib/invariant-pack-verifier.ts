import { invariantPackForId, type InvariantPackSummary } from "@/lib/invariant-packs";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { badgePayloadDigest } from "@/lib/trust-badge-crypto";

export type InvariantPackVerificationInput = {
  packId?: string | null;
  packHash?: string | null;
};

export function invariantPackHash(pack: InvariantPackSummary): string {
  // Canonical digest over the identity-bearing fields of the pack summary.
  return badgePayloadDigest({
    id: pack.id,
    name: pack.name,
    version: pack.version,
    domain: pack.domain,
    upstreamBasis: pack.upstreamBasis,
    sourceAnchors: pack.sourceAnchors,
    invariantIds: pack.invariantIds
  });
}

export function verifyInvariantPack({ packId, packHash }: InvariantPackVerificationInput) {
  const normalizedId = normalize(packId);
  const normalizedHash = normalize(packHash);
  const pack = normalizedId ? invariantPackForId(normalizedId) : undefined;
  const computedHash = pack ? invariantPackHash(pack) : null;

  const checks = {
    packFound: Boolean(pack),
    upstreamBasisPinned: Boolean(pack?.upstreamBasis?.commit),
    packHashMatched: Boolean(pack && normalizedHash && computedHash === normalizedHash)
  };
  const verified = checks.packFound && checks.upstreamBasisPinned && (normalizedHash ? checks.packHashMatched : true);

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/invariants/packs/verify`,
    verified,
    query: {
      packId: normalizedId,
      packHash: normalizedHash
    },
    checks,
    pack: pack
      ? {
          id: pack.id,
          name: pack.name,
          version: pack.version,
          domain: pack.domain,
          upstreamBasis: pack.upstreamBasis,
          invariantIds: pack.invariantIds,
          invariantCount: pack.invariantCount,
          packHash: computedHash
        }
      : null,
    links: {
      invariants: `${registryCanonicalBaseUrl}/api/invariants`,
      driftStatus: `${registryCanonicalBaseUrl}/api/nockchain/drift-status`
    }
  };
}

function normalize(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
