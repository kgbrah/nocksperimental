import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";
import {
  trustUpdateEntries,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";

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
  const signatureValid = entry?.signature.verificationStatus === "valid";
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
