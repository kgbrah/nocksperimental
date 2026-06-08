import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";
import {
  trustUpdateEntries,
  trustUpdateSignedPayload,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";
import { verifyBadgeSignature } from "@/lib/trust-badge-crypto";
import { publicKeyForKeyId } from "@/lib/trust-issuer-keys";

type TrustUpdateVerificationInput = {
  updateId?: string | null;
  entryHash?: string | null;
  rootHash?: string | null;
  signature?: string | null;
  issuerKeyId?: string | null;
};

export function verifyTrustUpdateEntry({
  updateId,
  entryHash,
  rootHash,
  signature,
  issuerKeyId
}: TrustUpdateVerificationInput) {
  const entryByHash = entryHash
    ? trustUpdateEntries.find((entry) => entry.entryHash === entryHash)
    : undefined;
  const candidateUpdateId = updateId ?? entryByHash?.id ?? "";
  const entry = candidateUpdateId
    ? trustUpdateEntries.find((candidate) => candidate.id === candidateUpdateId)
    : entryByHash;
  const validation = validateTrustUpdateChain();
  const entryHashMatched = entryHash ? entry?.entryHash === entryHash : Boolean(entry);
  const rootHashMatched = rootHash ? entry?.rootHash === rootHash : true;
  const signatureMatched = signature ? entry?.signature.signature === signature : true;
  const issuerKeyMatched = issuerKeyId ? entry?.signature.issuerKeyId === issuerKeyId : true;
  // Live Ed25519 verification: reconstruct the canonical signed payload from the
  // entry and verify entry.signature.signature against the issuer's PUBLISHED public
  // key (publicKeyForKeyId — retired keys still resolve so they verify the entries
  // they signed). This is a real cryptographic check, not a read of the recorded
  // verificationStatus: tampering any signed field, swapping the signature, or
  // pointing at the wrong key fails it. publicKeyResolved distinguishes "no key
  // published for this keyId" (cannot verify) from "verified false".
  const publicKeySpki = entry ? publicKeyForKeyId(entry.signature.issuerKeyId) : undefined;
  const signatureValid = Boolean(
    entry &&
      publicKeySpki &&
      verifyBadgeSignature({
        payload: trustUpdateSignedPayload(entry),
        signature: entry.signature.signature,
        publicKeySpkiBase64: publicKeySpki
      })
  );
  const exactUpdateMatch = Boolean(
    entry &&
      entryHashMatched &&
      rootHashMatched &&
      signatureMatched &&
      issuerKeyMatched &&
      validation.isAppendOnly &&
      signatureValid
  );

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/updates/verify`,
    verified: exactUpdateMatch,
    // signatureValid below is a live Ed25519 verification against the issuer's
    // published key — surfaced explicitly so integrators can see exactly what was
    // checked and against which key.
    signatureVerification: {
      performed: true,
      mode: "ed25519",
      publicKeyResolved: Boolean(publicKeySpki),
      issuerKeyId: entry?.signature.issuerKeyId ?? null,
      note: "signatureValid is a live Ed25519 verification of entry.signature over the canonical signed payload, against the published public key for the entry's issuerKeyId."
    },
    query: {
      updateId: updateId ?? null,
      entryHash: entryHash ?? null,
      rootHash: rootHash ?? null,
      signature: signature ?? null,
      issuerKeyId: issuerKeyId ?? null
    },
    checks: {
      updateFound: Boolean(entry),
      entryHashMatched,
      rootHashMatched,
      signatureMatched,
      issuerKeyMatched,
      chainAppendOnly: validation.isAppendOnly,
      signatureValid,
      signatureChecked: true,
      exactUpdateMatch
    },
    match: exactUpdateMatch && entry
      ? {
          id: entry.id,
          sequence: entry.sequence,
          action: entry.action,
          target: entry.target,
          targetPath: entry.targetPath,
          recordedAt: entry.recordedAt,
          previousRoot: entry.previousRoot,
          entryHash: entry.entryHash,
          rootHash: entry.rootHash,
          signature: entry.signature.signature,
          issuerKeyId: entry.signature.issuerKeyId,
          signatureStatus: entry.signature.verificationStatus,
          links: {
            detail: `${registryCanonicalBaseUrl}/trust/updates/${entry.id}`,
            entryApi: `${registryCanonicalBaseUrl}/api/trust/updates/${entry.id}`,
            chainApi: `${registryCanonicalBaseUrl}/api/trust/updates`,
            targetApi: `${registryCanonicalBaseUrl}${trustUpdateTargetApiPath(entry)}`
          }
        }
      : null
  };
}

export function trustUpdateTargetApiPath(entry: TrustUpdateEntry) {
  if (entry.target === "score-history") {
    return "/api/trust/score-history";
  }

  if (entry.target === "badge-issuance" || entry.target === "badge-revocation") {
    return "/api/trust/badges";
  }

  return "/api/trust";
}
