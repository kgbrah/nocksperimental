import historyData from "@/data/report-history.json";
import workspaceData from "@/data/private-workspaces.json";
import { badgeForReport, type TrustBadgeStatus } from "@/lib/trust-signals";

export type ReportStage = "pre-launch" | "audit" | "upgrade" | "integration";
export type ReportStatus = "pass" | "warn" | "fail";
export type WorkspacePlan = "team" | "audit" | "enterprise";
export type WorkspaceEnvironment = "mock-fakenet" | "local-fakenet" | "docker-fakenet";

export type ReportHistoryVerification = {
  badgeId: string;
  badgeStatus: TrustBadgeStatus;
  reportHash: string;
  snapshotRoot: string;
  signature: string;
  invariantPacks: string[];
};

export type ReportHistoryBaseEntry = {
  id: string;
  workspaceSlug: string;
  workspaceName: string;
  appName: string;
  fixtureId: string;
  reportSlug: string;
  status: ReportStatus;
  stage: ReportStage;
  generatedAt: string;
  invariantPacks: string[];
  snapshotsCaptured: number;
  summary: string;
};

export type ReportHistoryEntry = ReportHistoryBaseEntry & {
  verification?: ReportHistoryVerification;
};

export type PrivateWorkspace = {
  id: string;
  slug: string;
  name: string;
  visibility: "private";
  plan: WorkspacePlan;
  seats: number;
  retentionDays: number;
  environments: WorkspaceEnvironment[];
  stages: ReportStage[];
  members: Array<{
    role: string;
    count: number;
  }>;
};

export type WorkspaceVerificationSummary = {
  reportCount: number;
  verifiedReportCount: number;
  unlinkedReportCount: number;
  badgeIds: string[];
  latestBadgeId?: string;
  latestReportSlug?: string;
  latestSnapshotRoot?: string;
};

const baseReportHistory = historyData.reports as ReportHistoryBaseEntry[];

export const reportHistory = baseReportHistory.map(withReportVerification);
export const privateWorkspaces = workspaceData.workspaces as PrivateWorkspace[];

export const reportStages: ReportStage[] = ["pre-launch", "audit", "upgrade", "integration"];

export function reportsForWorkspace(workspaceSlug: string) {
  return reportHistory.filter((report) => report.workspaceSlug === workspaceSlug);
}

export function workspaceVerificationSummary(workspaceSlug: string): WorkspaceVerificationSummary {
  const reports = reportsForWorkspace(workspaceSlug);
  const verifiedReports = reports
    .filter((report) => report.verification)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  const latestVerifiedReport = verifiedReports[0];

  return {
    reportCount: reports.length,
    verifiedReportCount: verifiedReports.length,
    unlinkedReportCount: reports.length - verifiedReports.length,
    badgeIds: verifiedReports.map((report) => report.verification?.badgeId ?? ""),
    latestBadgeId: latestVerifiedReport?.verification?.badgeId,
    latestReportSlug: latestVerifiedReport?.reportSlug,
    latestSnapshotRoot: latestVerifiedReport?.verification?.snapshotRoot
  };
}

function withReportVerification(report: ReportHistoryBaseEntry): ReportHistoryEntry {
  const badge = badgeForReport(report.reportSlug, report.fixtureId);

  if (!badge) {
    return report;
  }

  return {
    ...report,
    verification: {
      badgeId: badge.id,
      badgeStatus: badge.status,
      reportHash: badge.evidence.reportHash,
      snapshotRoot: badge.evidence.snapshotRoot,
      signature: badge.evidence.signature,
      invariantPacks: badge.evidence.invariantPacks
    }
  };
}

export function workspaceStageCoverage(workspace: PrivateWorkspace) {
  return workspace.stages
    .map((stage) => stageLabel(stage))
    .join(", ");
}

export function stageLabel(stage: ReportStage) {
  const labels: Record<ReportStage, string> = {
    "pre-launch": "Pre-launch",
    audit: "Audit",
    upgrade: "Upgrade",
    integration: "Integration"
  };

  return labels[stage];
}
