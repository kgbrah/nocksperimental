import launchEvidenceData from "@/data/launch-evidence.json";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { privateWorkspaces } from "@/lib/report-history";
import {
  computeBadgeFreshness,
  currentUpstreamAnchor,
  type BadgeFreshness,
  type BadgeSourceAnchor
} from "@/lib/trust-badge-freshness";

export type LaunchEvidenceSubjectType =
  | "nockapp"
  | "template"
  | "token"
  | "bridge"
  | "operator"
  | "other";
export type LaunchEvidenceCustomerLane = "builder-auditor" | "operator" | "integrator";
export type LaunchEvidenceCaseStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "verified"
  | "watch"
  | "blocked"
  | "closed";
export type LaunchEvidenceVisibility = "private" | "shared-link" | "public";
export type LaunchEvidenceSubmissionSource =
  | "lab"
  | "fakenet"
  | "vesl"
  | "workspace-upload"
  | "nockup"
  | "state-export"
  | "manual";
export type LaunchEvidenceSubmissionStatus = "accepted" | "attention" | "rejected" | "verified";
export type LaunchReadinessStatus = "verified" | "watch" | "blocked";
export type LaunchEvidenceCheckStatus = "pass" | "warn" | "fail";

export type LaunchEvidencePayment = {
  status: "prospective" | "quoted" | "invoiced" | "paid" | "waived";
  rail: "manual" | "usd" | "nock" | "x402" | "none";
  amount: number | null;
  currency: string | null;
  reference: string | null;
};

export type LaunchEvidenceCase = {
  caseId: string;
  workspaceSlug: string;
  subjectSlug: string;
  subjectName: string;
  subjectType: LaunchEvidenceSubjectType;
  customerLane: LaunchEvidenceCustomerLane;
  status: LaunchEvidenceCaseStatus;
  visibility: LaunchEvidenceVisibility;
  createdAt: string;
  updatedAt: string;
  requestedBy: string;
  payment: LaunchEvidencePayment;
  evidenceIds: string[];
  reportSlug: string;
  badgeId: string | null;
  sourceAnchor: BadgeSourceAnchor;
};

export type LaunchEvidenceSubmission = {
  evidenceId: string;
  caseId: string;
  sourceKind: LaunchEvidenceSubmissionSource;
  sourceUrl: string | null;
  submittedAt: string;
  submittedBy: string;
  status: LaunchEvidenceSubmissionStatus;
  reportHash: string;
  snapshotRoot: string;
  receiptId: string | null;
  redactionSummary: string;
};

export type LaunchEvidenceCheck = {
  id: string;
  label: string;
  status: LaunchEvidenceCheckStatus;
  summary: string;
};

export type LaunchReadinessReport = {
  reportSlug: string;
  caseId: string;
  summaryStatus: LaunchReadinessStatus;
  score: number;
  requiredChecks: LaunchEvidenceCheck[];
  recommendedChecks: LaunchEvidenceCheck[];
  evidenceSummary: string;
  reviewerNotes: string;
  publicSummary: string;
  generatedAt: string;
  reportHash: string;
  snapshotRoot: string;
};

export type LaunchEvidenceRegistry = {
  version: string;
  cases: LaunchEvidenceCase[];
  submissions: LaunchEvidenceSubmission[];
  reports: LaunchReadinessReport[];
};

export type ResolvedLaunchEvidenceCase = LaunchEvidenceCase & {
  workspaceName: string | null;
  freshness: BadgeFreshness;
  submissions: LaunchEvidenceSubmission[];
  report: LaunchReadinessReport;
  links: {
    api: string;
    page: string;
    verifier: string;
    workspace: string | null;
    badge: string | null;
  };
};

export type LaunchEvidenceVerificationInput = {
  caseId?: string | null;
  reportHash?: string | null;
  snapshotRoot?: string | null;
};

const registry = launchEvidenceData as LaunchEvidenceRegistry;

export const launchEvidenceCases = registry.cases.map(resolveLaunchEvidenceCase);

export function createLaunchEvidenceIndex() {
  const verifiedCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "verified");
  const watchCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "watch");
  const blockedCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "blocked");

  return {
    version: registry.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/launch-evidence`,
    upstreamAnchor: currentUpstreamAnchor(),
    totalCases: launchEvidenceCases.length,
    totalReports: registry.reports.length,
    totals: {
      verified: verifiedCases.length,
      watch: watchCases.length,
      blocked: blockedCases.length,
      builderAuditor: launchEvidenceCases.filter((entry) => entry.customerLane === "builder-auditor").length,
      operator: launchEvidenceCases.filter((entry) => entry.customerLane === "operator").length,
      integrator: launchEvidenceCases.filter((entry) => entry.customerLane === "integrator").length
    },
    freshnessSummary: summarizeFreshness(launchEvidenceCases),
    capabilities: [
      "launch-evidence-reports",
      "private-workspace-cases",
      "provider-neutral-payment-metadata",
      "public-launch-verification"
    ],
    cases: launchEvidenceCases
  };
}

export function launchEvidenceCaseForId(caseId: string) {
  return launchEvidenceCases.find((entry) => entry.caseId === caseId) ?? null;
}

export function launchEvidenceCasesForWorkspace(workspaceSlug: string) {
  return launchEvidenceCases.filter((entry) => entry.workspaceSlug === workspaceSlug);
}

export function verifyLaunchEvidenceReport(input: LaunchEvidenceVerificationInput) {
  const caseId = normalizeInput(input.caseId);
  const reportHash = normalizeInput(input.reportHash);
  const snapshotRoot = normalizeInput(input.snapshotRoot);
  const resolvedCase = caseId
    ? launchEvidenceCaseForId(caseId)
    : launchEvidenceCases.find((entry) =>
        Boolean(reportHash && entry.report.reportHash === reportHash) ||
        Boolean(snapshotRoot && entry.report.snapshotRoot === snapshotRoot)
      ) ?? null;
  const report = resolvedCase?.report ?? null;
  const checks = {
    caseMatched: Boolean(resolvedCase),
    reportHashMatched: Boolean(report && reportHash && report.reportHash === reportHash),
    snapshotRootMatched: Boolean(report && snapshotRoot && report.snapshotRoot === snapshotRoot),
    publicOrShared: Boolean(resolvedCase && resolvedCase.visibility !== "private")
  };
  const verified =
    checks.caseMatched && checks.reportHashMatched && checks.snapshotRootMatched && checks.publicOrShared;

  return {
    version: registry.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/launch-evidence/verify`,
    verified,
    caseId: resolvedCase?.caseId ?? caseId,
    reportSlug: report?.reportSlug ?? null,
    freshness: resolvedCase?.freshness ?? "unknown",
    sourceAnchor: resolvedCase?.sourceAnchor ?? null,
    query: {
      caseId,
      reportHash,
      snapshotRoot
    },
    checks,
    report: report
      ? {
          summaryStatus: report.summaryStatus,
          score: report.score,
          generatedAt: report.generatedAt,
          reportHash: report.reportHash,
          snapshotRoot: report.snapshotRoot
        }
      : null,
    links: {
      case: resolvedCase
        ? `${registryCanonicalBaseUrl}/launch-evidence/${encodePathSegment(resolvedCase.caseId)}`
        : null,
      api: resolvedCase
        ? `${registryCanonicalBaseUrl}/api/launch-evidence/${encodePathSegment(resolvedCase.caseId)}`
        : null
    }
  };
}

function resolveLaunchEvidenceCase(entry: LaunchEvidenceCase): ResolvedLaunchEvidenceCase {
  const report = registry.reports.find((candidate) => candidate.reportSlug === entry.reportSlug);

  if (!report) {
    throw new Error(`Launch Evidence case ${entry.caseId} references missing report ${entry.reportSlug}`);
  }

  if (report.caseId !== entry.caseId) {
    throw new Error(
      `Launch Evidence case ${entry.caseId} references report ${entry.reportSlug} for case ${report.caseId}`
    );
  }

  const workspace = privateWorkspaces.find((candidate) => candidate.slug === entry.workspaceSlug);
  const submissions = registry.submissions.filter((submission) =>
    submission.caseId === entry.caseId && entry.evidenceIds.includes(submission.evidenceId)
  );
  const submittedEvidenceIds = new Set(submissions.map((submission) => submission.evidenceId));
  const missingEvidenceIds = entry.evidenceIds.filter((evidenceId) => !submittedEvidenceIds.has(evidenceId));

  if (missingEvidenceIds.length > 0) {
    throw new Error(
      `Launch Evidence case ${entry.caseId} references missing same-case submissions: ${missingEvidenceIds.join(", ")}`
    );
  }

  return {
    ...entry,
    workspaceName: workspace?.name ?? null,
    freshness: computeBadgeFreshness(entry.sourceAnchor),
    submissions,
    report,
    links: {
      api: `/api/launch-evidence/${encodePathSegment(entry.caseId)}`,
      page: `/launch-evidence/${encodePathSegment(entry.caseId)}`,
      verifier:
        `/api/launch-evidence/verify?caseId=${encodeURIComponent(entry.caseId)}` +
        `&reportHash=${encodeURIComponent(report.reportHash)}` +
        `&snapshotRoot=${encodeURIComponent(report.snapshotRoot)}`,
      workspace: workspace ? `/workspaces/${encodePathSegment(workspace.slug)}` : null,
      badge: entry.badgeId ? `/trust/badges/${encodePathSegment(entry.badgeId)}` : null
    }
  };
}

function summarizeFreshness(cases: ResolvedLaunchEvidenceCase[]) {
  return cases.reduce(
    (summary, entry) => {
      summary[entry.freshness] += 1;
      return summary;
    },
    { fresh: 0, stale: 0, unknown: 0 } as Record<BadgeFreshness, number>
  );
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function normalizeInput(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
