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
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/support-bundle.md/route.ts");
  const blockedRoot = await createSupportMarkdownRoot("blocked");
  const readyRoot = await createSupportMarkdownRoot("ready");
  const missingRoot = await mkdtemp(path.join(tmpdir(), "nocklab-fakenet-support-md-missing-"));
  const originalCwd = process.cwd();

  try {
    process.chdir(blockedRoot);
    const blockedResponse = await GET();
    const blockedBody = await blockedResponse.text();

    assertEqual(blockedResponse.status, 200, "blocked markdown status");
    assertEqual(
      blockedResponse.headers.get("content-type"),
      "text/markdown; charset=utf-8",
      "blocked markdown content type"
    );
    assertIncludes(blockedBody, "# Local Fakenet Support Bundle", "markdown heading");
    assertIncludes(blockedBody, "- Status: `blocked`", "blocked status");
    assertIncludes(blockedBody, "- Active diagnostics: `4`", "blocked diagnostics count");
    assertIncludes(blockedBody, "## Diagnostics", "diagnostics section");
    assertIncludes(blockedBody, "Local fakenet gRPC is unreachable", "gRPC diagnostic");
    assertIncludes(blockedBody, "fakenock is not available on PATH", "fakenock diagnostic");
    assertIncludes(blockedBody, "## Next Commands", "next commands section");
    assertIncludes(blockedBody, "```bash\nfakenock --start\n```", "start command block");
    assertIncludes(blockedBody, "```bash\nfakenock --balance\n```", "balance command block");
    assertIncludes(blockedBody, "```bash\nnpm run lab:local:chain\n```", "chain command block");
    assertIncludes(blockedBody, "## Report Artifacts", "report artifacts section");
    assertIncludes(blockedBody, ".nocklab/local-fakenet-health.report.json", "health artifact");
    assertIncludes(blockedBody, "https://nocksperimental.com/api/fakenet/support-bundle", "JSON bundle link");

    process.chdir(readyRoot);
    const readyResponse = await GET();
    const readyBody = await readyResponse.text();

    assertEqual(readyResponse.status, 200, "ready markdown status");
    assertIncludes(readyBody, "- Status: `ready`", "ready status");
    assertIncludes(readyBody, "Local fakenet evidence is ready", "ready diagnostic");

    process.chdir(missingRoot);
    const missingResponse = await GET();
    const missingBody = await missingResponse.text();

    assertEqual(missingResponse.status, 200, "missing markdown status");
    assertIncludes(missingBody, "- Status: `missing`", "missing status");
    assertIncludes(missingBody, "npm run lab:local", "missing next command");
  } finally {
    process.chdir(originalCwd);
  }

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "local-fakenet-support-markdown",
    "/api/fakenet/support-bundle.md",
    "Local fakenet support bundle markdown"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/support-bundle.md"]?.get?.summary,
    "Local fakenet support bundle markdown",
    "OpenAPI fakenet support markdown path"
  );

  const pageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(pageSource, "createLocalFakenetSupportBundleMarkdown", "fakenet page support markdown data");
  assertIncludes(pageSource, 'href="/api/fakenet/support-bundle.md"', "fakenet page support markdown link");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-support-markdown-api"],
    "node scripts/test-local-fakenet-support-markdown-api.mjs",
    "package support markdown test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:local-fakenet-support-markdown-api",
    "full test includes support markdown test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/support-bundle.md", "Cloudflare smoke includes support markdown API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/support-bundle.md", "deployment docs include support markdown API");
}

async function createSupportMarkdownRoot(mode) {
  const rootDir = await mkdtemp(path.join(tmpdir(), `nocklab-fakenet-support-md-${mode}-`));
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
