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
  await assertWorkspaceDetailApi();
  await assertOpenApiPath();
  assertWorkspaceDetailPage();
  assertWorkspaceListLinks();
  assertSmokeAndDocs();
  assertPackageScript();
}

async function assertWorkspaceDetailApi() {
  const { GET } = loadTypeScriptModule("src/app/api/workspaces/[workspaceSlug]/route.ts");
  const response = await GET(createRequest(), createContext({ workspaceSlug: "launch-lab-private" }));
  const body = await response.json();

  assertEqual(response.status, 200, "workspace detail API status");
  assertEqual(body.version, "v0", "workspace detail API version");
  assertEqual(body.workspace.slug, "launch-lab-private", "workspace slug");
  assertEqual(body.workspace.name, "Launch Lab Private", "workspace name");
  assertEqual(body.workspace.plan, "team", "workspace plan");
  assertEqual(body.workspace.reportCount, 1, "workspace report count");
  assertEqual(body.workspace.verifiedReportCount, 1, "workspace verified count");
  assertEqual(body.workspace.unlinkedReportCount, 0, "workspace unlinked count");
  assertEqual(body.verification.latestBadgeId, "badge-payment-flow-verified", "workspace latest badge");
  assertEqual(body.verification.latestReportSlug, "payment-flow", "workspace latest report");
  assertEqual(body.reports.length, 1, "workspace reports length");
  assertEqual(body.reports[0].id, "hist-payment-prelaunch-001", "workspace report id");
  assertEqual(body.reports[0].verification.badgeId, "badge-payment-flow-verified", "workspace report badge");
  assertEqual(body.reportLinks.length, 1, "workspace report link count");
  assertEqual(body.reportLinks[0].generatedReport, "/reports/generated/payment-flow", "workspace generated report link");
  assertEqual(body.reportLinks[0].badge, "/trust/badges/badge-payment-flow-verified", "workspace badge link");
  assertEqual(body.links.collection, "/api/workspaces", "workspace collection link");
  assertEqual(body.links.detail, "/workspaces/launch-lab-private", "workspace detail link");
  assertEqual(body.links.reportHistory, "/reports/history", "workspace report history link");

  const missing = await GET(createRequest(), createContext({ workspaceSlug: "missing-workspace" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing workspace status");
  assertEqual(missingBody.error, "Workspace not found", "missing workspace error");
  assertEqual(missingBody.workspaceSlug, "missing-workspace", "missing workspace slug");
}

async function assertOpenApiPath() {
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(
    spec.paths["/api/workspaces/{workspaceSlug}"]?.get?.summary,
    "Workspace detail",
    "OpenAPI workspace detail path"
  );
}

function assertWorkspaceDetailPage() {
  const pagePath = "src/app/workspaces/[workspaceSlug]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);

  assertIncludes(page, "notFound", "workspace detail page 404s missing workspaces");
  assertIncludes(page, "Workspace Detail", "workspace detail page title");
  assertIncludes(page, "Report Actions", "workspace detail page renders report actions");
  assertIncludes(page, "reports.map", "workspace detail page renders reports");
  assertIncludes(page, "workspaceVerificationSummary", "workspace detail page renders verification summary");
  assertIncludes(page, '{workspace.retentionDays}{" "}', "workspace detail page spaces retention copy");
  assertIncludes(page, 'href={`/api/workspaces/${workspace.slug}`}', "workspace detail page links API");
  assertIncludes(page, 'href={`/reports/generated/${report.reportSlug}`}', "workspace detail page links generated reports");
  assertIncludes(page, 'href={`/trust/badges/${report.verification.badgeId}`}', "workspace detail page links badges");
}

function assertWorkspaceListLinks() {
  const page = readText("src/app/workspaces/page.tsx");

  assertIncludes(page, 'href={`/workspaces/${workspace.slug}`}', "workspace list links detail page");
  assertIncludes(page, "Open Workspace", "workspace list exposes detail action");
}

function assertSmokeAndDocs() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  for (const pathName of [
    "/workspaces/launch-lab-private",
    "/api/workspaces/launch-lab-private"
  ]) {
    assertIncludes(smokeScript, pathName, `Cloudflare smoke checks ${pathName}`);
    assertIncludes(deploymentDocs, pathName, `deployment docs mention ${pathName}`);
  }
}

function assertPackageScript() {
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(
    packageJson.scripts.test,
    "test:workspace-detail",
    "full test suite includes workspace detail test"
  );
  assertEqual(
    packageJson.scripts["test:workspace-detail"],
    "node scripts/test-workspace-detail.mjs",
    "workspace detail script"
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
