import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { LabRunReport, LabStatus } from "@/lib/lab-report";

export type GeneratedLabReportStatus = LabStatus | "missing";
export type GeneratedBadgeCandidateStatus = "ready" | "watch";
export type GeneratedBadgeCandidateSignatureStatus = "unsigned";

export type GeneratedLabReportEntry = {
  fixtureId: string;
  appSlug: string;
  appName: string;
  reportId: string;
  generatedAt: string;
  status: LabStatus;
  jsonPath: string;
  markdownPath?: string;
  reportHash: string;
  snapshotRoot: string;
  badgeCandidate: GeneratedBadgeCandidate;
  stepsPassed: number;
  stepsTotal: number;
  invariantsPassed: number;
  invariantsTotal: number;
  alertsTriggered: number;
  snapshotsCaptured: number;
  adapterObservationCount: number;
  invariantPackCount: number;
};

export type GeneratedBadgeCandidate = {
  id: string;
  label: string;
  reportSlug: string;
  fixtureId: string;
  status: GeneratedBadgeCandidateStatus;
  signatureStatus: GeneratedBadgeCandidateSignatureStatus;
  evidence: {
    reportHash: string;
    snapshotRoot: string;
    invariantPacks: string[];
  };
};

export type GeneratedLabReportIndex = {
  status: GeneratedLabReportStatus;
  generatedAt?: string;
  manifestPath: string;
  reportDir?: string;
  totals: GeneratedLabReportTotals;
  summary?: GeneratedLabReportSummary;
  reports: GeneratedLabReportEntry[];
};

export type GeneratedLabReportTotals = {
  reportCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  stepsPassed: number;
  stepsTotal: number;
  invariantsPassed: number;
  invariantsTotal: number;
  alertsTriggered: number;
  snapshotsCaptured: number;
  adapterObservationCount: number;
  invariantPackCount: number;
};

export type GeneratedLabReportSummary = {
  path: string;
  markdown: string;
  markdownPreview: string;
  lineCount: number;
};

export type GeneratedLabReportDetail = {
  entry: GeneratedLabReportEntry;
  report: LabRunReport;
  markdown: string;
  evidence: GeneratedLabReportEvidence;
};

export type GeneratedLabReportEvidence = {
  stateDiffCount: number;
  snapshotCount: number;
  alertCount: number;
  triggeredAlertCount: number;
  clearAlertCount: number;
  triggeredCriticalAlertCount: number;
  triggeredWarningAlertCount: number;
  triggeredInfoAlertCount: number;
  environmentMode: LabRunReport["environment"]["mode"];
  grpcEndpoint: string;
  environmentNoteCount: number;
  nextActionCount: number;
  firstNextAction: string;
  invariantPackCount: number;
  invariantPackIds: string[];
  invariantPackDomains: string[];
  firstInvariantPackPath: string;
  changedPaths: string[];
  markdownPreview: string;
};

type ManifestReportEntry = {
  fixture: string;
  app: string;
  status: LabStatus;
  json: string;
  markdown?: string;
};

type GeneratedReportManifest = {
  generatedAt?: string;
  reportDir?: string;
  status?: LabStatus;
  reports?: ManifestReportEntry[];
};

type LoadGeneratedLabReportsOptions = {
  rootDir?: string;
  manifestPath?: string;
};

export function loadGeneratedLabReports(
  options: LoadGeneratedLabReportsOptions = {}
): GeneratedLabReportIndex {
  const { rootDir, manifestPath } = resolveGeneratedLabReportRoot(options);

  if (!existsSync(manifestPath)) {
    return {
      status: "missing",
      manifestPath,
      totals: summarizeGeneratedReportTotals([]),
      reports: []
    };
  }

  const manifest = readJsonFile<GeneratedReportManifest>(manifestPath);
  const reports = (manifest.reports ?? []).map((reportEntry) =>
    loadGeneratedReportEntry(rootDir, reportEntry)
  );
  const summary = loadGeneratedReportSummary(rootDir, manifestPath, manifest.reportDir);

  return {
    status: manifest.status ?? summarizeReportStatuses(reports.map((report) => report.status)),
    generatedAt: manifest.generatedAt,
    manifestPath,
    reportDir: manifest.reportDir,
    totals: summarizeGeneratedReportTotals(reports),
    summary,
    reports
  };
}

export function loadGeneratedLabReport(
  options: LoadGeneratedLabReportsOptions & { appSlug: string }
): GeneratedLabReportDetail | null {
  const index = loadGeneratedLabReports(options);
  const entry = index.reports.find((report) => report.appSlug === options.appSlug);

  if (!entry) {
    return null;
  }

  const report = readJsonFile<LabRunReport>(entry.jsonPath);
  const markdown = entry.markdownPath && existsSync(entry.markdownPath)
    ? readFileSync(entry.markdownPath, "utf8")
    : "";

  return {
    entry,
    report,
    markdown,
    evidence: summarizeGeneratedReportEvidence(report, markdown)
  };
}

export function resolveGeneratedArtifactPath(rootDir: string, artifactPath: string) {
  const normalizedArtifactPath = artifactPath.replace(/\\/g, path.sep);

  if (path.isAbsolute(normalizedArtifactPath)) {
    return path.normalize(normalizedArtifactPath);
  }

  return path.normalize(path.join(rootDir, normalizedArtifactPath));
}

function resolveGeneratedLabReportRoot(options: LoadGeneratedLabReportsOptions) {
  const relativeManifestPath = options.manifestPath ?? ".nocklab/manifest.json";

  if (path.isAbsolute(relativeManifestPath)) {
    return {
      rootDir: options.rootDir ?? process.cwd(),
      manifestPath: path.normalize(relativeManifestPath)
    };
  }

  const rootCandidates = getGeneratedReportRootCandidates(options.rootDir);
  const firstRootDir = rootCandidates[0] ?? process.cwd();

  for (const rootDir of rootCandidates) {
    const manifestPath = resolveGeneratedArtifactPath(rootDir, relativeManifestPath);

    if (existsSync(manifestPath)) {
      return { rootDir, manifestPath };
    }
  }

  return {
    rootDir: firstRootDir,
    manifestPath: resolveGeneratedArtifactPath(firstRootDir, relativeManifestPath)
  };
}

function getGeneratedReportRootCandidates(explicitRootDir?: string) {
  if (explicitRootDir) {
    return [explicitRootDir];
  }

  const cwd = process.cwd();
  const rootCandidates = [
    cwd,
    path.join(cwd, "server-functions/default"),
    path.join(cwd, ".open-next/server-functions/default"),
    path.join(cwd, "..", "server-functions/default"),
    "/bundle/server-functions/default"
  ];

  return Array.from(new Set(rootCandidates.map((candidate) => path.normalize(candidate))));
}

function loadGeneratedReportEntry(
  rootDir: string,
  manifestEntry: ManifestReportEntry
): GeneratedLabReportEntry {
  const jsonPath = resolveGeneratedArtifactPath(rootDir, manifestEntry.json);
  const markdownPath = manifestEntry.markdown
    ? resolveGeneratedArtifactPath(rootDir, manifestEntry.markdown)
    : undefined;
  const reportJson = readFileSync(jsonPath);
  const report = JSON.parse(reportJson.toString("utf8")) as LabRunReport;
  const reportHash = hashReportBytes(reportJson);
  const snapshotRoot = getSnapshotRoot(report);

  return {
    fixtureId: report.fixtureId,
    appSlug: report.app.slug,
    appName: report.app.name,
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    status: report.summary.status,
    jsonPath,
    markdownPath,
    reportHash,
    snapshotRoot,
    badgeCandidate: buildGeneratedBadgeCandidate(report, reportHash, snapshotRoot),
    stepsPassed: report.summary.stepsPassed,
    stepsTotal: report.steps.length,
    invariantsPassed: report.summary.invariantsPassed,
    invariantsTotal: report.invariants.length,
    alertsTriggered: report.summary.alertsTriggered,
    snapshotsCaptured: report.summary.snapshotsCaptured,
    adapterObservationCount: report.adapterObservations.length,
    invariantPackCount: report.invariantPacks.length
  };
}

function readJsonFile<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function hashReportBytes(reportJson: Buffer) {
  return `sha256:${createHash("sha256").update(reportJson).digest("hex")}`;
}

function getSnapshotRoot(report: LabRunReport) {
  return report.stateSnapshots[report.stateSnapshots.length - 1]?.stateHash ?? "";
}

function buildGeneratedBadgeCandidate(
  report: LabRunReport,
  reportHash: string,
  snapshotRoot: string
): GeneratedBadgeCandidate {
  return {
    id: `badge-candidate-${report.app.slug}`,
    label: `${report.app.name} Verification Candidate`,
    reportSlug: report.app.slug,
    fixtureId: report.fixtureId,
    status: report.summary.status === "pass" ? "ready" : "watch",
    signatureStatus: "unsigned",
    evidence: {
      reportHash,
      snapshotRoot,
      invariantPacks: report.invariantPacks.map((pack) => pack.id)
    }
  };
}

function loadGeneratedReportSummary(
  rootDir: string,
  manifestPath: string,
  reportDir?: string
): GeneratedLabReportSummary | undefined {
  const summaryPath = reportDir
    ? resolveGeneratedArtifactPath(rootDir, path.join(reportDir, "summary.md"))
    : path.join(path.dirname(manifestPath), "summary.md");

  if (!existsSync(summaryPath)) {
    return undefined;
  }

  const markdown = readFileSync(summaryPath, "utf8");

  return {
    path: summaryPath,
    markdown,
    markdownPreview: getMarkdownPreview(markdown),
    lineCount: countMarkdownLines(markdown)
  };
}

function summarizeGeneratedReportTotals(
  reports: GeneratedLabReportEntry[]
): GeneratedLabReportTotals {
  return reports.reduce<GeneratedLabReportTotals>(
    (totals, report) => ({
      reportCount: totals.reportCount + 1,
      passCount: totals.passCount + (report.status === "pass" ? 1 : 0),
      warnCount: totals.warnCount + (report.status === "warn" ? 1 : 0),
      failCount: totals.failCount + (report.status === "fail" ? 1 : 0),
      stepsPassed: totals.stepsPassed + report.stepsPassed,
      stepsTotal: totals.stepsTotal + report.stepsTotal,
      invariantsPassed: totals.invariantsPassed + report.invariantsPassed,
      invariantsTotal: totals.invariantsTotal + report.invariantsTotal,
      alertsTriggered: totals.alertsTriggered + report.alertsTriggered,
      snapshotsCaptured: totals.snapshotsCaptured + report.snapshotsCaptured,
      adapterObservationCount: totals.adapterObservationCount + report.adapterObservationCount,
      invariantPackCount: totals.invariantPackCount + report.invariantPackCount
    }),
    {
      reportCount: 0,
      passCount: 0,
      warnCount: 0,
      failCount: 0,
      stepsPassed: 0,
      stepsTotal: 0,
      invariantsPassed: 0,
      invariantsTotal: 0,
      alertsTriggered: 0,
      snapshotsCaptured: 0,
      adapterObservationCount: 0,
      invariantPackCount: 0
    }
  );
}

function summarizeGeneratedReportEvidence(
  report: LabRunReport,
  markdown: string
): GeneratedLabReportEvidence {
  const triggeredAlerts = report.alerts.filter((alert) => alert.state === "triggered");

  return {
    stateDiffCount: report.stateDiffs.length,
    snapshotCount: report.stateSnapshots.length,
    alertCount: report.alerts.length,
    triggeredAlertCount: triggeredAlerts.length,
    clearAlertCount: report.alerts.filter((alert) => alert.state === "clear").length,
    triggeredCriticalAlertCount: triggeredAlerts.filter((alert) => alert.severity === "critical").length,
    triggeredWarningAlertCount: triggeredAlerts.filter((alert) => alert.severity === "warning").length,
    triggeredInfoAlertCount: triggeredAlerts.filter((alert) => alert.severity === "info").length,
    environmentMode: report.environment.mode,
    grpcEndpoint: report.environment.grpcEndpoint,
    environmentNoteCount: report.environment.notes.length,
    nextActionCount: report.nextActions.length,
    firstNextAction: report.nextActions[0] ?? "",
    invariantPackCount: report.invariantPacks.length,
    invariantPackIds: report.invariantPacks.map((pack) => pack.id),
    invariantPackDomains: Array.from(
      new Set(report.invariantPacks.map((pack) => pack.domain).filter(Boolean))
    ) as string[],
    firstInvariantPackPath: report.invariantPacks[0]?.path ?? "",
    changedPaths: report.stateDiffs.map((diff) => diff.path),
    markdownPreview: getMarkdownPreview(markdown)
  };
}

function getMarkdownPreview(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? "";
}

function countMarkdownLines(markdown: string) {
  return markdown.length === 0 ? 0 : markdown.replace(/\r\n/g, "\n").split("\n").length;
}

function summarizeReportStatuses(statuses: LabStatus[]): LabStatus {
  if (statuses.includes("fail")) {
    return "fail";
  }

  if (statuses.includes("warn")) {
    return "warn";
  }

  return "pass";
}
