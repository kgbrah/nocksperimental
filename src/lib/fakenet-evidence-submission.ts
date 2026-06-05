import { createFakenetConnectionProfile } from "@/lib/fakenet-connection-profile";
import type { LabRunReport, LabStatus } from "@/lib/lab-report";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

type FakenetEvidenceSubmissionInput = {
  connection?: {
    endpoint?: string | null;
    walletAddress?: string | null;
    networkId?: string | null;
    label?: string | null;
  } | null;
  reports?: unknown;
  report?: unknown;
};

type SubmittedReportSummary = {
  reportId: string;
  fixtureId: string;
  appSlug: string;
  generatedAt: string;
  status: LabStatus | "unknown";
  grpcEndpoint: string | null;
  walletAddress: string | null;
};

export function verifyFakenetEvidenceSubmission(input: FakenetEvidenceSubmissionInput) {
  const profile = createFakenetConnectionProfile(input.connection ?? {});
  const reports = normalizeReports(input);
  const summaries = reports.map(summarizeReport);
  const endpoint = profile.connection.endpoint.testEndpoint;
  const walletAddress = profile.connection.walletAddress;
  const reportIds = summaries.map((summary) => summary.reportId).filter(Boolean);
  const uniqueReportIds = new Set(reportIds);
  const checks = {
    profileAccepted: profile.accepted,
    reportsProvided: reports.length > 0,
    reportIdsUnique: uniqueReportIds.size === reportIds.length,
    localFakenetReportsOnly: reports.length > 0 && reports.every(isLocalFakenetReport),
    endpointsMatched: reports.length > 0 && reports.every((report) => reportEndpointMatched(report, endpoint)),
    walletMatched: reports.length > 0 && reports.every((report) => reportWalletMatched(report, walletAddress)),
    noFailedReports: reports.length > 0 && reports.every((report) => report.summary?.status !== "fail")
  };
  const accepted =
    checks.profileAccepted &&
    checks.reportsProvided &&
    checks.reportIdsUnique &&
    checks.localFakenetReportsOnly &&
    checks.endpointsMatched &&
    checks.walletMatched;
  const verified = accepted && checks.noFailedReports;
  const errors = collectErrors(checks);
  const generatedAt = summaries
    .map((summary) => summary.generatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? new Date(0).toISOString();

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`,
    accepted,
    verified,
    status: verified ? "verified" : accepted ? "attention" : "rejected",
    receiptId: accepted ? `fakenet_submission_${stableId(JSON.stringify({ endpoint, walletAddress, reportIds }))}` : null,
    generatedAt,
    profile: {
      connectionId: profile.connectionId,
      mode: profile.mode,
      endpoint: profile.connection.endpoint,
      walletAddress,
      networkId: profile.connection.networkId
    },
    summary: {
      reportCount: reports.length,
      passedReports: countReportsByStatus(reports, "pass"),
      failedReports: countReportsByStatus(reports, "fail"),
      warningReports: countReportsByStatus(reports, "warn"),
      endpoint,
      walletAddress
    },
    checks,
    errors,
    reports: summaries,
    links: {
      profile: profile.links.profile,
      connect: `${registryCanonicalBaseUrl}/api/fakenet/connect`,
      submit: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`,
      verify: createVerifyLink(generatedAt, reportIds, endpoint, walletAddress)
    }
  };
}

export function createFakenetEvidenceSubmissionHelp() {
  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`,
    method: "POST",
    description: "Submit bring-your-own fakenet report JSON and receive a stateless verification receipt.",
    body: {
      connection: {
        endpoint: "127.0.0.1:5555",
        walletAddress: "wallet address used by the fakenet reports",
        networkId: "local-fakenet"
      },
      reports: [".nocklab/local-fakenet-health.report.json"]
    },
    links: {
      connect: `${registryCanonicalBaseUrl}/api/fakenet/connect`,
      commands: `${registryCanonicalBaseUrl}/api/fakenet/commands`
    }
  };
}

function normalizeReports(input: FakenetEvidenceSubmissionInput): LabRunReport[] {
  if (Array.isArray(input.reports)) {
    return input.reports.filter(isReportLike) as LabRunReport[];
  }

  if (isReportLike(input.report)) {
    return [input.report as LabRunReport];
  }

  return [];
}

function isReportLike(value: unknown): value is Partial<LabRunReport> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "reportId" in value &&
      "fixtureId" in value &&
      "environment" in value &&
      "summary" in value
  );
}

function isLocalFakenetReport(report: LabRunReport) {
  return report.environment?.mode === "local-fakenet";
}

function reportEndpointMatched(report: LabRunReport, endpoint: string) {
  const endpoints = collectReportEndpoints(report);

  return endpoints.length > 0 && endpoints.every((candidate) => candidate === endpoint);
}

function collectReportEndpoints(report: LabRunReport) {
  return uniqueStrings([
    report.environment?.grpcEndpoint,
    ...report.steps.flatMap((step) => [step.adapter?.grpcEndpoint])
  ]);
}

function reportWalletMatched(report: LabRunReport, walletAddress: string) {
  const wallets = collectReportWallets(report);

  return wallets.length === 0 || wallets.every((candidate) => candidate === walletAddress);
}

function collectReportWallets(report: LabRunReport) {
  return uniqueStrings([
    report.environment?.balanceCheck?.address,
    ...report.steps.flatMap((step) => [step.adapter?.balance?.address])
  ]);
}

function summarizeReport(report: LabRunReport): SubmittedReportSummary {
  return {
    reportId: report.reportId,
    fixtureId: report.fixtureId,
    appSlug: report.app?.slug ?? "unknown",
    generatedAt: report.generatedAt,
    status: report.summary?.status ?? "unknown",
    grpcEndpoint: collectReportEndpoints(report)[0] ?? null,
    walletAddress: collectReportWallets(report)[0] ?? null
  };
}

function countReportsByStatus(reports: LabRunReport[], status: LabStatus) {
  return reports.filter((report) => report.summary?.status === status).length;
}

function collectErrors(checks: Record<string, boolean>) {
  const errors = [];

  if (!checks.profileAccepted) {
    errors.push("Connection profile was not accepted.");
  }

  if (!checks.reportsProvided) {
    errors.push("No fakenet report JSON was submitted.");
  }

  if (!checks.reportIdsUnique) {
    errors.push("Submitted report ids must be unique.");
  }

  if (!checks.localFakenetReportsOnly) {
    errors.push("Submitted reports must be local-fakenet reports.");
  }

  if (!checks.endpointsMatched) {
    errors.push("Report endpoints do not match the submitted fakenet connection.");
  }

  if (!checks.walletMatched) {
    errors.push("Report wallet addresses do not match the submitted fakenet connection.");
  }

  if (!checks.noFailedReports) {
    errors.push("One or more submitted fakenet reports failed.");
  }

  return errors;
}

function createVerifyLink(
  generatedAt: string,
  reportIds: string[],
  endpoint: string,
  walletAddress: string
) {
  const url = new URL(`${registryCanonicalBaseUrl}/api/fakenet/evidence/verify`);
  url.searchParams.set("generatedAt", generatedAt);
  reportIds.forEach((reportId) => url.searchParams.append("reportId", reportId));
  url.searchParams.set("grpcEndpoint", endpoint);
  url.searchParams.set("walletAddress", walletAddress);
  return url.toString();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function stableId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
