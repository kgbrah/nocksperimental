import { privateWorkspaces, workspaceStageCoverage } from "@/lib/report-history";
import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";

const reportRequiredFields = [
  "workspaceSlug",
  "reportId",
  "reportSlug",
  "fixtureId",
  "generatedAt",
  "status",
  "reportHash",
  "snapshotRoot",
  "signature",
  "invariantPacks"
];

const tokenRequiredClaims = [
  "workspaceSlug",
  "workspaceRole",
  "reportHash",
  "snapshotRoot",
  "signature",
  "generatedAt"
];

export function createWorkspaceUploadPolicy(workspaceSlug: string) {
  const workspace = privateWorkspaces.find((candidate) => candidate.slug === workspaceSlug);

  if (!workspace) {
    return null;
  }

  const canonicalUrl = `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}/upload-policy`;

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl,
    status: "auth-required",
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      plan: workspace.plan,
      visibility: workspace.visibility,
      stages: workspace.stages,
      stageCoverage: workspaceStageCoverage(workspace)
    },
    retention: {
      days: workspace.retentionDays,
      expiresFrom: "generatedAt",
      deletionMode: "policy-retained-until-storage-backend"
    },
    token: {
      tokenType: "workspace-report-upload",
      issuanceStatus: "not-issued",
      authenticationRequired: true,
      audience: `${registrySubject}/workspace-report-upload`,
      ttlSeconds: 900,
      requiredClaims: tokenRequiredClaims,
      futureEndpoint: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}/upload-token`
    },
    reportContract: {
      acceptedContentTypes: ["application/json", "text/markdown"],
      maxReportBytes: maxReportBytesForPlan(workspace.plan),
      requiredFields: reportRequiredFields,
      requiredEvidence: ["reportHash", "snapshotRoot", "signature", "invariantPacks"],
      allowedStages: workspace.stages
    },
    gates: {
      membership: "required",
      storage: "pending-durable-storage",
      evidenceCapsuleRequired: true,
      verifierRequired: true,
      billing: workspace.plan === "enterprise" ? "contract-required" : "workspace-plan-required"
    },
    links: {
      workspace: `${registryCanonicalBaseUrl}/workspaces/${workspace.slug}`,
      workspaceApi: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}`,
      evidence: `${registryCanonicalBaseUrl}/api/workspaces/${workspace.slug}/evidence`,
      uploadPolicy: canonicalUrl,
      reportHistory: `${registryCanonicalBaseUrl}/reports/history`
    }
  };
}

function maxReportBytesForPlan(plan: "team" | "audit" | "enterprise") {
  if (plan === "enterprise") {
    return 20971520;
  }

  if (plan === "audit") {
    return 10485760;
  }

  return 5242880;
}
