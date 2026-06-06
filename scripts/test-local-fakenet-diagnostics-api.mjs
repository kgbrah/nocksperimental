#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/diagnostics/route.ts");
  const readyRoot = await createDiagnosticsRoot("ready");
  const blockedRoot = await createDiagnosticsRoot("blocked");
  const peerFaultRoot = await createDiagnosticsRoot("peer-fault");
  const missingRoot = await mkdtemp(path.join(tmpdir(), "nocklab-fakenet-diagnostics-missing-"));
  const originalCwd = process.cwd();

  try {
    process.chdir(blockedRoot);
    const blockedResponse = await GET();
    const blockedBody = await blockedResponse.json();

    assertEqual(blockedResponse.status, 200, "blocked response status");
    assertEqual(blockedBody.version, "v0", "blocked version");
    assertEqual(blockedBody.service, "nocksperimental", "blocked service");
    assertEqual(blockedBody.subject, "nocksperimental.com", "blocked subject");
    assertEqual(
      blockedBody.canonicalUrl,
      "https://nocksperimental.com/api/fakenet/diagnostics",
      "blocked canonical URL"
    );
    assertEqual(blockedBody.readiness.status, "blocked", "blocked readiness status");
    assertEqual(blockedBody.activeCount, 4, "blocked active count");
    assertDiagnostic(blockedBody, "grpc-unreachable", "blocker", "fakenock --start");
    assertDiagnostic(blockedBody, "fakenock-missing", "blocker", "fakenock --balance");
    assertDiagnostic(blockedBody, "balance-check-failed", "blocker", "fakenock --balance");
    assertDiagnostic(blockedBody, "chain-report-missing", "warning", "npm run lab:local:chain");
    assertIncludes(
      blockedBody.diagnostics.map((diagnostic) => diagnostic.evidence).join("\n"),
      "ECONNREFUSED",
      "blocked evidence includes gRPC refusal"
    );
    assertEqual(blockedBody.links.readiness, "https://nocksperimental.com/api/fakenet", "readiness link");
    assertEqual(blockedBody.links.commands, "https://nocksperimental.com/api/fakenet/commands", "commands link");
    assertEqual(blockedBody.links.runbook, "https://nocksperimental.com/api/fakenet/runbook.sh", "runbook link");

    process.chdir(readyRoot);
    const readyResponse = await GET();
    const readyBody = await readyResponse.json();

    assertEqual(readyResponse.status, 200, "ready response status");
    assertEqual(readyBody.readiness.status, "ready", "ready readiness status");
    assertEqual(readyBody.activeCount, 0, "ready active count");
    assertEqual(readyBody.diagnostics[0].id, "local-fakenet-ready", "ready diagnostic id");
    assertEqual(readyBody.diagnostics[0].severity, "info", "ready diagnostic severity");

    process.chdir(peerFaultRoot);
    const peerFaultResponse = await GET();
    const peerFaultBody = await peerFaultResponse.json();

    assertEqual(peerFaultResponse.status, 200, "peer fault response status");
    assertEqual(peerFaultBody.readiness.status, "blocked", "peer fault readiness status");
    assertEqual(peerFaultBody.activeCount, 2, "peer fault active count");
    assertDiagnostic(peerFaultBody, "no-connected-peers", "warning", "npm run lab:local:chain");
    assertDiagnostic(peerFaultBody, "block-commitment-mismatch", "blocker", "npm run lab:local:chain");
    assertEqual(
      peerFaultBody.nockchainTriage.upstream.commit.shortSha,
      "33ba97b1e206",
      "peer fault upstream commit"
    );
    assertEqual(
      peerFaultBody.nockchainTriage.upstream.protocol.next.codename,
      "Nous",
      "peer fault protocol context"
    );
    assertIncludes(
      peerFaultBody.nockchainTriage.upstream.latestSignal,
      "suppress all outgoing gossip while catching up",
      "peer fault gossip suppression signal"
    );
    assertTriageIssue(peerFaultBody, "empty-routing-table", "observed");
    assertTriageIssue(peerFaultBody, "no-connected-peers", "observed");
    assertTriageIssue(peerFaultBody, "wrong-block-commitment", "observed");
    assertIncludes(
      peerFaultBody.nockchainTriage.operatorChecks.join("\n"),
      "Confirm the node is caught up to the fakenet tip before mining",
      "peer fault sync operator check"
    );
    assertIncludes(
      peerFaultBody.nockchainTriage.stateArtifactSafety.metadataToTrack.join("\n"),
      "source URL or Drive folder id",
      "peer fault state artifact provenance"
    );
    assertEqual(
      peerFaultBody.nockchainTriage.links.upstream,
      "https://nocksperimental.com/api/nockchain/upstream",
      "peer fault upstream link"
    );

    process.chdir(missingRoot);
    const missingResponse = await GET();
    const missingBody = await missingResponse.json();

    assertEqual(missingResponse.status, 200, "missing response status");
    assertEqual(missingBody.readiness.status, "missing", "missing readiness status");
    assertDiagnostic(missingBody, "reports-missing", "warning", "npm run lab:local");
  } finally {
    process.chdir(originalCwd);
  }

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "local-fakenet-diagnostics",
    "/api/fakenet/diagnostics",
    "Local fakenet diagnostics"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/diagnostics"]?.get?.summary,
    "Local fakenet diagnostics",
    "OpenAPI fakenet diagnostics path"
  );

  const pageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(pageSource, "createLocalFakenetDiagnostics", "fakenet page diagnostics data");
  assertIncludes(pageSource, 'href="/api/fakenet/diagnostics"', "fakenet page diagnostics API link");
  assertIncludes(pageSource, "diagnostics.diagnostics.map", "fakenet page renders diagnostics");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-diagnostics-api"],
    "node scripts/test-local-fakenet-diagnostics-api.mjs",
    "package diagnostics test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:local-fakenet-diagnostics-api",
    "full test includes diagnostics test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/diagnostics", "Cloudflare smoke includes fakenet diagnostics API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/diagnostics", "deployment docs include fakenet diagnostics API");
}

async function createDiagnosticsRoot(mode) {
  const rootDir = await mkdtemp(path.join(tmpdir(), `nocklab-fakenet-diagnostics-${mode}-`));
  const reportDir = path.join(rootDir, ".nocklab");

  await mkdir(reportDir, { recursive: true });
  await writeReport(path.join(reportDir, "local-fakenet-health.report.json"), createReport({
    appSlug: "local-fakenet-health",
    appName: "Local Fakenet Health",
    fixtureId: "local-fakenet-health-v0",
    generatedAt: "2026-06-04T10:00:00.000Z",
    status: mode === "blocked" ? "fail" : "pass",
    observed: mode === "blocked"
      ? "gRPC endpoint not reachable at 127.0.0.1:5555: connect ECONNREFUSED 127.0.0.1:5555"
      : "local-fakenet gRPC endpoint reachable at 127.0.0.1:5555",
    adapter: {
      kind: "local-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      reachable: mode !== "blocked",
      latencyMs: mode === "blocked" ? undefined : 4,
      checkedAt: "2026-06-04T10:00:00.010Z",
      ...(mode === "blocked" ? { error: "connect ECONNREFUSED 127.0.0.1:5555" } : {})
    }
  }));

  await writeReport(path.join(reportDir, "local-fakenet-balance.report.json"), createReport({
    appSlug: "local-fakenet-balance",
    appName: "Local Fakenet Balance",
    fixtureId: "local-fakenet-balance-v0",
    generatedAt: "2026-06-04T10:01:00.000Z",
    status: mode === "blocked" ? "fail" : "pass",
    observed: mode === "blocked"
      ? "balance peek failed for wallet: spawn fakenock ENOENT"
      : "local-fakenet wallet balance 7012352 NOCK",
    adapter: {
      kind: "local-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      reachable: true,
      latencyMs: 5,
      checkedAt: "2026-06-04T10:01:00.010Z",
      balance: mode === "blocked"
        ? {
            status: "fail",
            address: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
            unit: "NOCK",
            raw: "",
            checkedAt: "2026-06-04T10:01:00.020Z",
            error: "spawn fakenock ENOENT"
          }
        : {
            status: "pass",
            address: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
            amount: 7012352,
            unit: "NOCK",
            raw: "Balance: 7,012,352 NOCK",
            checkedAt: "2026-06-04T10:01:00.020Z"
          }
    }
  }));

  if (mode === "ready" || mode === "peer-fault") {
    const chainFailed = mode === "peer-fault";

    await writeReport(path.join(reportDir, "local-fakenet-chain.report.json"), createReport({
      appSlug: "local-fakenet-chain",
      appName: "Local Fakenet Chain",
      fixtureId: "local-fakenet-chain-v0",
      generatedAt: "2026-06-04T10:02:00.000Z",
      status: chainFailed ? "fail" : "pass",
      observed: chainFailed
        ? "routing table is empty; no connected peers; wrong block commitment expected 0xexpected got 0xactual"
        : "local-fakenet chain height 128 with 3 peers",
      adapter: {
        kind: "local-fakenet",
        grpcEndpoint: "127.0.0.1:5555",
        reachable: true,
        latencyMs: 6,
        checkedAt: "2026-06-04T10:02:00.010Z",
        chain: {
          status: chainFailed ? "fail" : "pass",
          height: 128,
          peerCount: chainFailed ? 0 : 3,
          blockId: "block-001",
          blockCommitment: chainFailed ? "0xactual" : "0xabc123def456",
          raw: chainFailed
            ? "height: 128\nrouting table is empty\nconnected peers: 0\nwrong block commitment expected 0xexpected got 0xactual"
            : "height: 128\nconnected peers: 3\nblock commitment: 0xabc123def456",
          checkedAt: "2026-06-04T10:02:00.020Z",
          ...(chainFailed ? { error: "routing table is empty; no connected peers; wrong block commitment" } : {})
        }
      }
    }));
  }

  return rootDir;
}

function createReport({ appSlug, appName, fixtureId, generatedAt, status, observed, adapter }) {
  return {
    reportId: `lab_${fixtureId}`,
    fixtureId,
    generatedAt,
    app: {
      name: appName,
      slug: appSlug,
      version: "0.0.1",
      kernel: "nockchain-local-fakenet"
    },
    environment: {
      mode: "local-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      fakenetCommand: "fakenock --start",
      balanceCheck: {
        address: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
        command: {
          program: "fakenock",
          args: ["--balance"]
        }
      },
      notes: []
    },
    summary: {
      status,
      stepsPassed: status === "pass" ? 1 : 0,
      stepsFailed: status === "pass" ? 0 : 1,
      invariantsPassed: 0,
      invariantsFailed: 0,
      alertsClear: 0,
      alertsTriggered: 0,
      snapshotsCaptured: 2,
      durationMs: 12
    },
    invariantPacks: [],
    steps: [
      {
        id: `probe-${appSlug}`,
        type: "fakenet",
        title: appName,
        status,
        expectation: "local fakenet evidence is available",
        observed,
        adapter,
        beforeHash: "before",
        afterHash: "after",
        stateDiffs: [],
        durationMs: 12
      }
    ],
    invariants: [],
    alerts: [],
    adapterObservations: [],
    stateSnapshots: [],
    stateDiffs: [],
    nextActions: []
  };
}

async function writeReport(filePath, report) {
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire() {
  return (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (body, init = {}) => ({
            headers: init.headers ?? {},
            status: init.status ?? 200,
            json: async () => body
          })
        }
      };
    }

    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertDiagnostic(body, id, severity, command) {
  const diagnostic = body.diagnostics.find((candidate) => candidate.id === id);

  if (!diagnostic) {
    throw new Error(`Missing diagnostic: ${id}`);
  }

  assertEqual(diagnostic.severity, severity, `${id} severity`);
  assertEqual(diagnostic.command, command, `${id} command`);
}

function assertTriageIssue(body, id, status) {
  const issue = body.nockchainTriage.issues.find((candidate) => candidate.id === id);

  if (!issue) {
    throw new Error(`Missing Nockchain triage issue: ${id}`);
  }

  assertEqual(issue.status, status, `${id} triage status`);
  assertIncludes(issue.checks.join("\n"), "fakenet", `${id} triage checks mention fakenet`);
}

function assertEndpoint(registryBody, id, pathName, description) {
  const endpoint = registryBody.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathName}`, `${id} URL`);
}

function assertIncludes(collection, expected, label) {
  if (!collection.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
