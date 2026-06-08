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
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/route.ts");
  const readyRoot = await createReadinessRoot("ready");
  const blockedRoot = await createReadinessRoot("blocked");
  const peekPassRoot = await createReadinessRoot("ready", { peek: { status: "pass" } });
  const peekFailRoot = await createReadinessRoot("ready", { peek: { status: "fail" } });
  const missingRoot = await mkdtemp(path.join(tmpdir(), "nocklab-fakenet-missing-"));
  const originalCwd = process.cwd();

  try {
    process.chdir(readyRoot);
    const readyResponse = await GET();
    const readyBody = await readyResponse.json();

    assertEqual(readyResponse.status, 200, "ready response status");
    assertEqual(readyBody.version, "v0", "ready version");
    assertEqual(readyBody.service, "nocksperimental", "ready service");
    assertEqual(readyBody.subject, "nocksperimental.com", "ready subject");
    assertEqual(readyBody.canonicalUrl, "https://nocksperimental.com/api/fakenet", "ready canonical URL");
    assertEqual(readyBody.status, "ready", "ready status");
    assertEqual(readyBody.reportCount, 3, "ready report count");
    assertEqual(readyBody.endpoint, "127.0.0.1:5555", "ready endpoint");
    assertEqual(readyBody.wallet.address, "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx", "ready wallet address");
    assertEqual(readyBody.wallet.amount, 7012352, "ready wallet amount");
    assertEqual(readyBody.wallet.unit, "NOCK", "ready wallet unit");
    assertEqual(readyBody.chain.height, 128, "ready chain height");
    assertEqual(readyBody.chain.peerCount, 3, "ready chain peer count");
    assertEqual(readyBody.chain.blockCommitment, "0xabc123def456", "ready chain commitment");
    assertEqual(readyBody.checks.health, "pass", "ready health check");
    assertEqual(readyBody.checks.balance, "pass", "ready balance check");
    assertEqual(readyBody.checks.chain, "pass", "ready chain check");
    assertEqual(readyBody.failures.length, 0, "ready failures");
    assertEqual(readyBody.reports[0].appSlug, "local-fakenet-health", "ready report ordering");
    assertValidIsoDate(readyBody.generatedAt, "ready generatedAt");
    assertEqual(readyBody.peeks.declared.length, 1, "ready declared peek count");
    assertEqual(readyBody.peeks.declared[0].id, "peek", "ready declared peek id");
    assertEqual(readyBody.peeks.declared[0].label, "Peek", "ready declared peek label");
    assertIncludes(readyBody.peeks.declared[0].runCommand, "npm run lab:local:peek", "ready declared peek run command");
    assertEqual(readyBody.peeks.observed.length, 0, "ready observed peek count");
    assertEqual(readyBody.peeks.peeks[0].observation, null, "ready declared peek has no observation");

    process.chdir(blockedRoot);
    const blockedResponse = await GET();
    const blockedBody = await blockedResponse.json();

    assertEqual(blockedResponse.status, 200, "blocked response status");
    assertEqual(blockedBody.status, "blocked", "blocked status");
    assertEqual(blockedBody.reportCount, 2, "blocked report count");
    assertEqual(blockedBody.checks.health, "pass", "blocked health check");
    assertEqual(blockedBody.checks.balance, "fail", "blocked balance check");
    assertEqual(blockedBody.wallet.error, "spawn fakenock ENOENT", "blocked wallet error");
    assertIncludes(blockedBody.failures.join("\n"), "balance", "blocked failures include balance");

    process.chdir(peekPassRoot);
    const peekPassResponse = await GET();
    const peekPassBody = await peekPassResponse.json();

    assertEqual(peekPassResponse.status, 200, "peek pass response status");
    assertEqual(peekPassBody.peeks.declared.length, 1, "peek pass declared peek count");
    assertEqual(peekPassBody.peeks.observed.length, 1, "peek pass observed peek count");
    assertEqual(peekPassBody.peeks.observed[0].status, "pass", "peek pass observed status");
    assertEqual(peekPassBody.peeks.observed[0].target, "fakenock --balance", "peek pass observed target");
    assertEqual(
      peekPassBody.peeks.observed[0].id,
      "probe-local-fakenet-peek",
      "peek pass observed id"
    );
    assertValidIsoDate(peekPassBody.peeks.observed[0].checkedAt, "peek pass observed checkedAt");
    assertEqual(
      Boolean(peekPassBody.peeks.peeks[0].observation),
      true,
      "peek pass declared peek joins its observation"
    );
    assertEqual(
      peekPassBody.peeks.peeks[0].observation.status,
      "pass",
      "peek pass joined observation status"
    );
    assertEqual(
      peekPassBody.peeks.peeks[0].observation.target,
      "fakenock --balance",
      "peek pass joined observation target"
    );
    assertValidIsoDate(
      peekPassBody.peeks.peeks[0].observation.checkedAt,
      "peek pass joined observation checkedAt"
    );

    process.chdir(peekFailRoot);
    const peekFailResponse = await GET();
    const peekFailBody = await peekFailResponse.json();

    assertEqual(peekFailResponse.status, 200, "peek fail response status");
    assertEqual(peekFailBody.peeks.observed.length, 1, "peek fail observed peek count");
    assertEqual(peekFailBody.peeks.observed[0].status, "fail", "peek fail observed status");

    process.chdir(missingRoot);
    const missingResponse = await GET();
    const missingBody = await missingResponse.json();

    assertEqual(missingResponse.status, 200, "missing response status");
    assertEqual(missingBody.status, "missing", "missing status");
    assertEqual(missingBody.reportCount, 0, "missing report count");
    assertIncludes(missingBody.failures.join("\n"), "No local fakenet reports found", "missing failure");
    assertEqual(missingBody.peeks.declared.length, 1, "missing declared peek count");
    assertEqual(missingBody.peeks.observed.length, 0, "missing observed peek count");
  } finally {
    process.chdir(originalCwd);
  }

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(registryBody, "local-fakenet-readiness", "/api/fakenet", "Local fakenet readiness summary");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet"]?.get?.summary,
    "Local fakenet readiness summary",
    "OpenAPI fakenet path"
  );
}

async function createReadinessRoot(mode, options = {}) {
  const { peek } = options;
  const rootDir = await mkdtemp(path.join(tmpdir(), `nocklab-fakenet-${mode}-`));
  const reportDir = path.join(rootDir, ".nocklab");

  await mkdir(reportDir, { recursive: true });
  await writeReport(path.join(reportDir, "local-fakenet-health.report.json"), createReport({
    appSlug: "local-fakenet-health",
    appName: "Local Fakenet Health",
    fixtureId: "local-fakenet-health-v0",
    generatedAt: "2026-06-04T10:00:00.000Z",
    status: "pass",
    observed: "local-fakenet gRPC endpoint reachable at 127.0.0.1:5555",
    adapter: {
      kind: "local-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      reachable: true,
      latencyMs: 4,
      checkedAt: "2026-06-04T10:00:00.010Z"
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
            address: "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx",
            unit: "NOCK",
            raw: "",
            checkedAt: "2026-06-04T10:01:00.020Z",
            error: "spawn fakenock ENOENT"
          }
        : {
            status: "pass",
            address: "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx",
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

  if (peek) {
    await writeReport(path.join(reportDir, "local-fakenet-peek.report.json"), createReport({
      appSlug: "local-fakenet-peek",
      appName: "Local Fakenet Peek",
      fixtureId: "local-fakenet-peek-v0",
      generatedAt: "2026-06-04T10:03:00.000Z",
      status: peek.status,
      stepType: "peek",
      target: "fakenock --balance",
      observed: peek.status === "pass"
        ? "local-fakenet adapter peek succeeded at 127.0.0.1:5555"
        : "local-fakenet adapter peek command failed at 127.0.0.1:5555",
      adapter: {
        kind: "local-fakenet",
        grpcEndpoint: "127.0.0.1:5555",
        reachable: true,
        latencyMs: 7,
        checkedAt: "2026-06-04T10:03:00.010Z",
        peek: {
          status: peek.status,
          raw: peek.status === "pass" ? "Fakenet wallet balance 7,012,352 NOCK" : "",
          checkedAt: "2026-06-04T10:03:00.020Z",
          expectation: "fakenock balance command returns wallet-balance output",
          ...(peek.status === "fail" ? { error: "spawn fakenock ENOENT" } : {})
        }
      }
    }));
  }

  return rootDir;
}

function createReport({ appSlug, appName, fixtureId, generatedAt, status, observed, adapter, stepType = "fakenet", target }) {
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
        address: "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx",
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
        type: stepType,
        title: appName,
        status,
        ...(target !== undefined ? { target } : {}),
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

function assertEndpoint(body, id, pathName, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  assertEqual(endpoint?.path, pathName, `${id} endpoint path`);
  assertEqual(endpoint?.url, `${body.canonicalBaseUrl}${pathName}`, `${id} endpoint URL`);
  assertEqual(endpoint?.description, description, `${id} endpoint description`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertValidIsoDate(value, label) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label}: expected ISO date, got ${JSON.stringify(value)}`);
  }
}
