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
  assertUploadPolicyLibrary();
  await assertUploadPolicyRoute();
  await assertRegistryAndOpenApi();
  assertWorkspaceDetailAction();
  assertSmokeDocsAndPackageScript();
}

function assertUploadPolicyLibrary() {
  const { createWorkspaceUploadPolicy } = loadTypeScriptModule("src/lib/workspace-upload-policy.ts");
  const policy = createWorkspaceUploadPolicy("launch-lab-private");

  assertEqual(policy.version, "v0", "upload policy version");
  assertEqual(policy.subject, "nocksperimental.com", "upload policy subject");
  assertEqual(policy.canonicalUrl, "https://nocksperimental.com/api/workspaces/launch-lab-private/upload-policy", "upload policy canonical URL");
  assertEqual(policy.workspace.slug, "launch-lab-private", "upload policy workspace slug");
  assertEqual(policy.workspace.name, "Launch Lab Private", "upload policy workspace name");
  assertEqual(policy.status, "auth-required", "upload policy status");
  assertEqual(policy.retention.days, 365, "upload policy retention days");
  assertEqual(policy.token.authenticationRequired, true, "upload policy requires auth");
  assertEqual(policy.token.issuanceStatus, "not-issued", "upload policy does not issue public token");
  assertEqual(policy.token.tokenType, "workspace-report-upload", "upload policy token type");
  assertEqual(policy.token.ttlSeconds, 900, "upload policy token TTL");
  assertEqual(policy.token.audience, "nocksperimental.com/workspace-report-upload", "upload policy audience");
  assertIncludes(policy.token.requiredClaims, "workspaceSlug", "upload token claims workspace slug");
  assertIncludes(policy.token.requiredClaims, "reportHash", "upload token claims report hash");
  assertIncludes(policy.token.requiredClaims, "snapshotRoot", "upload token claims snapshot root");
  assertIncludes(policy.token.requiredClaims, "signature", "upload token claims signature");
  assertIncludes(policy.reportContract.requiredFields, "generatedAt", "upload contract generatedAt");
  assertIncludes(policy.reportContract.requiredFields, "fixtureId", "upload contract fixture id");
  assertIncludes(policy.reportContract.requiredFields, "invariantPacks", "upload contract invariant packs");
  assertIncludes(policy.reportContract.acceptedContentTypes, "application/json", "upload contract JSON content type");
  assertIncludes(policy.reportContract.acceptedContentTypes, "text/markdown", "upload contract markdown content type");
  assertEqual(policy.reportContract.maxReportBytes, 5242880, "upload contract max bytes");
  assertEqual(policy.gates.membership, "required", "upload policy membership gate");
  assertEqual(policy.gates.storage, "pending-durable-storage", "upload policy storage gate");
  assertEqual(policy.gates.evidenceCapsuleRequired, true, "upload policy evidence gate");
  assertEqual(policy.links.workspace, "https://nocksperimental.com/workspaces/launch-lab-private", "upload policy workspace link");
  assertEqual(policy.links.evidence, "https://nocksperimental.com/api/workspaces/launch-lab-private/evidence", "upload policy evidence link");
  assertEqual(policy.links.uploadPolicy, policy.canonicalUrl, "upload policy self link");

  const missing = createWorkspaceUploadPolicy("missing-workspace");

  assertEqual(missing, null, "missing workspace upload policy returns null");
}

async function assertUploadPolicyRoute() {
  const { GET } = loadTypeScriptModule("src/app/api/workspaces/[workspaceSlug]/upload-policy/route.ts");
  const response = await GET(createRequest(), createContext({ workspaceSlug: "launch-lab-private" }));
  const body = await response.json();

  assertEqual(response.status, 200, "upload policy route status");
  assertEqual(body.workspace.slug, "launch-lab-private", "upload policy route workspace");
  assertEqual(body.token.issuanceStatus, "not-issued", "upload policy route token status");

  const missing = await GET(createRequest(), createContext({ workspaceSlug: "missing-workspace" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing upload policy status");
  assertEqual(missingBody.error, "Workspace not found", "missing upload policy error");
}

async function assertRegistryAndOpenApi() {
  const { GET: getOpenApi } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const openApi = await getOpenApi();
  const spec = await openApi.json();

  assertEqual(
    spec.paths["/api/workspaces/{workspaceSlug}/upload-policy"]?.get?.summary,
    "Workspace upload policy",
    "OpenAPI upload policy path"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "workspace-upload-policy",
    "/api/workspaces/launch-lab-private/upload-policy",
    "Workspace upload policy"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(
    wellKnownBody.links.workspaceUploadPolicy,
    "https://nocksperimental.com/api/workspaces/launch-lab-private/upload-policy",
    "well-known upload policy link"
  );
  assertIncludes(wellKnownBody.capabilities, "workspace-upload-policy", "well-known upload policy capability");
}

function assertWorkspaceDetailAction() {
  const page = readText("src/app/workspaces/[workspaceSlug]/page.tsx");

  assertIncludes(page, 'href={`/api/workspaces/${workspace.slug}/upload-policy`}', "workspace detail links upload policy");
  assertIncludes(page, "Upload Policy", "workspace detail upload policy action");
}

function assertSmokeDocsAndPackageScript() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");
  const workspaceDocs = readText("docs/workspaces.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(smokeScript, "/api/workspaces/launch-lab-private/upload-policy", "Cloudflare smoke checks upload policy");
  assertIncludes(smokeScript, "expectWorkspaceUploadPolicy", "Cloudflare smoke validates upload policy contract");
  assertIncludes(deploymentDocs, "/api/workspaces/launch-lab-private/upload-policy", "deployment docs mention upload policy");
  assertIncludes(workspaceDocs, "upload policy", "workspace docs mention upload policy");
  assertIncludes(
    packageJson.scripts.test,
    "test:workspace-upload-policy",
    "full test suite includes workspace upload policy test"
  );
  assertEqual(
    packageJson.scripts["test:workspace-upload-policy"],
    "node scripts/test-workspace-upload-policy-api.mjs",
    "workspace upload policy script"
  );
}

function createRequest(url = "https://nocksperimental.com/") {
  return { url };
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
