import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";

type GeneratedReportVerificationInput = {
  reportHash: string;
  snapshotRoot?: string | null;
  appSlug?: string | null;
};

export function verifyGeneratedReportEvidence({
  reportHash,
  snapshotRoot,
  appSlug
}: GeneratedReportVerificationInput) {
  const index = loadGeneratedLabReports();
  const hashMatches = index.reports.filter((report) => report.reportHash === reportHash);
  const snapshotRootMatched = snapshotRoot
    ? hashMatches.some((report) => report.snapshotRoot === snapshotRoot)
    : true;
  const appSlugMatched = appSlug
    ? hashMatches.some((report) => report.appSlug === appSlug)
    : true;
  const match = hashMatches.find(
    (report) =>
      (!snapshotRoot || report.snapshotRoot === snapshotRoot) &&
      (!appSlug || report.appSlug === appSlug)
  );

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/reports/generated/verify`,
    verified: Boolean(match),
    query: {
      reportHash,
      snapshotRoot: snapshotRoot ?? null,
      appSlug: appSlug ?? null
    },
    checks: {
      reportHashProvided: reportHash.length > 0,
      reportHashMatched: hashMatches.length > 0,
      snapshotRootMatched,
      appSlugMatched,
      exactEvidenceMatch: Boolean(match),
      generatedReportsAvailable: index.totals.reportCount > 0
    },
    candidateCount: hashMatches.length,
    match: match
      ? {
          appSlug: match.appSlug,
          appName: match.appName,
          fixtureId: match.fixtureId,
          reportId: match.reportId,
          generatedAt: match.generatedAt,
          status: match.status,
          reportHash: match.reportHash,
          snapshotRoot: match.snapshotRoot,
          badgeCandidateId: match.badgeCandidate.id,
          links: {
            report: `${registryCanonicalBaseUrl}/api/reports/generated/${match.appSlug}`,
            provenance: `${registryCanonicalBaseUrl}/api/reports/generated/${match.appSlug}/provenance`,
            evidence: `${registryCanonicalBaseUrl}/api/reports/generated/${match.appSlug}/evidence`
          }
        }
      : null
  };
}
