import { loadGeneratedLabReport } from "@/lib/generated-lab-reports";
import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";

export function createGeneratedReportEvidenceBundle(appSlug: string) {
  const detail = loadGeneratedLabReport({ appSlug });

  if (!detail) {
    return null;
  }

  const { entry, evidence, report } = detail;
  const invariantPacksBoundToBadge =
    evidence.invariantPackIds.length === entry.badgeCandidate.evidence.invariantPacks.length &&
    evidence.invariantPackIds.every((packId) => entry.badgeCandidate.evidence.invariantPacks.includes(packId));

  return {
    version: "v0",
    subject: registrySubject,
    appSlug,
    fixtureId: entry.fixtureId,
    reportId: entry.reportId,
    generatedAt: entry.generatedAt,
    status: entry.status,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/reports/generated/${appSlug}/evidence`,
    summary: {
      stepsPassed: entry.stepsPassed,
      stepsTotal: entry.stepsTotal,
      invariantsPassed: entry.invariantsPassed,
      invariantsTotal: entry.invariantsTotal,
      alertsTriggered: entry.alertsTriggered,
      snapshotsCaptured: entry.snapshotsCaptured
    },
    checks: {
      reportFound: true,
      reportHashBoundToBadge: entry.reportHash === entry.badgeCandidate.evidence.reportHash,
      snapshotRootBoundToBadge: entry.snapshotRoot === entry.badgeCandidate.evidence.snapshotRoot,
      invariantPacksBoundToBadge,
      registryLinksAvailable: true
    },
    artifacts: {
      jsonPath: entry.jsonPath,
      markdownPath: entry.markdownPath ?? null,
      reportHash: entry.reportHash,
      snapshotRoot: entry.snapshotRoot
    },
    evidence,
    badgeCandidate: entry.badgeCandidate,
    app: report.app,
    registry: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    },
    links: {
      report: `${registryCanonicalBaseUrl}/api/reports/generated/${appSlug}`,
      provenance: `${registryCanonicalBaseUrl}/api/reports/generated/${appSlug}/provenance`,
      evidence: `${registryCanonicalBaseUrl}/api/reports/generated/${appSlug}/evidence`
    }
  };
}
