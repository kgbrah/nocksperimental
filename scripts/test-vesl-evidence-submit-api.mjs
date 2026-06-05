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
  const { POST } = loadTypeScriptModule("src/app/api/vesl/evidence/submit/route.ts");
  const payload = createVeslPayload();

  const response = await POST(
    new Request("https://nocksperimental.com/api/vesl/evidence/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
  const receipt = await response.json();

  assertEqual(response.status, 200, "submit status");
  assertEqual(receipt.version, "v0", "receipt version");
  assertEqual(receipt.service, "nocksperimental", "receipt service");
  assertEqual(receipt.subject, "nocksperimental.com", "receipt subject");
  assertEqual(receipt.canonicalUrl, "https://nocksperimental.com/api/vesl/evidence/submit", "receipt canonical URL");
  assertEqual(receipt.accepted, true, "receipt accepted");
  assertEqual(receipt.verified, true, "receipt verified");
  assertStartsWith(receipt.receiptId, "vesl_submission_", "receipt id prefix");
  assertEqual(receipt.summary.project, "vesl-demo", "project summary");
  assertEqual(receipt.summary.requiredEffectsPresent, true, "required effects present");
  assertEqual(receipt.checks.verifyJamFresh, true, "verify-jam fresh check");
  assertEqual(receipt.checks.settleRegisteredEffectPresent, true, "settle registered check");
  assertEqual(receipt.checks.settleNotedEffectPresent, true, "settle noted check");
  assertEqual(receipt.checks.peeksPresent, true, "peeks present check");
  assertEqual(receipt.checks.hullHealthOk, true, "hull health check");
  assertEqual(receipt.report.app.slug, "vesl-evidence-bridge", "report app slug");
  assertEqual(receipt.report.environment.mode, "vesl-local", "report environment mode");
  assertIncludes(receipt.report.steps.map((step) => step.id), "vesl-verify-jam", "verify-jam report step");
  assertIncludes(receipt.report.steps.map((step) => step.id), "vesl-effects", "effects report step");
  assertEqual(receipt.storage.persisted, true, "receipt persisted");
  assertEqual(receipt.storage.backend, "memory", "receipt persistence backend");
  assertIncludes(receipt.links.receipt, `/api/vesl/evidence/receipts/${receipt.receiptId}`, "receipt detail link");
  assertEqual(
    receipt.links.receipts,
    "https://nocksperimental.com/api/vesl/evidence/receipts",
    "receipt index link"
  );

  const { GET: listReceipts } = loadTypeScriptModule("src/app/api/vesl/evidence/receipts/route.ts");
  const receiptListResponse = await listReceipts();
  const receiptList = await receiptListResponse.json();
  const indexedReceipt = receiptList.receipts.find((candidate) => candidate.receiptId === receipt.receiptId);

  assertEqual(receiptListResponse.status, 200, "receipt list status");
  assertEqual(receiptList.version, "v0", "receipt list version");
  assertEqual(Boolean(indexedReceipt), true, "submitted receipt appears in receipt index");
  assertEqual(indexedReceipt.summary.project, "vesl-demo", "indexed receipt project");

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/vesl/evidence/receipts/[receiptId]/route.ts");
  const detailResponse = await getReceipt(
    new Request(`https://nocksperimental.com/api/vesl/evidence/receipts/${receipt.receiptId}`),
    { params: { receiptId: receipt.receiptId } }
  );
  const detail = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "receipt detail status");
  assertEqual(detail.receiptId, receipt.receiptId, "receipt detail id");
  assertEqual(detail.report.reportId, receipt.report.reportId, "receipt detail report id");

  const badResponse = await POST(
    new Request("https://nocksperimental.com/api/vesl/evidence/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        connection: {
          project: "empty-vesl"
        }
      })
    })
  );
  const badReceipt = await badResponse.json();

  assertEqual(badResponse.status, 400, "bad submission status");
  assertEqual(badReceipt.accepted, false, "bad submission rejected");
  assertIncludes(badReceipt.errors.join("\n"), "At least one VESL evidence source is required.", "bad submission error");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "vesl-evidence-submit", "/api/vesl/evidence/submit", "Submit VESL lifecycle evidence");
  assertEndpoint(registryBody, "vesl-evidence-receipts", "/api/vesl/evidence/receipts", "List persisted VESL evidence receipts");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.veslEvidenceSubmit,
    "https://nocksperimental.com/api/vesl/evidence/submit",
    "well-known VESL submit link"
  );
  assertEqual(
    wellKnownBody.links.veslEvidenceReceipts,
    "https://nocksperimental.com/api/vesl/evidence/receipts",
    "well-known VESL receipts link"
  );
  assertIncludes(wellKnownBody.capabilities, "vesl-evidence-bridge", "well-known VESL capability");
  assertIncludes(wellKnownBody.capabilities, "vesl-evidence-receipts", "well-known VESL receipts capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/vesl/evidence/submit"]?.post?.summary,
    "Submit VESL lifecycle evidence",
    "OpenAPI VESL evidence submit POST path"
  );
  assertEqual(
    openApiBody.paths["/api/vesl/evidence/receipts"]?.get?.summary,
    "List persisted VESL evidence receipts",
    "OpenAPI VESL evidence receipts GET path"
  );
  assertEqual(
    openApiBody.paths["/api/vesl/evidence/receipts/{receiptId}"]?.get?.summary,
    "Read persisted VESL evidence receipt",
    "OpenAPI VESL evidence receipt detail GET path"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:vesl-evidence-submit"],
    "node scripts/test-vesl-evidence-submit-api.mjs",
    "package VESL submit test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:vesl-evidence-submit", "full test includes VESL submit test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/vesl/evidence/submit", "Cloudflare smoke includes VESL evidence submit API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "VESL Evidence Bridge", "README documents VESL evidence bridge");
  assertIncludes(readme, "/api/vesl/evidence/submit", "README documents VESL submit endpoint");

  const wrangler = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");
  assertIncludes(wrangler, "NOCKS_VESL_RECEIPTS", "Wrangler VESL KV binding");
}

function createVeslPayload() {
  return {
    connection: {
      project: "vesl-demo",
      repo: "zkvesl/vesl-nockup",
      template: "vesl",
      settlementMode: "local",
      chainEndpoint: "http://127.0.0.1:5555"
    },
    verifyJam: {
      status: "fresh",
      projectPath: ".",
      outJam: "out.jam",
      fingerprint: "sha256:vesl-demo-fresh"
    },
    effects: [
      {
        id: "effect-settle-registered",
        tag: "%settle-registered",
        source: "vesl-test watch",
        observedAt: "2026-06-05T15:00:00.000Z",
        payload: {
          hull: 1
        }
      },
      {
        id: "effect-settle-noted",
        tag: "%settle-noted",
        source: "vesl-test watch",
        observedAt: "2026-06-05T15:00:02.000Z",
        payload: {
          note: "demo-note"
        }
      }
    ],
    peeks: [
      {
        id: "peek-settle-registered",
        path: "[%settle-registered 1 ~]",
        status: "present",
        source: "vesl-test inspect peek",
        value: "[~ 1]"
      }
    ],
    hull: {
      health: {
        status: "ok"
      },
      status: {
        settlementMode: "local",
        activeGate: "default-hash",
        grafts: ["settle-graft", "registry-graft"]
      }
    }
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
