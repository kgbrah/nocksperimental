#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
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
  const { POST } = loadTypeScriptModule("src/app/api/fakenet/evidence/submit/route.ts");
  const walletAddress = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
  const healthReport = createReport({
    reportId: "lab_local-fakenet-health-v0_submit",
    fixtureId: "local-fakenet-health-v0",
    appSlug: "local-fakenet-health",
    endpoint: "127.0.0.1:5555",
    walletAddress,
    status: "pass"
  });
  const balanceReport = createReport({
    reportId: "lab_local-fakenet-balance-v0_submit",
    fixtureId: "local-fakenet-balance-v0",
    appSlug: "local-fakenet-balance",
    endpoint: "127.0.0.1:5555",
    walletAddress,
    status: "pass"
  });

  const goodResponse = await POST(
    new Request("https://nocksperimental.com/api/fakenet/evidence/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        connection: {
          endpoint: "127.0.0.1:5555",
          walletAddress,
          networkId: "local-devnet",
          label: "Local devnet"
        },
        reports: [healthReport, balanceReport]
      })
    })
  );
  const receipt = await goodResponse.json();

  assertEqual(goodResponse.status, 200, "good submission status");
  assertEqual(receipt.version, "v0", "receipt version");
  assertEqual(receipt.service, "nocksperimental", "receipt service");
  assertEqual(receipt.subject, "nocksperimental.com", "receipt subject");
  assertEqual(receipt.canonicalUrl, "https://nocksperimental.com/api/fakenet/evidence/submit", "receipt canonical URL");
  assertEqual(receipt.accepted, true, "receipt accepted");
  assertEqual(receipt.verified, true, "receipt verified");
  assertStartsWith(receipt.receiptId, "fakenet_submission_", "receipt id prefix");
  assertStartsWith(receipt.profile.connectionId, "byo_fakenet_", "receipt profile id");
  assertEqual(receipt.profile.mode, "local-runbook", "receipt profile mode");
  assertEqual(receipt.summary.reportCount, 2, "receipt report count");
  assertEqual(receipt.summary.passedReports, 2, "receipt passed report count");
  assertEqual(receipt.summary.failedReports, 0, "receipt failed report count");
  assertEqual(receipt.checks.profileAccepted, true, "profile accepted check");
  assertEqual(receipt.checks.reportsProvided, true, "reports provided check");
  assertEqual(receipt.checks.localFakenetReportsOnly, true, "local fakenet reports check");
  assertEqual(receipt.checks.endpointsMatched, true, "endpoint match check");
  assertEqual(receipt.checks.walletMatched, true, "wallet match check");
  assertEqual(receipt.checks.noFailedReports, true, "no failed reports check");
  assertIncludes(receipt.reports.map((report) => report.reportId), healthReport.reportId, "health report receipt");
  assertIncludes(receipt.links.profile, "/api/fakenet/connect?", "receipt profile link");
  assertIncludes(receipt.links.verify, "/api/fakenet/evidence/verify?", "receipt verify link");
  assertEqual(receipt.storage.persisted, true, "receipt persisted");
  assertEqual(receipt.storage.backend, "memory", "receipt persistence backend");
  assertIncludes(receipt.links.receipt, `/api/fakenet/evidence/receipts/${receipt.receiptId}`, "receipt detail link");
  assertEqual(
    receipt.links.receipts,
    "https://nocksperimental.com/api/fakenet/evidence/receipts",
    "receipt index link"
  );

  const { GET: listReceipts } = loadTypeScriptModule("src/app/api/fakenet/evidence/receipts/route.ts");
  const receiptListResponse = await listReceipts();
  const receiptList = await receiptListResponse.json();
  const indexedReceipt = receiptList.receipts.find((candidate) => candidate.receiptId === receipt.receiptId);

  assertEqual(receiptListResponse.status, 200, "receipt list status");
  assertEqual(receiptList.version, "v0", "receipt list version");
  assertIncludes(
    receiptList.links.submit,
    "/api/fakenet/evidence/submit",
    "receipt list submit link"
  );
  assertEqual(Boolean(indexedReceipt), true, "submitted receipt appears in receipt index");
  assertEqual(indexedReceipt.summary.reportCount, 2, "indexed receipt report count");

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/fakenet/evidence/receipts/[receiptId]/route.ts");
  const detailResponse = await getReceipt(
    new Request(`https://nocksperimental.com/api/fakenet/evidence/receipts/${receipt.receiptId}`),
    { params: { receiptId: receipt.receiptId } }
  );
  const detail = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "receipt detail status");
  assertEqual(detail.receiptId, receipt.receiptId, "receipt detail id");
  assertEqual(detail.summary.endpoint, "127.0.0.1:5555", "receipt detail endpoint");

  const mismatchResponse = await POST(
    new Request("https://nocksperimental.com/api/fakenet/evidence/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        connection: {
          endpoint: "127.0.0.1:5555",
          walletAddress
        },
        reports: [
          createReport({
            reportId: "lab_local-fakenet-health-v0_mismatch",
            fixtureId: "local-fakenet-health-v0",
            appSlug: "local-fakenet-health",
            endpoint: "192.168.1.99:5555",
            walletAddress,
            status: "pass"
          })
        ]
      })
    })
  );
  const mismatch = await mismatchResponse.json();

  assertEqual(mismatchResponse.status, 400, "mismatch submission status");
  assertEqual(mismatch.accepted, false, "mismatch rejected");
  assertEqual(mismatch.verified, false, "mismatch not verified");
  assertEqual(mismatch.checks.endpointsMatched, false, "mismatch endpoint check");
  assertIncludes(mismatch.errors.join("\n"), "Report endpoints do not match", "mismatch error message");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "fakenet-evidence-submit",
    "/api/fakenet/evidence/submit",
    "Submit bring-your-own fakenet evidence"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.fakenetEvidenceSubmit,
    "https://nocksperimental.com/api/fakenet/evidence/submit",
    "well-known evidence submit link"
  );
  assertIncludes(wellKnownBody.capabilities, "fakenet-evidence-submit", "well-known submit capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/fakenet/evidence/submit"]?.post?.summary,
    "Submit bring-your-own fakenet evidence",
    "OpenAPI fakenet evidence submit POST path"
  );
  assertEqual(
    openApiBody.paths["/api/fakenet/evidence/receipts"]?.get?.summary,
    "List persisted fakenet evidence receipts",
    "OpenAPI fakenet evidence receipts GET path"
  );
  assertEqual(
    openApiBody.paths["/api/fakenet/evidence/receipts/{receiptId}"]?.get?.summary,
    "Read persisted fakenet evidence receipt",
    "OpenAPI fakenet evidence receipt detail GET path"
  );

  const profileSource = readFileSync(path.join(process.cwd(), "src/lib/fakenet-connection-profile.ts"), "utf8");
  assertIncludes(profileSource, "submitEvidence", "connection profile includes submit evidence command");
  assertIncludes(profileSource, "/api/fakenet/evidence/submit", "connection profile links submission endpoint");

  const fakenetPageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(fakenetPageSource, "Submit Evidence", "fakenet page shows submit evidence link");
  assertIncludes(fakenetPageSource, "/api/fakenet/evidence/submit", "fakenet page links submit API");
  assertIncludes(fakenetPageSource, "/api/fakenet/evidence/receipts", "fakenet page links receipt index");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:fakenet-evidence-submit"],
    "node scripts/test-fakenet-evidence-submit-api.mjs",
    "package submit test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:fakenet-evidence-submit", "full test includes submit test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/evidence/submit", "Cloudflare smoke includes fakenet evidence submit API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "POST the generated report JSON", "README documents evidence submission");
  assertIncludes(readme, "GET /api/fakenet/evidence/receipts", "README documents receipt persistence");
}

function createReport({ reportId, fixtureId, appSlug, endpoint, walletAddress, status }) {
  return {
    reportId,
    fixtureId,
    generatedAt: "2026-06-05T14:50:00.000Z",
    app: {
      name: appSlug,
      slug: appSlug,
      version: "0.0.1",
      kernel: "nockchain-local-fakenet"
    },
    environment: {
      mode: "local-fakenet",
      grpcEndpoint: endpoint,
      balanceCheck: {
        address: walletAddress
      }
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
        id: `${appSlug}-step`,
        type: "fakenet",
        title: appSlug,
        status,
        expectation: "fakenet check passes",
        observed: status === "pass" ? "fakenet check passed" : "fakenet check failed",
        adapter: {
          kind: "local-fakenet",
          grpcEndpoint: endpoint,
          reachable: status === "pass",
          balance: {
            status,
            address: walletAddress,
            amount: status === "pass" ? "10" : null,
            unit: "NOCK",
            checkedAt: "2026-06-05T14:50:00.000Z",
            error: null
          }
        },
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

    if (specifier === "@opennextjs/cloudflare") {
      return {
        getCloudflareContext: () => {
          throw new Error("Cloudflare context is unavailable in script tests.");
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

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
