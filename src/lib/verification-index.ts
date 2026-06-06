import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { createRegistryCheckpoint } from "@/lib/registry-checkpoint";
import { createWorkspaceEvidenceCapsule } from "@/lib/workspace-evidence";
import { createWorkspaceUploadTokenSample } from "@/lib/workspace-upload-token";
import {
  trustUpdateChainSummary,
  trustUpdateEntries
} from "@/lib/trust-update-log";
import { badgeEmbeds, trustSignals } from "@/lib/trust-signals";

const verificationEndpoints = [
  {
    id: "badge-issuance",
    path: "/api/trust/badges/verify",
    description: "Verify badge issuance by badge id, payload digest, signature, or issuer key",
    queryParameters: ["badgeId", "payloadDigest", "signature", "issuerKeyId"]
  },
  {
    id: "generated-report",
    path: "/api/reports/generated/verify",
    description: "Verify generated report hashes and snapshot roots",
    queryParameters: ["reportHash", "snapshotRoot", "appSlug"]
  },
  {
    id: "local-fakenet-evidence",
    path: "/api/fakenet/evidence/verify",
    description: "Verify local fakenet evidence capsule inputs",
    queryParameters: ["generatedAt", "reportId", "grpcEndpoint", "walletAddress", "blockCommitment"]
  },
  {
    id: "workspace-evidence",
    path: "/api/workspaces/evidence/verify",
    description: "Verify workspace evidence capsules by workspace, report, badge, and snapshot root",
    queryParameters: ["workspaceSlug", "reportId", "badgeId", "latestSnapshotRoot"]
  },
  {
    id: "workspace-upload-token",
    path: "/api/workspaces/upload-token/verify",
    description: "Verify signed workspace upload tokens",
    queryParameters: ["token"]
  },
  {
    id: "launch-evidence",
    path: "/api/launch-evidence/verify",
    description: "Verify Launch Evidence report hashes and snapshot roots",
    queryParameters: ["caseId", "reportHash", "snapshotRoot"]
  },
  {
    id: "trust-update-entry",
    path: "/api/trust/updates/verify",
    description: "Verify signed trust update entries by update id, entry hash, root, signature, or issuer key",
    queryParameters: ["updateId", "entryHash", "rootHash", "signature", "issuerKeyId"]
  },
  {
    id: "registry-checkpoint",
    path: "/api/registry/checkpoint",
    description: "Verify registry counts, roots, and append-only trust update state",
    queryParameters: []
  },
  {
    id: "nockchain-drift-status",
    path: "/api/nockchain/drift-status",
    description: "Read the committed Nockchain upstream drift status snapshot to confirm pinned sources are still current",
    queryParameters: []
  }
];

export function createVerificationIndex() {
  const generatedReports = loadGeneratedLabReports();
  const localFakenetEvidence = createLocalFakenetEvidenceCapsule();
  const launchEvidenceIndex = createLaunchEvidenceIndex();
  const workspaceEvidence = createWorkspaceEvidenceCapsule("launch-lab-private");
  const workspaceUploadToken = createWorkspaceUploadTokenSample("launch-lab-private");
  const registryCheckpoint = createRegistryCheckpoint();
  const sampleBadge = badgeEmbeds.find((badge) => badge.badgeId === "badge-payment-flow-verified") ?? badgeEmbeds[0];
  const sampleReport =
    generatedReports.reports.find((report) => report.appSlug === "payment-flow") ??
    generatedReports.reports[0];
  const sampleTrustUpdate =
    trustUpdateEntries.find((entry) => entry.id === "update-score-history-v0") ??
    trustUpdateEntries.at(-1);

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/verify`,
    verifierCount: verificationEndpoints.length,
    verifiers: verificationEndpoints.map((endpoint) => ({
      ...endpoint,
      url: `${registryCanonicalBaseUrl}${endpoint.path}`
    })),
    counts: {
      badges: trustSignals.verifiedBadges.length,
      publicBadgeEmbeds: badgeEmbeds.length,
      generatedReports: generatedReports.totals.reportCount,
      trustUpdates: trustUpdateChainSummary.entryCount
    },
    samples: {
      badgeIssuance: sampleBadge
        ? {
            badgeId: sampleBadge.badgeId,
            payloadDigest: sampleBadge.issuanceDigest,
            url: createUrl("/api/trust/badges/verify", {
              badgeId: sampleBadge.badgeId,
              payloadDigest: sampleBadge.issuanceDigest
            })
          }
        : null,
      registryCheckpoint: {
        label: "Registry checkpoint",
        url: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
        counts: registryCheckpoint.counts,
        roots: registryCheckpoint.roots
      },
      generatedReport: sampleReport
        ? {
            appSlug: sampleReport.appSlug,
            reportHash: sampleReport.reportHash,
            snapshotRoot: sampleReport.snapshotRoot,
            url: createUrl("/api/reports/generated/verify", {
              reportHash: sampleReport.reportHash,
              snapshotRoot: sampleReport.snapshotRoot,
              appSlug: sampleReport.appSlug
            })
          }
        : null,
      localFakenetEvidence: createLocalFakenetEvidenceSample(localFakenetEvidence),
      launchEvidence: createLaunchEvidenceSample(launchEvidenceIndex),
      workspaceEvidence: createWorkspaceEvidenceSample(workspaceEvidence),
      workspaceUploadToken,
      trustUpdate: sampleTrustUpdate
        ? {
            updateId: sampleTrustUpdate.id,
            entryHash: sampleTrustUpdate.entryHash,
            rootHash: sampleTrustUpdate.rootHash,
            url: createUrl("/api/trust/updates/verify", {
              updateId: sampleTrustUpdate.id,
              entryHash: sampleTrustUpdate.entryHash,
              rootHash: sampleTrustUpdate.rootHash,
              signature: sampleTrustUpdate.signature.signature,
              issuerKeyId: sampleTrustUpdate.signature.issuerKeyId
            })
          }
        : null
    },
    links: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}

function createLaunchEvidenceSample(
  launchEvidenceIndex: ReturnType<typeof createLaunchEvidenceIndex>
) {
  const sampleCase = launchEvidenceIndex.cases.find((launchCase) => launchCase.visibility !== "private");

  if (!sampleCase) {
    return null;
  }

  return {
    caseId: sampleCase.caseId,
    reportHash: sampleCase.report.reportHash,
    snapshotRoot: sampleCase.report.snapshotRoot,
    url: createUrl("/api/launch-evidence/verify", {
      caseId: sampleCase.caseId,
      reportHash: sampleCase.report.reportHash,
      snapshotRoot: sampleCase.report.snapshotRoot
    })
  };
}

function createWorkspaceEvidenceSample(
  evidence: ReturnType<typeof createWorkspaceEvidenceCapsule>
) {
  const reportId = evidence?.verifier.inputs.reportIds[0];

  if (!evidence || !reportId) {
    return null;
  }

  return {
    workspaceSlug: evidence.workspace.slug,
    status: evidence.status,
    reportId,
    url: evidence.links.verify
  };
}

function createLocalFakenetEvidenceSample(
  evidence: ReturnType<typeof createLocalFakenetEvidenceCapsule>
) {
  const reportId = evidence.verifier.inputs.reportIds[0];

  if (!reportId) {
    return null;
  }

  const params: Record<string, string> = {
    generatedAt: evidence.generatedAt,
    reportId
  };

  if (evidence.verifier.inputs.grpcEndpoint) {
    params.grpcEndpoint = evidence.verifier.inputs.grpcEndpoint;
  }

  if (evidence.verifier.inputs.walletAddress) {
    params.walletAddress = evidence.verifier.inputs.walletAddress;
  }

  if (evidence.verifier.inputs.blockCommitment) {
    params.blockCommitment = evidence.verifier.inputs.blockCommitment;
  }

  return {
    status: evidence.status,
    generatedAt: evidence.generatedAt,
    reportId,
    url: createUrl("/api/fakenet/evidence/verify", params)
  };
}

function createUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${registryCanonicalBaseUrl}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
