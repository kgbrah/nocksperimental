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
  await assertTrustConsumerDetailApi();
  await assertOpenApiPath();
  assertDetailPage();
  assertTrustOverviewLinks();
  assertSmokeAndDocs();
  assertPackageScript();
}

async function assertTrustConsumerDetailApi() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/consumers/[consumerId]/route.ts");
  const response = await GET(createRequest(), createContext({ consumerId: "consumer-audit-fund" }));
  const body = await response.json();

  assertEqual(response.status, 200, "consumer detail API status");
  assertEqual(body.version, "v0", "consumer detail API version");
  assertEqual(body.consumer.id, "consumer-audit-fund", "consumer id");
  assertEqual(body.consumer.name, "Audit Readiness Fund", "consumer name");
  assertEqual(body.consumer.category, "fund", "consumer category");
  assertEqual(body.consumer.evidenceCount, 2, "consumer evidence count");
  assertEqual(body.consumer.verifiedBadgeCount, 1, "consumer verified badge count");
  assertEqual(body.consumer.resolvedUses.length, 2, "consumer resolved use count");
  assertEqual(body.links.collection, "/api/trust", "consumer collection API link");
  assertEqual(body.links.detail, "/trust/consumers/consumer-audit-fund", "consumer detail page link");
  assertEqual(body.links.trustOverview, "/trust", "consumer trust overview link");
  assertEqual(body.evidenceLinks.length, 2, "consumer evidence link count");
  assertEqual(body.evidenceLinks[0].kind, "solver-score", "fund first evidence kind");
  assertEqual(body.evidenceLinks[0].href, "/trust/solver-scores/solver-score-solver-a-v0", "fund scorecard detail link");
  assertEqual(body.evidenceLinks[0].generatedReport, "/reports/generated/intent-settlement", "fund scorecard report link");
  assertEqual(body.evidenceLinks[1].kind, "badge", "fund second evidence kind");
  assertEqual(body.evidenceLinks[1].href, "/trust/badges/badge-payment-flow-verified", "fund badge detail link");
  assertEqual(body.evidenceLinks[1].generatedReport, "/reports/generated/payment-flow", "fund badge report link");

  const missing = await GET(createRequest(), createContext({ consumerId: "missing-consumer" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing consumer status");
  assertEqual(missingBody.error, "Trust consumer not found", "missing consumer error");
  assertEqual(missingBody.consumerId, "missing-consumer", "missing consumer id");
}

async function assertOpenApiPath() {
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(
    spec.paths["/api/trust/consumers/{consumerId}"]?.get?.summary,
    "Trust consumer detail",
    "OpenAPI trust consumer detail path"
  );
}

function assertDetailPage() {
  const pagePath = "src/app/trust/consumers/[consumerId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);

  assertIncludes(page, "notFound", "trust consumer detail page 404s missing consumers");
  assertIncludes(page, "Consumer Detail", "trust consumer detail page title");
  assertIncludes(page, "Evidence Actions", "trust consumer detail page renders evidence actions");
  assertIncludes(page, "consumer.resolvedUses.map", "trust consumer detail page renders resolved evidence");
  assertIncludes(page, "evidenceHrefForUse", "trust consumer detail page links evidence detail");
  assertIncludes(page, 'href={`/api/trust/consumers/${consumer.id}`}', "trust consumer detail page links consumer API");
  assertIncludes(page, "consumer.evidenceCount", "trust consumer detail page renders evidence count");
  assertIncludes(page, "consumer.verifiedBadgeCount", "trust consumer detail page renders verified badge count");
}

function assertTrustOverviewLinks() {
  const page = readText("src/app/trust/page.tsx");

  assertIncludes(page, 'href={`/trust/consumers/${consumer.id}`}', "trust overview links consumer detail page");
  assertIncludes(page, "Open Consumer", "trust overview exposes consumer detail action");
}

function assertSmokeAndDocs() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  for (const pathName of [
    "/trust/consumers/consumer-audit-fund",
    "/api/trust/consumers/consumer-audit-fund"
  ]) {
    assertIncludes(smokeScript, pathName, `Cloudflare smoke checks ${pathName}`);
    assertIncludes(deploymentDocs, pathName, `deployment docs mention ${pathName}`);
  }
}

function assertPackageScript() {
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(
    packageJson.scripts.test,
    "test:trust-consumer-detail",
    "full test suite includes trust consumer detail test"
  );
  assertEqual(
    packageJson.scripts["test:trust-consumer-detail"],
    "node scripts/test-trust-consumer-detail.mjs",
    "trust consumer detail script"
  );
}

function createRequest() {
  return {};
}

function createContext(params) {
  return {
    params: Promise.resolve(params)
  };
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

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

    if (specifier === "next/navigation") {
      return {
        notFound: () => {
          throw new Error("notFound");
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

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
