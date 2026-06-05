import { loadGeneratedLabReport } from "@/lib/generated-lab-reports";
import { registryCanonicalBaseUrl } from "@/lib/registry-manifest";

export function createGeneratedReportProvenance(appSlug: string) {
  const detail = loadGeneratedLabReport({ appSlug });

  if (!detail) {
    return null;
  }

  const { entry, evidence, report } = detail;

  return {
    version: "v0",
    appSlug,
    fixtureId: entry.fixtureId,
    reportId: entry.reportId,
    generatedAt: entry.generatedAt,
    status: entry.status,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/reports/generated/${appSlug}/provenance`,
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
      jsonHashPresent: entry.reportHash.length > 0,
      snapshotRootPresent: entry.snapshotRoot.length > 0,
      markdownAvailable: Boolean(detail.markdown)
    },
    artifacts: {
      jsonPath: entry.jsonPath,
      markdownPath: entry.markdownPath ?? null,
      reportHash: entry.reportHash,
      snapshotRoot: entry.snapshotRoot
    },
    evidence,
    badgeCandidate: entry.badgeCandidate,
    app: report.app
  };
}
