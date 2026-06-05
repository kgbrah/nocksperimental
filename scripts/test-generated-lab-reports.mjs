#!/usr/bin/env node

import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { loadGeneratedLabReport, loadGeneratedLabReports } = await loadGeneratedLabReportsModule();

  await testLoadsReportsFromGeneratedManifest(loadGeneratedLabReports);
  await testLoadsReportDetailFromGeneratedManifest(loadGeneratedLabReport);
  await testMissingManifestReturnsEmptyIndex(loadGeneratedLabReports);
}

async function testLoadsReportsFromGeneratedManifest(loadGeneratedLabReports) {
  const rootDir = await createGeneratedReportRoot();
  const index = loadGeneratedLabReports({ rootDir });
  const firstReportHash = await hashFile(path.join(rootDir, ".nocklab", "hello-counter.report.json"));

  assertEqual(index.status, "warn", "generated index status");
  assertEqual(index.reports.length, 2, "generated index report count");
  assertEqual(index.reports[0].fixtureId, "hello-counter-v0", "first fixture id");
  assertEqual(index.reports[0].appName, "Hello Counter", "first app name");
  assertEqual(index.reports[0].reportId, "lab_hello_001", "first report id");
  assertEqual(index.reports[0].stepsPassed, 2, "first steps passed");
  assertEqual(index.reports[0].jsonPath, path.join(rootDir, ".nocklab", "hello-counter.report.json"), "first json path");
  assertEqual(index.reports[0].reportHash, firstReportHash, "first report hash");
  assertEqual(index.reports[0].badgeCandidate.id, "badge-candidate-hello-counter", "first badge candidate id");
  assertEqual(index.reports[0].badgeCandidate.status, "ready", "first badge candidate status");
  assertEqual(index.reports[0].badgeCandidate.signatureStatus, "unsigned", "first badge candidate signature status");
  assertEqual(index.reports[0].badgeCandidate.evidence.reportHash, firstReportHash, "first badge candidate hash");
  assertEqual(index.reports[1].status, "warn", "second status");
  assertEqual(index.reports[1].adapterObservationCount, 1, "second adapter observation count");
  assertEqual(index.reports[1].invariantPackCount, 1, "second invariant pack count");
  assertEqual(index.reports[1].snapshotRoot, "abc002", "second snapshot root");
  assertEqual(index.reports[1].badgeCandidate.status, "watch", "second badge candidate status");
  assertEqual(index.reports[1].badgeCandidate.evidence.snapshotRoot, "abc002", "second badge candidate snapshot root");
  assertEqual(index.reports[1].badgeCandidate.evidence.invariantPacks.join(","), "local", "second badge candidate packs");
  assertEqual(index.totals.reportCount, 2, "totals report count");
  assertEqual(index.totals.passCount, 1, "totals pass count");
  assertEqual(index.totals.warnCount, 1, "totals warn count");
  assertEqual(index.totals.failCount, 0, "totals fail count");
  assertEqual(index.totals.stepsPassed, 3, "totals steps passed");
  assertEqual(index.totals.stepsTotal, 3, "totals steps total");
  assertEqual(index.totals.invariantsPassed, 1, "totals invariants passed");
  assertEqual(index.totals.invariantsTotal, 1, "totals invariants total");
  assertEqual(index.totals.alertsTriggered, 1, "totals alerts triggered");
  assertEqual(index.totals.snapshotsCaptured, 5, "totals snapshots captured");
  assertEqual(index.totals.adapterObservationCount, 1, "totals adapter observation count");
  assertEqual(index.totals.invariantPackCount, 1, "totals invariant pack count");
  assertEqual(index.summary.path, path.join(rootDir, ".nocklab", "summary.md"), "summary path");
  assertEqual(index.summary.markdownPreview, "# NockApp Lab CI Summary", "summary markdown preview");
  assertEqual(index.summary.lineCount, 4, "summary line count");
  assertIncludes(index.summary.markdown, "| local-fakenet-v0 | local-fakenet | warn |", "summary markdown");
}

async function testLoadsReportDetailFromGeneratedManifest(loadGeneratedLabReport) {
  const rootDir = await createGeneratedReportRoot();
  const detail = loadGeneratedLabReport({ rootDir, appSlug: "local-fakenet" });

  assertEqual(detail.entry.appSlug, "local-fakenet", "detail entry app slug");
  assertEqual(detail.report.fixtureId, "local-fakenet-v0", "detail report fixture id");
  assertEqual(detail.report.app.name, "Local Fakenet", "detail report app name");
  assertEqual(detail.markdown.trim(), "# Local Fakenet", "detail markdown");
  assertEqual(detail.entry.adapterObservationCount, 1, "detail adapter observation count");
  assertEqual(detail.entry.jsonPath, path.join(rootDir, ".nocklab", "local-fakenet.report.json"), "detail json path");
  assertEqual(detail.evidence.stateDiffCount, 1, "detail state diff count");
  assertEqual(detail.evidence.snapshotCount, 2, "detail snapshot count");
  assertEqual(detail.evidence.changedPaths.join(","), "counter", "detail changed paths");
  assertEqual(detail.evidence.markdownPreview, "# Local Fakenet", "detail markdown preview");
  assertEqual(detail.evidence.alertCount, 2, "detail alert count");
  assertEqual(detail.evidence.triggeredAlertCount, 1, "detail triggered alert count");
  assertEqual(detail.evidence.clearAlertCount, 1, "detail clear alert count");
  assertEqual(detail.evidence.triggeredWarningAlertCount, 1, "detail warning alert count");
  assertEqual(detail.evidence.triggeredCriticalAlertCount, 0, "detail critical alert count");
  assertEqual(detail.evidence.environmentMode, "local-fakenet", "detail environment mode");
  assertEqual(detail.evidence.grpcEndpoint, "127.0.0.1:5555", "detail grpc endpoint");
  assertEqual(detail.evidence.environmentNoteCount, 2, "detail environment note count");
  assertEqual(detail.evidence.nextActionCount, 2, "detail next action count");
  assertEqual(detail.evidence.firstNextAction, "Connect NockApp poke adapter.", "detail first next action");
  assertEqual(detail.evidence.invariantPackCount, 1, "detail invariant pack count");
  assertEqual(detail.evidence.invariantPackIds.join(","), "local", "detail invariant pack ids");
  assertEqual(detail.evidence.invariantPackDomains.join(","), "fakenet", "detail invariant pack domains");
  assertEqual(detail.evidence.firstInvariantPackPath, "packs/local.json", "detail first invariant pack path");
  assertEqual(detail.entry.badgeCandidate.reportSlug, "local-fakenet", "detail badge candidate report slug");
  assertEqual(detail.entry.badgeCandidate.signatureStatus, "unsigned", "detail badge candidate signature status");
  assertEqual(loadGeneratedLabReport({ rootDir, appSlug: "missing-app" }), null, "missing detail");
}

async function createGeneratedReportRoot() {
  const rootDir = await mkdtemp(path.join(tmpdir(), "nocklab-generated-reports-"));
  const reportDir = path.join(rootDir, ".nocklab");
  await mkdir(reportDir, { recursive: true });

  await writeFixtureReport(path.join(reportDir, "hello-counter.report.json"), {
    reportId: "lab_hello_001",
    fixtureId: "hello-counter-v0",
    generatedAt: "2026-06-04T10:00:00.000Z",
    app: {
      name: "Hello Counter",
      slug: "hello-counter",
      version: "0.0.1",
      kernel: "counter"
    },
    summary: {
      status: "pass",
      stepsPassed: 2,
      stepsFailed: 0,
      invariantsPassed: 1,
      invariantsFailed: 0,
      alertsClear: 0,
      alertsTriggered: 0,
      snapshotsCaptured: 3,
      durationMs: 42
    },
    steps: [{ id: "boot-hello" }, { id: "poke-hello" }],
    invariants: [{ id: "hello-counter-nonnegative" }],
    invariantPacks: [],
    adapterObservations: []
  });
  await writeFile(path.join(reportDir, "hello-counter.report.md"), "# Hello Counter\n");

  await writeFixtureReport(path.join(reportDir, "local-fakenet.report.json"), {
    reportId: "lab_local_001",
    fixtureId: "local-fakenet-v0",
    generatedAt: "2026-06-04T10:01:00.000Z",
    app: {
      name: "Local Fakenet",
      slug: "local-fakenet",
      version: "0.0.1",
      kernel: "fakenet"
    },
    environment: {
      mode: "local-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      fakenetCommand: "fakenock --start",
      notes: ["node synced", "miner warm"]
    },
    summary: {
      status: "warn",
      stepsPassed: 1,
      stepsFailed: 0,
      invariantsPassed: 0,
      invariantsFailed: 0,
      alertsClear: 1,
      alertsTriggered: 1,
      snapshotsCaptured: 2,
      durationMs: 64
    },
    steps: [{ id: "boot-local" }],
    invariantPacks: [
      {
        id: "local",
        name: "Local",
        domain: "fakenet",
        version: "0.1.0",
        path: "packs/local.json"
      }
    ],
    stateDiffs: [
      {
        path: "counter",
        before: "0",
        after: "1"
      }
    ],
    stateSnapshots: [
      {
        label: "Initial state",
        stateHash: "abc001",
        state: { counter: 0 }
      },
      {
        label: "After boot-local",
        stepId: "boot-local",
        stateHash: "abc002",
        state: { counter: 1 }
      }
    ],
    adapterObservations: [
      {
        stepId: "boot-local",
        kind: "local-fakenet",
        capability: "health",
        status: "pass",
        target: "127.0.0.1:5555",
        summary: "gRPC endpoint reachable at 127.0.0.1:5555",
        checkedAt: "2026-06-04T10:01:00.000Z"
      }
    ],
    alerts: [
      {
        id: "local-peer-lag",
        title: "Local peer lag",
        severity: "warning",
        state: "triggered",
        observed: "peer lag=3",
        condition: "peers.lag == 3",
        message: "Local fakenet peer lag crossed the warning threshold."
      },
      {
        id: "local-funds",
        title: "Local wallet funded",
        severity: "critical",
        state: "clear",
        observed: "wallet funded",
        condition: "wallet.balance == 0",
        message: "Wallet has test funds."
      }
    ],
    nextActions: [
      "Connect NockApp poke adapter.",
      "Re-run with live balance check."
    ]
  });
  await writeFile(path.join(reportDir, "local-fakenet.report.md"), "# Local Fakenet\n");
  await writeFile(
    path.join(reportDir, "summary.md"),
    [
      "# NockApp Lab CI Summary",
      "",
      "| Fixture | App | Status |",
      "| local-fakenet-v0 | local-fakenet | warn |"
    ].join("\n")
  );

  await writeFile(
    path.join(reportDir, "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: "2026-06-04T10:02:00.000Z",
        config: "nocklab.config.json",
        reportDir: ".nocklab",
        status: "warn",
        reports: [
          {
            fixture: "hello-counter-v0",
            app: "hello-counter",
            status: "pass",
            json: ".nocklab\\hello-counter.report.json",
            markdown: ".nocklab\\hello-counter.report.md"
          },
          {
            fixture: "local-fakenet-v0",
            app: "local-fakenet",
            status: "warn",
            json: ".nocklab\\local-fakenet.report.json",
            markdown: ".nocklab\\local-fakenet.report.md"
          }
        ]
      },
      null,
      2
    )}\n`
  );

  return rootDir;
}

async function testMissingManifestReturnsEmptyIndex(loadGeneratedLabReports) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "nocklab-missing-reports-"));
  const index = loadGeneratedLabReports({ rootDir });

  assertEqual(index.status, "missing", "missing index status");
  assertEqual(index.reports.length, 0, "missing index report count");
  assertEqual(index.totals.reportCount, 0, "missing totals report count");
  assertIncludes(index.manifestPath, path.join(rootDir, ".nocklab", "manifest.json"), "missing manifest path");
}

async function writeFixtureReport(filePath, partial) {
  const report = {
    environment: {
      mode: "mock-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      fakenetCommand: "fakenet",
      notes: []
    },
    steps: [],
    invariants: [],
    alerts: [],
    stateSnapshots: [],
    stateDiffs: [],
    nextActions: [],
    ...partial
  };

  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

async function loadGeneratedLabReportsModule() {
  const modulePath = path.join(process.cwd(), "src", "lib", "generated-lab-reports.ts");
  const source = await readFile(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, require, compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

async function hashFile(filePath) {
  const bytes = await readFile(filePath);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
