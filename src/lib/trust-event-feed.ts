import { registryCanonicalBaseUrl } from "@/lib/registry-manifest";
import { createRegistryCheckpoint } from "@/lib/registry-checkpoint";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import { trustUpdateChainSummary, trustUpdateEntries } from "@/lib/trust-update-log";
import { badgeIssuanceReceipts, badgeRevocations } from "@/lib/trust-signals";

type TrustEventType =
  | "registry-update"
  | "badge-issuance"
  | "badge-revocation"
  | "local-fakenet-evidence";

type TrustFeedEvent = {
  id: string;
  type: TrustEventType;
  recordedAt: string;
  subjectId: string;
  summary: string;
  url: string;
  evidence: {
    rootHash?: string;
    entryHash?: string;
    signature?: string;
    payloadDigest?: string;
    reportHash?: string;
    snapshotRoot?: string;
    verificationStatus?: string;
    reportCount?: number;
    endpoint?: string | null;
    walletAddress?: string | null;
  };
};

export function createTrustEventFeed() {
  const localFakenetEvidence = createLocalFakenetEvidenceCapsule();
  const checkpoint = createRegistryCheckpoint();
  const events = [
    {
      id: `local-fakenet-evidence-${localFakenetEvidence.generatedAt.replace(/[-:.TZ]/g, "")}`,
      type: "local-fakenet-evidence",
      recordedAt: localFakenetEvidence.generatedAt,
      subjectId: localFakenetEvidence.evidenceId,
      summary: `Local fakenet evidence is ${localFakenetEvidence.status} with ${localFakenetEvidence.summary.reportCount} report artifacts.`,
      url: `${registryCanonicalBaseUrl}/api/fakenet/evidence`,
      evidence: {
        rootHash: checkpoint.roots.localFakenetEvidence,
        verificationStatus: localFakenetEvidence.status,
        reportCount: localFakenetEvidence.summary.reportCount,
        endpoint: localFakenetEvidence.summary.endpoint,
        walletAddress: localFakenetEvidence.summary.walletAddress
      }
    } satisfies TrustFeedEvent,
    ...trustUpdateEntries.map<TrustFeedEvent>((entry) => ({
      id: entry.id,
      type: "registry-update",
      recordedAt: entry.recordedAt,
      subjectId: entry.target,
      summary: entry.summary,
      url: `${registryCanonicalBaseUrl}/api/trust/updates`,
      evidence: {
        rootHash: entry.rootHash,
        entryHash: entry.entryHash,
        signature: entry.signature.signature,
        verificationStatus: entry.signature.verificationStatus
      }
    })),
    ...badgeIssuanceReceipts.map<TrustFeedEvent>((receipt) => ({
      id: receipt.id,
      type: "badge-issuance",
      recordedAt: receipt.issuedAt,
      subjectId: receipt.badgeId,
      summary: `Issued ${receipt.badgeId} with ${receipt.verification.status} verification.`,
      url: `${registryCanonicalBaseUrl}/api/trust/badges/${receipt.badgeId}`,
      evidence: {
        payloadDigest: receipt.payloadDigest,
        signature: receipt.signature,
        reportHash: receipt.signedPayload.reportHash,
        snapshotRoot: receipt.signedPayload.snapshotRoot,
        verificationStatus: receipt.verification.status
      }
    })),
    ...badgeRevocations.map<TrustFeedEvent>((revocation) => ({
      id: revocation.id,
      type: "badge-revocation",
      recordedAt: revocation.revokedAt,
      subjectId: revocation.badgeId,
      summary: revocation.reason,
      url: `${registryCanonicalBaseUrl}/api/trust/badges/${revocation.badgeId}`,
      evidence: {
        signature: revocation.evidence.signature,
        reportHash: revocation.evidence.reportHash,
        snapshotRoot: revocation.evidence.snapshotRoot
      }
    }))
  ].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt) || left.id.localeCompare(right.id));

  return {
    version: "v0",
    source: "nocksperimental-trust-feed",
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/feed`,
    chain: {
      latestRoot: trustUpdateChainSummary.latestRoot,
      isAppendOnly: trustUpdateChainSummary.isAppendOnly
    },
    counts: {
      registryUpdates: trustUpdateEntries.length,
      badgeIssuances: badgeIssuanceReceipts.length,
      badgeRevocations: badgeRevocations.length,
      localFakenetEvidence: 1
    },
    eventCount: events.length,
    events
  };
}
