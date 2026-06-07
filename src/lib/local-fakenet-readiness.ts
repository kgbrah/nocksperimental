import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  BalanceObservation,
  ChainObservation,
  LabRunReport,
  LabStatus
} from "@/lib/lab-report";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import {
  createAvailablePeeksInventory,
  createFakenetConnectionProfile
} from "@/lib/fakenet-connection-profile";

type LocalFakenetReadinessStatus = "ready" | "degraded" | "blocked" | "missing";
type LocalFakenetCheckStatus = "pass" | "fail" | "missing";

type LocalFakenetReportSummary = {
  appSlug: string;
  fixtureId: string;
  reportId: string;
  generatedAt: string;
  status: LabStatus;
  path: string;
};

type LocalFakenetReadinessOptions = {
  rootDir?: string;
};

const localReportPriority = [
  "local-fakenet-health",
  "local-fakenet-balance",
  "local-fakenet-chain",
  "local-fakenet-peek",
  "local-fakenet-poke"
];

export function createLocalFakenetReadiness(
  options: LocalFakenetReadinessOptions = {}
) {
  const { reportDir, reports } = loadLocalFakenetReports(options.rootDir);
  const healthReport = reports.find((report) => report.app.slug === "local-fakenet-health");
  const balanceReport = reports.find((report) => report.app.slug === "local-fakenet-balance");
  const chainReport = reports.find((report) => report.app.slug === "local-fakenet-chain");
  const balance = findBalanceObservation(reports);
  const chain = findChainObservation(reports);
  const endpoint = findEndpoint(reports);
  const checks = {
    health: healthReport ? reportCheckStatus(healthReport) : ("missing" as const),
    balance: balanceReport ? reportCheckStatus(balanceReport) : ("missing" as const),
    chain: chainReport ? reportCheckStatus(chainReport) : ("missing" as const)
  };
  const failures = collectFailures(reports, checks);
  const status = summarizeReadinessStatus(reports, checks);
  const generatedAt = latestGeneratedAt(reports);
  const peeks = createAvailablePeeksInventory(
    createFakenetConnectionProfile({ endpoint }),
    reports
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet`,
    status,
    generatedAt,
    reportDir,
    reportCount: reports.length,
    endpoint,
    wallet: summarizeWallet(balanceReport, balance),
    chain: summarizeChain(chain),
    checks,
    failures,
    peeks,
    reports: reports.map(summarizeReport)
  };
}

function loadLocalFakenetReports(explicitRootDir?: string) {
  const rootCandidates = getLocalFakenetRootCandidates(explicitRootDir);

  for (const rootDir of rootCandidates) {
    const reportDir = path.join(rootDir, ".nocklab");

    if (!existsSync(reportDir)) {
      continue;
    }

    const reports = readdirSync(reportDir)
      .filter((fileName) => /^local-fakenet.*\.report\.json$/.test(fileName))
      .map((fileName) => ({
        path: path.join(reportDir, fileName),
        report: readJsonFile<LabRunReport>(path.join(reportDir, fileName))
      }))
      .filter(({ report }) => report.environment?.mode === "local-fakenet")
      .sort((left, right) => reportSortKey(left.report).localeCompare(reportSortKey(right.report)));

    return {
      reportDir,
      reports: reports.map(({ path: reportPath, report }) => ({
        ...report,
        __path: reportPath
      })) as Array<LabRunReport & { __path: string }>
    };
  }

  const firstRoot = rootCandidates[0] ?? process.cwd();

  return {
    reportDir: path.join(firstRoot, ".nocklab"),
    reports: [] as Array<LabRunReport & { __path: string }>
  };
}

function getLocalFakenetRootCandidates(explicitRootDir?: string) {
  if (explicitRootDir) {
    return [path.normalize(explicitRootDir)];
  }

  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, "server-functions/default"),
    path.join(cwd, ".open-next/server-functions/default"),
    path.join(cwd, "..", "server-functions/default"),
    "/bundle/server-functions/default"
  ];

  return Array.from(new Set(candidates.map((candidate) => path.normalize(candidate))));
}

function readJsonFile<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function reportSortKey(report: LabRunReport) {
  const priority = localReportPriority.indexOf(report.app.slug);
  const priorityValue = priority === -1 ? localReportPriority.length : priority;

  return `${priorityValue.toString().padStart(2, "0")}:${report.generatedAt}:${report.app.slug}`;
}

function reportCheckStatus(report: LabRunReport): LocalFakenetCheckStatus {
  return report.summary.status === "fail" ? "fail" : "pass";
}

function findEndpoint(reports: LabRunReport[]) {
  for (const report of reports) {
    const endpoint = report.environment?.grpcEndpoint ?? report.steps[0]?.adapter?.grpcEndpoint;

    if (endpoint) {
      return endpoint;
    }
  }

  return null;
}

function findBalanceObservation(reports: LabRunReport[]) {
  for (const report of reports) {
    for (const step of report.steps) {
      if (step.adapter?.balance) {
        return step.adapter.balance;
      }
    }
  }

  return undefined;
}

function findChainObservation(reports: LabRunReport[]) {
  for (const report of reports) {
    for (const step of report.steps) {
      if (step.adapter?.chain) {
        return step.adapter.chain;
      }
    }
  }

  return undefined;
}

function summarizeWallet(report: LabRunReport | undefined, balance: BalanceObservation | undefined) {
  const configuredAddress = report?.environment.balanceCheck?.address;

  return {
    status: balance?.status ?? (report ? "missing" : "missing"),
    address: balance?.address ?? configuredAddress ?? null,
    amount: balance?.amount ?? null,
    unit: balance?.unit ?? "NOCK",
    checkedAt: balance?.checkedAt ?? null,
    error: balance?.error ?? null
  };
}

function summarizeChain(chain: ChainObservation | undefined) {
  return {
    status: chain?.status ?? "missing",
    height: chain?.height ?? null,
    peerCount: chain?.peerCount ?? null,
    blockId: chain?.blockId ?? null,
    blockCommitment: chain?.blockCommitment ?? null,
    checkedAt: chain?.checkedAt ?? null,
    error: chain?.error ?? null
  };
}

function collectFailures(
  reports: LabRunReport[],
  checks: Record<"health" | "balance" | "chain", LocalFakenetCheckStatus>
) {
  if (reports.length === 0) {
    return ["No local fakenet reports found in .nocklab."];
  }

  const failures = reports
    .filter((report) => report.summary.status === "fail")
    .flatMap((report) =>
      report.steps
        .filter((step) => step.status === "fail")
        .map((step) => `${report.app.slug}: ${step.observed}`)
    );

  if (checks.health === "missing") {
    failures.push("health: no local fakenet health report found");
  }

  return failures;
}

function summarizeReadinessStatus(
  reports: LabRunReport[],
  checks: Record<"health" | "balance" | "chain", LocalFakenetCheckStatus>
): LocalFakenetReadinessStatus {
  if (reports.length === 0) {
    return "missing";
  }

  if (Object.values(checks).includes("fail") || reports.some((report) => report.summary.status === "fail")) {
    return "blocked";
  }

  if (Object.values(checks).includes("missing") || reports.some((report) => report.summary.status === "warn")) {
    return "degraded";
  }

  return "ready";
}

function latestGeneratedAt(reports: LabRunReport[]) {
  const latest = reports
    .map((report) => report.generatedAt)
    .sort()
    .at(-1);

  return latest ?? new Date(0).toISOString();
}

function summarizeReport(report: LabRunReport & { __path?: string }): LocalFakenetReportSummary {
  return {
    appSlug: report.app.slug,
    fixtureId: report.fixtureId,
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    status: report.summary.status,
    path: report.__path ?? ""
  };
}
