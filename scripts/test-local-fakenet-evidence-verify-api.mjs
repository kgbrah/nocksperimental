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
const walletAddress = "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/evidence/verify/route.ts");
  const { GET: getVerificationIndex } = loadTypeScriptModule("src/app/api/verify/route.ts");
  const readyRoot = await createEvidenceRoot("ready");
  const blockedRoot = await createEvidenceRoot("blocked");
  const originalCwd = process.cwd();
  let verificationBody = null;

  try {
    process.chdir(readyRoot);
    const readyUrl = createVerifyRequestUrl({
      generatedAt: "2026-06-04T10:02:00.000Z",
      reportId: "lab_local-fakenet-chain-v0",
      grpcEndpoint: "127.0.0.1:5555",
      walletAddress,
      blockCommitment: "0xabc123def456"
    });
    const readyResponse = await GET(new Request(readyUrl));
    const readyBody = await readyResponse.json();

    assertEqual(readyResponse.status, 200, "ready verifier response status");
    assertEqual(readyBody.version, "v0", "ready verifier version");
    assertEqual(readyBody.subject, "nocksperimental.com", "ready verifier subject");
    assertEqual(
      readyBody.canonicalUrl,
      "https://nocksperimental.com/api/fakenet/evidence/verify",
      "ready verifier canonical URL"
    );
    assertEqual(readyBody.verified, true, "ready evidence verified");
    assertEqual(readyBody.query.generatedAt, "2026-06-04T10:02:00.000Z", "ready query generatedAt");
    assertIncludes(readyBody.query.reportIds, "lab_local-fakenet-chain-v0", "ready query report id");
    assertEqual(readyBody.checks.generatedAtMatched, true, "ready generatedAt matched");
    assertEqual(readyBody.checks.reportIdsMatched, true, "ready report ids matched");
    assertEqual(readyBody.checks.grpcEndpointMatched, true, "ready endpoint matched");
    assertEqual(readyBody.checks.walletAddressMatched, true, "ready wallet matched");
    assertEqual(readyBody.checks.blockCommitmentMatched, true, "ready block commitment matched");
    assertEqual(readyBody.checks.evidenceReady, true, "ready evidence ready");
    assertEqual(readyBody.match.status, "ready", "ready match status");
    assertEqual(readyBody.match.reportCount, 3, "ready match report count");
    assertEqual(readyBody.match.links.evidence, "https://nocksperimental.com/api/fakenet/evidence", "ready evidence link");

    const mismatchResponse = await GET(new Request(createVerifyRequestUrl({
      generatedAt: "2026-06-04T10:02:00.000Z",
      reportId: "lab_local-fakenet-chain-v0",
      blockCommitment: "0xWRONG"
    })));
    const mismatchBody = await mismatchResponse.json();

    assertEqual(mismatchResponse.status, 200, "mismatch verifier status");
    assertEqual(mismatchBody.verified, false, "mismatch not verified");
    assertEqual(mismatchBody.checks.blockCommitmentMatched, false, "mismatch block commitment check");
    assertEqual(mismatchBody.checks.generatedAtMatched, true, "mismatch generatedAt still matched");

    const verificationIndex = await getVerificationIndex();
    verificationBody = await verificationIndex.json();

    process.chdir(blockedRoot);
    const blockedResponse = await GET(new Request(createVerifyRequestUrl({
      generatedAt: "2026-06-04T10:01:00.000Z",
      reportId: "lab_local-fakenet-health-v0",
      grpcEndpoint: "127.0.0.1:5555",
      walletAddress
    })));
    const blockedBody = await blockedResponse.json();

    assertEqual(blockedResponse.status, 200, "blocked verifier status");
    assertEqual(blockedBody.verified, false, "blocked evidence not verified");
    assertEqual(blockedBody.checks.generatedAtMatched, true, "blocked generatedAt matched");
    assertEqual(blockedBody.checks.reportIdsMatched, true, "blocked report id matched");
    assertEqual(blockedBody.checks.evidenceReady, false, "blocked evidence ready check");

    const missingResponse = await GET(new Request("https://nocksperimental.com/api/fakenet/evidence/verify"));
    const missingBody = await missingResponse.json();

    assertEqual(missingResponse.status, 400, "missing query status");
    assertEqual(missingBody.error, "Missing generatedAt or reportId query parameter", "missing query error");
  } finally {
    process.chdir(originalCwd);
  }

  if (!verificationBody) {
    throw new Error("verification index body: expected local fakenet sample from ready evidence root");
  }

  assertVerifier(
    verificationBody,
    "local-fakenet-evidence",
    "/api/fakenet/evidence/verify",
    "Verify local fakenet evidence capsule inputs"
  );
  assertIncludes(
    verificationBody.samples.localFakenetEvidence.url,
    "/api/fakenet/evidence/verify?",
    "verification index fakenet sample URL"
  );
  assertIncludes(
    verificationBody.samples.localFakenetEvidence.url,
    "generatedAt=",
    "verification index fakenet sample generatedAt"
  );
  assertIncludes(
    verificationBody.samples.localFakenetEvidence.url,
    "reportId=",
    "verification index fakenet sample reportId"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "local-fakenet-evidence-verifier",
    "/api/fakenet/evidence/verify",
    "Local fakenet evidence verifier"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(
    wellKnownBody.links.fakenetEvidenceVerifier,
    "https://nocksperimental.com/api/fakenet/evidence/verify",
    "well-known fakenet evidence verifier link"
  );
  assertIncludes(wellKnownBody.capabilities, "local-fakenet-evidence-verifier", "well-known verifier capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/evidence/verify"]?.get?.summary,
    "Local fakenet evidence verifier",
    "OpenAPI fakenet evidence verifier path"
  );

  const pageSource = readFileSync(path.join(process.cwd(), "src/app/verify/page.tsx"), "utf8");
  assertIncludes(pageSource, "samples.localFakenetEvidence", "verification page fakenet sample");
  assertIncludes(pageSource, 'label="Local fakenet"', "verification page fakenet sample label");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-evidence-verify-api"],
    "node scripts/test-local-fakenet-evidence-verify-api.mjs",
    "package evidence verifier test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:local-fakenet-evidence-verify-api",
    "full test includes evidence verifier test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "expectLocalFakenetEvidenceVerification", "Cloudflare smoke verifies local fakenet evidence");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/evidence/verify", "deployment docs include fakenet evidence verifier");
}

function createVerifyRequestUrl(params) {
  const url = new URL("https://nocksperimental.com/api/fakenet/evidence/verify");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

async function createEvidenceRoot(mode) {
  const rootDir = await mkdtemp(path.join(tmpdir(), `nocklab-fakenet-evidence-verify-${mode}-`));
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
      latencyMs: mode === "blocked" ? 0 : 4,
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
            address: walletAddress,
            unit: "NOCK",
            raw: "",
            checkedAt: "2026-06-04T10:01:00.020Z",
            error: "spawn fakenock ENOENT"
          }
        : {
            status: "pass",
            address: walletAddress,
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
        address: walletAddress,
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
  await writeFile(filePath, JSON.stringify(report, null, 2));
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing TypeScript module: ${relativePath}`);
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
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && [".ts", ".tsx"].includes(path.extname(aliasPath))) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(tsxPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsxPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertVerifier(body, id, pathName, description) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);
  assertEqual(verifier?.description, description, `${id} verifier description`);
  assertEqual(Array.isArray(verifier?.queryParameters), true, `${id} verifier query parameters`);
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
