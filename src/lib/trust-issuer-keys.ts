import issuerKeyData from "@/data/trust-issuer-keys.json";
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

export function publicKeyForKeyId(keyId: string): string | undefined {
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
    issuerKeys: issuerKeys.map((key) => ({
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
