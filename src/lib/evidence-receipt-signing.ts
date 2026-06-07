import {
  assertIssuerSeedMatchesPublishedKey,
  badgeIssuerSigningSeed,
  resolveActiveIssuerKeyId,
  signBadgePayload,
  verifyBadgeSignature
} from "@/lib/trust-badge-crypto";
import { committedPublicKeyForKeyId, publicKeyForKeyId } from "@/lib/trust-issuer-keys";

// Shared Ed25519 signer/verifier for evidence receipts (fakenet / vesl / nockup).
// The three evidence libs previously carried byte-identical copies of this logic,
// differing only in the projected signed-payload shape; that triplication is what
// let the env-seed/keyId divergence (COR-A) replicate across all three. Each lib
// keeps its own buildXSignedPayload projection and exported verifyX wrapper and
// delegates the security-relevant signing/verification to these helpers.

export type EvidenceReceiptSignature = {
  algorithm: "ed25519";
  issuerKeyId: string;
  payloadDigest: string;
  signature: string;
};

// Signs a projected signed payload. Null payload (rejected submission) -> null
// signature, mirroring receiptId === null. Stamps the resolved active issuer
// keyId (production keyId when NOCKS_BADGE_ISSUER_SIGNING_SEED is configured,
// else the committed active dev key) and fails closed if a configured production
// seed does not match the committed published key for that keyId.
export function signEvidenceReceipt<T>(signedPayload: T | null): EvidenceReceiptSignature | null {
  if (!signedPayload) {
    return null;
  }

  const issuerKeyId = resolveActiveIssuerKeyId();
  assertIssuerSeedMatchesPublishedKey(issuerKeyId, committedPublicKeyForKeyId(issuerKeyId));

  const { payloadDigest, signature, algorithm } = signBadgePayload(signedPayload, badgeIssuerSigningSeed());

  return {
    algorithm,
    issuerKeyId,
    payloadDigest,
    signature
  };
}

// Verifies a receipt signature against the published key for its stamped keyId.
// The caller reconstructs the exact signed payload from the receipt before
// delegating here.
export function verifyEvidenceReceiptSignature<T>(
  signature: EvidenceReceiptSignature | null | undefined,
  signedPayload: T
): boolean {
  if (!signature) {
    return false;
  }

  const publicKeySpkiBase64 = publicKeyForKeyId(signature.issuerKeyId);

  if (!publicKeySpkiBase64) {
    return false;
  }

  return verifyBadgeSignature({
    payload: signedPayload,
    signature: signature.signature,
    publicKeySpkiBase64
  });
}
