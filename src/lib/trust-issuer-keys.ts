import issuerKeyData from "@/data/trust-issuer-keys.json";
import { issuerEnvKeyOverlay } from "@/lib/trust-badge-crypto";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export type TrustIssuerKeyStatus = "active" | "retired";

export type TrustIssuerKey = {
  keyId: string;
  algorithm: "ed25519";
  publicKeySpki: string;
  validFrom: string;
  validUntil: string | null;
  status: TrustIssuerKeyStatus;
  supersededBy: string | null;
};

export type TrustIssuerKeyRegistry = {
  version: string;
  activeKeyId: string;
  issuerKeys: TrustIssuerKey[];
};

const registry = issuerKeyData as TrustIssuerKeyRegistry;

export const issuerKeys = registry.issuerKeys;

export function issuerKeyForId(keyId: string): TrustIssuerKey | undefined {
  return issuerKeys.find((key) => key.keyId === keyId);
}

export function activeIssuerKey(): TrustIssuerKey | undefined {
  return issuerKeyForId(registry.activeKeyId) ?? issuerKeys.find((key) => key.status === "active");
}

// When a production signing seed is configured (NOCKS_BADGE_ISSUER_SIGNING_SEED),
// overlay the public key it derives onto the committed registry so verifiers can
// resolve the SPKI for the keyId production signatures stamp. In the dev/env-unset
// path the committed registry is served verbatim.
function overlaidIssuerKeys(): TrustIssuerKey[] {
  const overlay = issuerEnvKeyOverlay();

  if (!overlay) {
    return issuerKeys;
  }

  const existing = issuerKeys.find((key) => key.keyId === overlay.keyId);

  if (existing) {
    // The env secret supplies the signing key for an ALREADY-PUBLISHED (committed) keyId.
    return issuerKeys.map((key) =>
      key.keyId === overlay.keyId ? { ...key, publicKeySpki: overlay.publicKeySpki } : key
    );
  }

  // Fail closed (F6): an env keyId that is NOT in the committed registry is NOT auto-published
  // as an ACTIVE trust anchor. A new production key must be added to trust-issuer-keys.json via
  // a reviewed commit before its env-held secret can sign live certs. We surface it only as a
  // RETIRED entry (so its public key still resolves for diagnostics) — never as a live anchor.
  return [
    ...issuerKeys,
    {
      keyId: overlay.keyId,
      algorithm: "ed25519",
      publicKeySpki: overlay.publicKeySpki,
      validFrom: new Date(0).toISOString(),
      validUntil: new Date(0).toISOString(),
      status: "retired",
      supersededBy: null
    }
  ];
}

export function publicKeyForKeyId(keyId: string): string | undefined {
  return overlaidIssuerKeys().find((key) => key.keyId === keyId)?.publicKeySpki;
}

// The committed (non-overlaid) public key for a keyId — i.e. exactly what ships in
// trust-issuer-keys.json. Used by the sign-time fail-closed guard so a production
// seed cannot silently override a committed key's published identity.
export function committedPublicKeyForKeyId(keyId: string): string | undefined {
  return issuerKeyForId(keyId)?.publicKeySpki;
}

export function createIssuerKeyDiscovery() {
  return {
    version: registry.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/keys`,
    activeKeyId: registry.activeKeyId,
    algorithm: "ed25519" as const,
    interpretation:
      "Published Ed25519 issuer public keys for offline verification of Nocksperimental trust badges. Verification never depends on trusting this endpoint: a badge signature can be checked against the committed public key for its issuerKeyId, and retired keys still verify the badges they signed.",
    issuerKeys: overlaidIssuerKeys().map((key) => ({
      keyId: key.keyId,
      algorithm: key.algorithm,
      publicKeySpki: key.publicKeySpki,
      validFrom: key.validFrom,
      validUntil: key.validUntil,
      status: key.status,
      supersededBy: key.supersededBy
    })),
    links: {
      badgeVerifier: `${registryCanonicalBaseUrl}/api/trust/badges/verify`,
      badges: `${registryCanonicalBaseUrl}/api/trust/badges`,
      registry: `${registryCanonicalBaseUrl}/api/registry`
    }
  };
}
