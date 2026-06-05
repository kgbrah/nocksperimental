import { createHash } from "node:crypto";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { scoreHistorySummaries } from "@/lib/trust-score-history";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import {
  badgeEmbeds,
  badgeIssuanceReceipts,
  badgeRevocations,
  computeBenchmarkProfiles,
  resolvedBadges,
  solverScorecards,
  tokenCompatibilityReports,
  trustSignals
} from "@/lib/trust-signals";

export function createRegistryCheckpoint() {
  const generatedReports = loadGeneratedLabReports();
  const localFakenetEvidence = createLocalFakenetEvidenceCapsule();
  const generatedReportEvidence = generatedReports.reports.map((report) => ({
    appSlug: report.appSlug,
    fixtureId: report.fixtureId,
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    status: report.status,
    reportHash: report.reportHash,
    snapshotRoot: report.snapshotRoot
  }));
  const counts = {
    badges: trustSignals.verifiedBadges.length,
    publicBadgeEmbeds: badgeEmbeds.length,
    badgeIssuanceReceipts: badgeIssuanceReceipts.length,
    badgeRevocations: badgeRevocations.length,
    generatedReports: generatedReports.totals.reportCount,
    localFakenetReports: localFakenetEvidence.summary.reportCount,
    trustUpdates: trustUpdateChainSummary.entryCount,
    solverScorecards: solverScorecards.length,
    tokenCompatibilityReports: tokenCompatibilityReports.length,
    computeBenchmarkProfiles: computeBenchmarkProfiles.length,
    scoreHistories: scoreHistorySummaries.length,
    trustConsumers: trustSignals.trustConsumers.length
  };
  const roots = {
    trustSignals: createSha256Root(trustSignals),
    generatedReports: createSha256Root({
      generatedAt: generatedReports.generatedAt,
      status: generatedReports.status,
      totals: generatedReports.totals,
      reports: generatedReportEvidence
    }),
    localFakenetEvidence: createSha256Root({
      generatedAt: localFakenetEvidence.generatedAt,
      status: localFakenetEvidence.status,
      summary: localFakenetEvidence.summary,
      verifier: localFakenetEvidence.verifier
    }),
    trustUpdates: trustUpdateChainSummary.latestRoot
  };
  const checkpoint = {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
    counts,
    roots,
    checks: {
      appendOnlyTrustUpdates: trustUpdateChainSummary.isAppendOnly,
      validTrustUpdateSignatures:
        trustUpdateChainSummary.signedEntryCount === trustUpdateChainSummary.validSignatureCount,
      generatedReportsAvailable: generatedReports.totals.reportCount > 0,
      localFakenetEvidenceAvailable: localFakenetEvidence.summary.reportCount > 0,
      publicBadgesAvailable: badgeEmbeds.length > 0
    },
    chain: {
      entryCount: trustUpdateChainSummary.entryCount,
      latestRoot: trustUpdateChainSummary.latestRoot,
      signedEntries: trustUpdateChainSummary.signedEntryCount,
      validSignatures: trustUpdateChainSummary.validSignatureCount,
      algorithm: trustUpdateChainSummary.algorithm,
      source: trustUpdateChainSummary.source
    },
    reports: {
      status: generatedReports.status,
      generatedAt: generatedReports.generatedAt,
      reportCount: generatedReports.totals.reportCount,
      passCount: generatedReports.totals.passCount,
      warnCount: generatedReports.totals.warnCount,
      failCount: generatedReports.totals.failCount
    },
    fakenetEvidence: {
      status: localFakenetEvidence.status,
      generatedAt: localFakenetEvidence.generatedAt,
      reportCount: localFakenetEvidence.summary.reportCount,
      activeDiagnostics: localFakenetEvidence.summary.activeDiagnostics,
      verifierReady: localFakenetEvidence.verifier.ready,
      endpoint: localFakenetEvidence.summary.endpoint,
      walletAddress: localFakenetEvidence.summary.walletAddress
    },
    badges: {
      verified: resolvedBadges.filter((badge) => badge.currentStatus === "verified").length,
      revoked: resolvedBadges.filter((badge) => badge.currentStatus === "revoked").length,
      embeddable: badgeEmbeds.length
    },
    links: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      trustFeed: `${registryCanonicalBaseUrl}/api/trust/feed`,
      trustUpdates: `${registryCanonicalBaseUrl}/api/trust/updates`,
      generatedReports: `${registryCanonicalBaseUrl}/api/reports/generated`,
      fakenetEvidence: `${registryCanonicalBaseUrl}/api/fakenet/evidence`,
      fakenetEvidenceVerifier: `${registryCanonicalBaseUrl}/api/fakenet/evidence/verify`
    }
  };

  return {
    ...checkpoint,
    roots: {
      ...checkpoint.roots,
      checkpoint: createSha256Root(checkpoint)
    }
  };
}

function createSha256Root(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB)
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
