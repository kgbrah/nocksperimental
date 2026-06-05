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
  await assertSolverScoreApi();
  await assertTokenCompatibilityApi();
  await assertComputeBenchmarkApi();
  await assertOpenApiPaths();
  assertSmokeAndDocs();
  assertDetailPagesLinkApis();
  assertPackageScript();
}

async function assertSolverScoreApi() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/solver-scores/[scorecardId]/route.ts");
  const response = await GET(createRequest(), createContext({ scorecardId: "solver-score-solver-a-v0" }));
  const body = await response.json();

  assertEqual(response.status, 200, "solver detail API status");
  assertEqual(body.version, "v0", "solver detail API version");
  assertEqual(body.scorecard.id, "solver-score-solver-a-v0", "solver detail scorecard id");
  assertEqual(body.scorecard.reportSlug, "intent-settlement", "solver detail report slug");
  assertEqual(body.links.generatedReport, "/reports/generated/intent-settlement", "solver generated report link");
  assertEqual(body.links.evidence, "/api/reports/generated/intent-settlement/evidence", "solver evidence link");

  const missing = await GET(createRequest(), createContext({ scorecardId: "missing-scorecard" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing solver status");
  assertEqual(missingBody.error, "Solver scorecard not found", "missing solver error");
  assertEqual(missingBody.scorecardId, "missing-scorecard", "missing solver id");
}

async function assertTokenCompatibilityApi() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/token-compatibility/[reportId]/route.ts");
  const response = await GET(createRequest(), createContext({ reportId: "token-compat-mock-v0" }));
  const body = await response.json();

  assertEqual(response.status, 200, "token detail API status");
  assertEqual(body.version, "v0", "token detail API version");
  assertEqual(body.report.id, "token-compat-mock-v0", "token detail report id");
  assertEqual(body.report.reportSlug, "token-issuance", "token detail report slug");
  assertEqual(body.links.badge, "/trust/badges/badge-mock-token-compatible", "token badge link");
  assertEqual(body.links.generatedReport, "/reports/generated/token-issuance", "token generated report link");
  assertEqual(body.links.evidence, "/api/reports/generated/token-issuance/evidence", "token evidence link");

  const missing = await GET(createRequest(), createContext({ reportId: "missing-report" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing token status");
  assertEqual(missingBody.error, "Token compatibility report not found", "missing token error");
  assertEqual(missingBody.reportId, "missing-report", "missing token id");
}

async function assertComputeBenchmarkApi() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/compute-benchmarks/[profileId]/route.ts");
  const response = await GET(createRequest(), createContext({ profileId: "compute-profile-alpha-v0" }));
  const body = await response.json();

  assertEqual(response.status, 200, "compute detail API status");
  assertEqual(body.version, "v0", "compute detail API version");
  assertEqual(body.profile.id, "compute-profile-alpha-v0", "compute detail profile id");
  assertEqual(body.profile.benchmarkReportSlug, "compute-benchmark-alpha", "compute detail report slug");
  assertEqual(body.links.badge, "/trust/badges/badge-compute-provider-alpha", "compute badge link");
  assertEqual(body.links.generatedReport, "/reports/generated/compute-benchmark-alpha", "compute generated report link");
  assertEqual(body.links.evidence, "/api/reports/generated/compute-benchmark-alpha/evidence", "compute evidence link");

  const missing = await GET(createRequest(), createContext({ profileId: "missing-profile" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing compute status");
  assertEqual(missingBody.error, "Compute benchmark profile not found", "missing compute error");
  assertEqual(missingBody.profileId, "missing-profile", "missing compute id");
}

async function assertOpenApiPaths() {
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(
    spec.paths["/api/trust/solver-scores/{scorecardId}"]?.get?.summary,
    "Solver scorecard detail",
    "OpenAPI solver detail path"
  );
  assertEqual(
    spec.paths["/api/trust/token-compatibility/{reportId}"]?.get?.summary,
    "Token compatibility report detail",
    "OpenAPI token detail path"
  );
  assertEqual(
    spec.paths["/api/trust/compute-benchmarks/{profileId}"]?.get?.summary,
    "Compute benchmark profile detail",
    "OpenAPI compute detail path"
  );
}

function assertDetailPagesLinkApis() {
  const solverPage = readText("src/app/trust/solver-scores/[scorecardId]/page.tsx");
  const tokenPage = readText("src/app/trust/token-compatibility/[reportId]/page.tsx");
  const computePage = readText("src/app/trust/compute-benchmarks/[profileId]/page.tsx");

  assertIncludes(
    solverPage,
    'href={`/api/trust/solver-scores/${scorecard.id}`}',
    "solver detail page links per-scorecard API"
  );
  assertIncludes(
    tokenPage,
    'href={`/api/trust/token-compatibility/${report.id}`}',
    "token detail page links per-report API"
  );
  assertIncludes(
    computePage,
    'href={`/api/trust/compute-benchmarks/${profile.id}`}',
    "compute detail page links per-profile API"
  );
}

function assertSmokeAndDocs() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  for (const pathName of [
    "/api/trust/solver-scores/solver-score-solver-a-v0",
    "/api/trust/token-compatibility/token-compat-mock-v0",
    "/api/trust/compute-benchmarks/compute-profile-alpha-v0"
  ]) {
    assertIncludes(smokeScript, pathName, `Cloudflare smoke checks ${pathName}`);
    assertIncludes(deploymentDocs, pathName, `deployment docs mention ${pathName}`);
  }
}

function assertPackageScript() {
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(
    packageJson.scripts.test,
    "test:trust-signal-detail-apis",
    "full test suite includes trust signal detail API test"
  );
  assertEqual(
    packageJson.scripts["test:trust-signal-detail-apis"],
    "node scripts/test-trust-signal-detail-apis.mjs",
    "trust signal detail API script"
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
