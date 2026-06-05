import {
  privateWorkspaces,
  reportsForWorkspace,
  workspaceVerificationSummary
} from "@/lib/report-history";
import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";

export type WorkspaceEvidenceVerificationInput = {
  workspaceSlug: string;
  reportIds: string[];
  badgeIds?: string[];
  latestSnapshotRoot?: string | null;
};

type WorkspaceEvidenceVerifyUrlInput = {
  workspace: {
    slug: string;
  };
  verifier: {
    inputs: {
      reportIds: string[];
      badgeIds: string[];
      latestSnapshotRoot: string | null;
    };
  };
};

export function createWorkspaceEvidenceCapsule(workspaceSlug: string) {
  const workspace = privateWorkspaces.find((candidate) => candidate.slug === workspaceSlug);

  if (!workspace) {
    return null;
  }

  const reports = reportsForWorkspace(workspace.slug);
  const verification = workspaceVerificationSummary(workspace.slug);
  const sortedReports = [...reports].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt)
  );
  const checks = {
    workspaceFound: true,
    reportsAvailable: reports.length > 0,
    retentionConfigured: workspace.retentionDays > 0,
    reportsBoundToWorkspace: reports.every(
      (report) => report.workspaceSlug === workspace.slug && report.workspaceName === workspace.name
    ),
    badgesAvailable: verification.verifiedReportCount > 0,
    generatedReportLinksAvailable: reports.every((report) => Boolean(report.reportSlug))
  };
  const ready = Object.values(checks).every(Boolean);
  const evidence = {
    version: "v0",
    subject: registrySubject,
    evidenceId: `workspace_evidence_${workspace.slug.replace(/-/g, "_")}_v0`,
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      visibility: workspace.visibility,
      plan: workspace.plan,
      retentionDays: workspace.retentionDays,
      environments: workspace.environments,
      stages: workspace.stages,
      seats: workspace.seats
    },
    canonicalUrl: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}/evidence`,
    generatedAt: sortedReports[0]?.generatedAt ?? null,
    status: ready ? "verified" : reports.length > 0 ? "partial" : "empty",
    summary: {
      reportCount: verification.reportCount,
      verifiedReportCount: verification.verifiedReportCount,
      unlinkedReportCount: verification.unlinkedReportCount,
      retentionDays: workspace.retentionDays,
      latestBadgeId: verification.latestBadgeId ?? null,
      latestReportSlug: verification.latestReportSlug ?? null,
      latestSnapshotRoot: verification.latestSnapshotRoot ?? null
    },
    verifier: {
      ready,
      checks,
      inputs: {
        workspaceSlug: workspace.slug,
        reportIds: reports.map((report) => report.id),
        badgeIds: verification.badgeIds.filter(Boolean),
        latestSnapshotRoot: verification.latestSnapshotRoot ?? null,
        reportCount: verification.reportCount,
        verifiedReportCount: verification.verifiedReportCount
      }
    },
    reports: reports.map((report) => ({
      id: report.id,
      reportSlug: report.reportSlug,
      fixtureId: report.fixtureId,
      appName: report.appName,
      status: report.status,
      stage: report.stage,
      generatedAt: report.generatedAt,
      snapshotsCaptured: report.snapshotsCaptured,
      verification: report.verification ?? null,
      links: {
        generatedReport: `${registryCanonicalBaseUrl}/reports/generated/${report.reportSlug}`,
        badge: report.verification
          ? `${registryCanonicalBaseUrl}/trust/badges/${report.verification.badgeId}`
          : null
      }
    })),
    links: {
      workspace: `${registryCanonicalBaseUrl}/workspaces/${workspace.slug}`,
      workspaceApi: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}`,
      evidence: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}/evidence`,
      verify: ""
    }
  };

  return {
    ...evidence,
    links: {
      ...evidence.links,
      verify: createWorkspaceEvidenceVerifyUrl(evidence)
    }
  };
}

export function verifyWorkspaceEvidenceCapsule(
  input: WorkspaceEvidenceVerificationInput
) {
  const capsule = createWorkspaceEvidenceCapsule(input.workspaceSlug);
  const availableReportIds = capsule?.verifier.inputs.reportIds ?? [];
  const availableBadgeIds = capsule?.verifier.inputs.badgeIds ?? [];
  const latestSnapshotRoot = capsule?.verifier.inputs.latestSnapshotRoot ?? null;
  const workspaceMatched = Boolean(capsule);
  const reportIdsMatched =
    workspaceMatched &&
    input.reportIds.length > 0 &&
    input.reportIds.every((reportId) => availableReportIds.includes(reportId));
  const badgeIdsMatched =
    workspaceMatched &&
    (!input.badgeIds?.length ||
      input.badgeIds.every((badgeId) => availableBadgeIds.includes(badgeId)));
  const latestSnapshotRootMatched =
    workspaceMatched && (input.latestSnapshotRoot ? latestSnapshotRoot === input.latestSnapshotRoot : true);
  const exactInputMatch =
    workspaceMatched && reportIdsMatched && badgeIdsMatched && latestSnapshotRootMatched;

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/workspaces/evidence/verify`,
    verified: Boolean(exactInputMatch && capsule?.verifier.ready),
    query: {
      workspaceSlug: input.workspaceSlug,
      reportIds: input.reportIds,
      badgeIds: input.badgeIds ?? [],
      latestSnapshotRoot: input.latestSnapshotRoot ?? null
    },
    checks: {
      workspaceSlugProvided: input.workspaceSlug.length > 0,
      reportIdsProvided: input.reportIds.length > 0,
      workspaceMatched,
      reportIdsMatched,
      badgeIdsMatched,
      latestSnapshotRootMatched,
      exactInputMatch,
      evidenceReady: capsule?.verifier.ready ?? false
    },
    match: exactInputMatch && capsule
      ? {
          evidenceId: capsule.evidenceId,
          workspaceSlug: capsule.workspace.slug,
          status: capsule.status,
          reportCount: capsule.summary.reportCount,
          verifiedReportCount: capsule.summary.verifiedReportCount,
          reportIds: capsule.verifier.inputs.reportIds,
          badgeIds: capsule.verifier.inputs.badgeIds,
          links: {
            evidence: capsule.links.evidence,
            workspace: capsule.links.workspace,
            workspaceApi: capsule.links.workspaceApi
          }
        }
      : null
  };
}

export function createWorkspaceEvidenceVerifyUrl(
  evidence: WorkspaceEvidenceVerifyUrlInput
) {
  const url = new URL(`${registryCanonicalBaseUrl}/api/workspaces/evidence/verify`);

  url.searchParams.set("workspaceSlug", evidence.workspace.slug);

  for (const reportId of evidence.verifier.inputs.reportIds) {
    url.searchParams.append("reportId", reportId);
  }

  for (const badgeId of evidence.verifier.inputs.badgeIds) {
    url.searchParams.append("badgeId", badgeId);
  }

  if (evidence.verifier.inputs.latestSnapshotRoot) {
    url.searchParams.set("latestSnapshotRoot", evidence.verifier.inputs.latestSnapshotRoot);
  }

  return url.toString();
}
