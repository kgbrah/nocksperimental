import historyData from "@/data/report-history.json";
import workspaceData from "@/data/private-workspaces.json";

export type ReportStage = "pre-launch" | "audit" | "upgrade" | "integration";
export type ReportStatus = "pass" | "warn" | "fail";
export type WorkspacePlan = "team" | "audit" | "enterprise";
export type WorkspaceEnvironment = "mock-fakenet" | "local-fakenet" | "docker-fakenet";

export type ReportHistoryEntry = {
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

export const reportHistory = historyData.reports as ReportHistoryEntry[];
export const privateWorkspaces = workspaceData.workspaces as PrivateWorkspace[];

export const reportStages: ReportStage[] = ["pre-launch", "audit", "upgrade", "integration"];

export function reportsForWorkspace(workspaceSlug: string) {
  return reportHistory.filter((report) => report.workspaceSlug === workspaceSlug);
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
