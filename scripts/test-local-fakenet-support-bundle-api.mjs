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
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/support-bundle/route.ts");
  const blockedRoot = await createSupportBundleRoot("blocked");
  const readyRoot = await createSupportBundleRoot("ready");
  const missingRoot = await mkdtemp(path.join(tmpdir(), "nocklab-fakenet-support-missing-"));
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
      "https://nocksperimental.com/api/fakenet/support-bundle",
      "blocked canonical URL"
    );
    assertEqual(blockedBody.summary.status, "blocked", "blocked summary status");
    assertEqual(blockedBody.summary.reportCount, 2, "blocked summary report count");
    assertEqual(blockedBody.summary.activeDiagnostics, 4, "blocked active diagnostics");
    assertEqual(blockedBody.readiness.status, "blocked", "blocked readiness status");
    assertEqual(blockedBody.diagnostics.activeCount, 4, "blocked diagnostics active count");
    assertEqual(blockedBody.commandKit.runbookUrl, "https://nocksperimental.com/api/fakenet/runbook.sh", "runbook URL");
    assertEqual(blockedBody.artifacts.reports.length, 2, "blocked report artifact count");
    assertEqual(blockedBody.artifacts.reportOutputs.length, 5, "blocked report output count");
    assertIncludes(blockedBody.nextCommands, "fakenock --start", "blocked next commands include start");
    assertIncludes(blockedBody.nextCommands, "fakenock --balance", "blocked next commands include balance");
    assertIncludes(blockedBody.nextCommands, "npm run lab:local:chain", "blocked next commands include chain");
    assertEqual(
      new Set(blockedBody.nextCommands).size,
      blockedBody.nextCommands.length,
      "next commands are unique"
    );
    assertEqual(blockedBody.links.diagnostics, "https://nocksperimental.com/api/fakenet/diagnostics", "diagnostics link");

    process.chdir(readyRoot);
    const readyResponse = await GET();
    const readyBody = await readyResponse.json();

    assertEqual(readyResponse.status, 200, "ready response status");
    assertEqual(readyBody.summary.status, "ready", "ready summary status");
    assertEqual(readyBody.summary.activeDiagnostics, 0, "ready active diagnostics");
    assertIncludes(readyBody.nextCommands, "curl http://127.0.0.1:3000/api/fakenet", "ready next command");

    process.chdir(missingRoot);
    const missingResponse = await GET();
    const missingBody = await missingResponse.json();

    assertEqual(missingResponse.status, 200, "missing response status");
    assertEqual(missingBody.summary.status, "missing", "missing summary status");
    assertIncludes(missingBody.nextCommands, "npm run lab:local", "missing next command");
  } finally {
    process.chdir(originalCwd);
  }

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "local-fakenet-support-bundle",
    "/api/fakenet/support-bundle",
    "Local fakenet support bundle"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/support-bundle"]?.get?.summary,
    "Local fakenet support bundle",
    "OpenAPI fakenet support bundle path"
  );

  const pageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(pageSource, "createLocalFakenetSupportBundle", "fakenet page support bundle data");
  assertIncludes(pageSource, 'href="/api/fakenet/support-bundle"', "fakenet page support bundle link");
  assertIncludes(pageSource, "supportBundle.nextCommands.map", "fakenet page renders support commands");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-support-bundle-api"],
    "node scripts/test-local-fakenet-support-bundle-api.mjs",
    "package support bundle test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:local-fakenet-support-bundle-api",
    "full test includes support bundle test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/support-bundle", "Cloudflare smoke includes support bundle API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/support-bundle", "deployment docs include support bundle API");
}

async function createSupportBundleRoot(mode) {
  const rootDir = await mkdtemp(path.join(tmpdir(), `nocklab-fakenet-support-${mode}-`));
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
      checkedAt: "2026-06-04T10:00:00.010Z",
      ...(mode === "blocked" ? { error: "connect ECONNREFUSED 127.0.0.1:5555" } : { latencyMs: 4 })
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

  if (mode === "ready") {
    await writeReport(path.join(reportDir, "local-fakenet-chain.report.json"), createReport({
      appSlug: "local-fakenet-chain",
      appName: "Local Fakenet Chain",
      fixtureId: "local-fakenet-chain-v0",
      generatedAt: "2026-06-04T10:02:00.000Z",
      status: "pass",
      observed: "local-fakenet chain height 128 with 3 peers",
      adapter: {
        kind: "local-fakenet",
        grpcEndpoint: "127.0.0.1:5555",
        reachable: true,
        latencyMs: 6,
        checkedAt: "2026-06-04T10:02:00.010Z",
        chain: {
          status: "pass",
          height: 128,
          peerCount: 3,
          blockId: "block-001",
          blockCommitment: "0xabc123def456",
          raw: "height: 128\nconnected peers: 3\nblock commitment: 0xabc123def456",
          checkedAt: "2026-06-04T10:02:00.020Z"
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
