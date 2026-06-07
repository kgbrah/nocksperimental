import trustUpdateLogData from "@/data/trust-update-log.json";
import { createHash } from "node:crypto";
import { canonicalStringify } from "@/lib/canonical-stringify";

export type TrustUpdateAction =
  | "registry-snapshot"
  | "badge-issuance"
  | "badge-revocation"
  | "score-history";
export type TrustUpdateTarget =
  | "trust-signals"
  | "badge-issuance"
  | "badge-revocation"
  | "score-history";
export type TrustUpdateVerificationStatus = "valid" | "invalid" | "unchecked";

export type TrustUpdateEntry = {
  sequence: number;
  id: string;
  action: TrustUpdateAction;
  target: TrustUpdateTarget;
  targetPath: string;
  recordedAt: string;
  previousRoot: string;
  entryHash: string;
  rootHash: string;
  summary: string;
  signature: {
    issuerKeyId: string;
    algorithm: string;
    signature: string;
    verificationStatus: TrustUpdateVerificationStatus;
  };
};

export type TrustUpdateLog = {
  version: string;
  chain: {
    algorithm: string;
    source: string;
    entryCount: number;
    latestRoot: string;
  };
  entries: TrustUpdateEntry[];
};

export type TrustUpdateChainValidation = {
  entryCount: number;
  latestRoot: string;
  signedEntryCount: number;
  validSignatureCount: number;
  brokenLinkCount: number;
  invalidSignatureCount: number;
  isAppendOnly: boolean;
};

export type TrustUpdateChainSummary = TrustUpdateChainValidation & {
  source: string;
  algorithm: string;
  targets: string;
};

export type TrustUpdateAppendInput = {
  id: string;
  action: TrustUpdateAction;
  target: TrustUpdateTarget;
  targetPath: string;
  recordedAt: string;
  rootHash: string;
  summary: string;
  issuerKeyId?: string;
  signatureAlgorithm?: string;
  verificationStatus?: TrustUpdateVerificationStatus;
};

const DEFAULT_ISSUER_KEY_ID = "nocksperimental-registry-ed25519-dev-v0";
const DEFAULT_SIGNATURE_ALGORITHM = "ed25519-devnet-v0";

export const trustUpdateLog = trustUpdateLogData as TrustUpdateLog;
export const trustUpdateEntries = sortTrustUpdateEntries(trustUpdateLog);
export const trustUpdateChainSummary = createTrustUpdateChainSummary();

export function appendTrustUpdateToLog(
  log: TrustUpdateLog,
  input: TrustUpdateAppendInput
): TrustUpdateLog {
  const entries = sortTrustUpdateEntries(log);
  const previousRoot = entries.at(-1)?.rootHash ?? "genesis";
  const signatureMetadata = {
    issuerKeyId: input.issuerKeyId ?? DEFAULT_ISSUER_KEY_ID,
    algorithm: input.signatureAlgorithm ?? DEFAULT_SIGNATURE_ALGORITHM,
    verificationStatus: input.verificationStatus ?? "valid"
  };
  const entryWithoutSignature: Omit<TrustUpdateEntry, "entryHash" | "signature"> = {
    sequence: entries.length + 1,
    id: input.id,
    action: input.action,
    target: input.target,
    targetPath: input.targetPath,
    recordedAt: input.recordedAt,
    previousRoot,
    rootHash: input.rootHash,
    summary: input.summary
  };
  const entryHash = `sha256:${createDevHash({
    ...entryWithoutSignature,
    signature: signatureMetadata
  })}`;
  const signatureDigest = createDevHash({
    entryHash,
    rootHash: input.rootHash,
    previousRoot,
    issuerKeyId: signatureMetadata.issuerKeyId,
    signatureAlgorithm: signatureMetadata.algorithm
  });
  const entry: TrustUpdateEntry = {
    ...entryWithoutSignature,
    entryHash,
    signature: {
      ...signatureMetadata,
      signature: `ed25519-dev-sig-${signatureDigest.slice(0, 32)}`
    }
  };

  return {
    ...log,
    chain: {
      ...log.chain,
      entryCount: entries.length + 1,
      latestRoot: input.rootHash
    },
    entries: [...entries, entry]
  };
}

export function validateTrustUpdateChain(log: TrustUpdateLog = trustUpdateLog): TrustUpdateChainValidation {
  const entries = sortTrustUpdateEntries(log);
  const brokenLinkCount = entries.filter((entry, index) => {
    if (index === 0) {
      return entry.previousRoot !== "genesis";
    }

    return entry.previousRoot !== entries[index - 1].rootHash;
  }).length;
  const signedEntryCount = entries.filter((entry) => entry.signature.signature).length;
  const validSignatureCount = entries.filter(
    (entry) => entry.signature.verificationStatus === "valid"
  ).length;
  const invalidSignatureCount = entries.filter(
    (entry) => entry.signature.verificationStatus === "invalid"
  ).length;
  const latestRoot = entries[entries.length - 1]?.rootHash ?? "";

  return {
    entryCount: entries.length,
    latestRoot,
    signedEntryCount,
    validSignatureCount,
    brokenLinkCount,
    invalidSignatureCount,
    isAppendOnly:
      brokenLinkCount === 0 &&
      invalidSignatureCount === 0 &&
      latestRoot === log.chain.latestRoot &&
      entries.length === log.chain.entryCount
  };
}

export function trustUpdatesForTarget(target: TrustUpdateTarget | string) {
  return trustUpdateEntries.filter((entry) => entry.target === target);
}

export function latestTrustUpdateForTarget(target: TrustUpdateTarget | string) {
  return trustUpdatesForTarget(target).at(-1);
}

function createTrustUpdateChainSummary(): TrustUpdateChainSummary {
  const validation = validateTrustUpdateChain();

  return {
    ...validation,
    source: trustUpdateLog.chain.source,
    algorithm: trustUpdateLog.chain.algorithm,
    targets: trustUpdateEntries.map((entry) => entry.target).join(",")
  };
}

function sortTrustUpdateEntries(log: TrustUpdateLog) {
  return [...log.entries].sort((a, b) => a.sequence - b.sequence);
}

export function createDevHash(value: unknown) {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}
