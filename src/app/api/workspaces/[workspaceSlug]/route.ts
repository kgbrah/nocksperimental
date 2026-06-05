import { NextResponse } from "next/server";
import {
  privateWorkspaces,
  reportsForWorkspace,
  workspaceVerificationSummary
} from "@/lib/report-history";

type WorkspaceDetailRouteContext = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: WorkspaceDetailRouteContext) {
  const { workspaceSlug } = await params;
  const workspace = privateWorkspaces.find((candidate) => candidate.slug === workspaceSlug);

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found", workspaceSlug },
      { status: 404 }
    );
  }

  const reports = reportsForWorkspace(workspace.slug);
  const verification = workspaceVerificationSummary(workspace.slug);

  return NextResponse.json({
    version: "v0",
    workspace: {
      ...workspace,
      reportCount: verification.reportCount,
      verifiedReportCount: verification.verifiedReportCount,
      unlinkedReportCount: verification.unlinkedReportCount,
      verification
    },
    verification,
    reports,
    reportLinks: reports.map((report) => ({
      reportId: report.id,
      reportSlug: report.reportSlug,
      generatedReport: `/reports/generated/${report.reportSlug}`,
      badge: report.verification ? `/trust/badges/${report.verification.badgeId}` : null
    })),
    links: {
      collection: "/api/workspaces",
      detail: `/workspaces/${workspace.slug}`,
      reportHistory: "/reports/history"
    }
  });
}
