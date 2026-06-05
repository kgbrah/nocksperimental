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
  await assertUploadTokenRoute();
  await assertRegistryAndOpenApi();
  assertWorkspaceDetailAction();
  assertSmokeDocsAndPackageScript();
}

async function assertUploadTokenRoute() {
  const { GET } = loadTypeScriptModule("src/app/api/workspaces/[workspaceSlug]/upload-token/route.ts");

  delete process.env.NOCKS_WORKSPACE_UPLOAD_KEYS;

  const unconfigured = await GET(createRequest(), createContext({ workspaceSlug: "launch-lab-private" }));
  const unconfiguredBody = await unconfigured.json();

  assertEqual(unconfigured.status, 401, "unconfigured upload token status");
  assertEqual(unconfiguredBody.error, "unauthorized workspace upload token", "unconfigured upload token error");
  assertEqual(unconfiguredBody.authenticationRequired, true, "unconfigured upload token auth flag");
  assertEqual(unconfiguredBody.links.policy, "/api/workspaces/launch-lab-private/upload-policy", "unconfigured upload token policy link");

  process.env.NOCKS_WORKSPACE_UPLOAD_KEYS = "workspace-uploader:upload-secret";

  const wrongKey = await GET(
    createRequest({
      "x-nocks-workspace-upload-key-id": "workspace-uploader",
      "x-nocks-workspace-upload-key": "wrong-secret"
    }),
    createContext({ workspaceSlug: "launch-lab-private" })
  );

  assertEqual(wrongKey.status, 401, "wrong upload key status");

  const missingWorkspace = await GET(
    createRequest({
      "x-nocks-workspace-upload-key-id": "workspace-uploader",
      "x-nocks-workspace-upload-key": "upload-secret"
    }),
    createContext({ workspaceSlug: "missing-workspace" })
  );
  const missingWorkspaceBody = await missingWorkspace.json();

  assertEqual(missingWorkspace.status, 404, "missing workspace upload token status");
  assertEqual(missingWorkspaceBody.error, "Workspace not found", "missing workspace upload token error");

  const authorized = await GET(
    createRequest({
      "x-nocks-workspace-upload-key-id": "workspace-uploader",
      "x-nocks-workspace-upload-key": "upload-secret"
    }),
    createContext({ workspaceSlug: "launch-lab-private" })
  );
  const body = await authorized.json();

  assertEqual(authorized.status, 200, "authorized upload token status");
  assertEqual(body.version, "v0", "authorized upload token version");
  assertEqual(body.subject, "nocksperimental.com", "authorized upload token subject");
  assertEqual(body.workspace.slug, "launch-lab-private", "authorized upload token workspace");
  assertEqual(body.status, "challenge-issued", "authorized upload token status body");
  assertEqual(body.authentication.keyId, "workspace-uploader", "authorized upload token key id");
  assertEqual(body.authentication.secret, undefined, "authorized upload token omits secret");
  assertEqual(body.token.issuanceStatus, "not-issued", "authorized upload token does not issue token");
  assertEqual(body.token.tokenValue, null, "authorized upload token value is null");
  assertEqual(body.challenge.tokenType, "workspace-report-upload", "authorized upload token type");
  assertEqual(body.challenge.audience, "nocksperimental.com/workspace-report-upload", "authorized upload token audience");
  assertEqual(body.challenge.ttlSeconds, 900, "authorized upload token TTL");
  assertIncludes(body.challenge.requiredClaims, "workspaceSlug", "authorized upload token workspace claim");
  assertIncludes(body.challenge.requiredClaims, "reportHash", "authorized upload token report hash claim");
  assertIncludes(body.challenge.requiredEvidence, "snapshotRoot", "authorized upload token snapshot evidence");
  assertEqual(body.links.policy, "https://nocksperimental.com/api/workspaces/launch-lab-private/upload-policy", "authorized upload token policy link");
  assertEqual(body.links.evidence, "https://nocksperimental.com/api/workspaces/launch-lab-private/evidence", "authorized upload token evidence link");

  delete process.env.NOCKS_WORKSPACE_UPLOAD_KEYS;
}

async function assertRegistryAndOpenApi() {
  const { GET: getOpenApi } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const openApi = await getOpenApi();
  const spec = await openApi.json();

  assertEqual(
    spec.paths["/api/workspaces/{workspaceSlug}/upload-token"]?.get?.summary,
    "Workspace upload token gate",
    "OpenAPI upload token path"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "workspace-upload-token",
    "/api/workspaces/launch-lab-private/upload-token",
    "Workspace upload token gate"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(
    wellKnownBody.links.workspaceUploadToken,
    "https://nocksperimental.com/api/workspaces/launch-lab-private/upload-token",
    "well-known upload token link"
  );
  assertIncludes(wellKnownBody.capabilities, "workspace-upload-token-gate", "well-known upload token capability");
}

function assertWorkspaceDetailAction() {
  const page = readText("src/app/workspaces/[workspaceSlug]/page.tsx");

  assertIncludes(page, 'href={`/api/workspaces/${workspace.slug}/upload-token`}', "workspace detail links upload token");
  assertIncludes(page, "Token Gate", "workspace detail upload token action");
}

function assertSmokeDocsAndPackageScript() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");
  const workspaceDocs = readText("docs/workspaces.md");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(smokeScript, "/api/workspaces/launch-lab-private/upload-token", "Cloudflare smoke checks upload token");
  assertIncludes(smokeScript, "expectWorkspaceUploadTokenGate", "Cloudflare smoke validates upload token gate");
  assertIncludes(deploymentDocs, "/api/workspaces/launch-lab-private/upload-token", "deployment docs mention upload token");
  assertIncludes(workspaceDocs, "upload token gate", "workspace docs mention upload token gate");
  assertIncludes(
    packageJson.scripts.test,
    "test:workspace-upload-token",
    "full test suite includes workspace upload token test"
  );
  assertEqual(
    packageJson.scripts["test:workspace-upload-token"],
    "node scripts/test-workspace-upload-token-api.mjs",
    "workspace upload token script"
  );
}

function createRequest(headers = {}) {
  return {
    headers: new Headers(headers)
  };
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
