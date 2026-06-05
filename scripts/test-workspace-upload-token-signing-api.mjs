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
  await assertSignedTokenIssuanceAndVerification();
  await assertDiscoveryAndVerificationIndex();
  assertSmokeDocsAndPackageScript();
}

async function assertSignedTokenIssuanceAndVerification() {
  const { GET } = loadTypeScriptModule("src/app/api/workspaces/[workspaceSlug]/upload-token/route.ts");

  process.env.NOCKS_WORKSPACE_UPLOAD_KEYS = "workspace-uploader:upload-secret";
  process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY = "workspace-upload-signing-secret";
  process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_ISSUER_KEY_ID = "workspace-upload-token-test";

  const issued = await GET(
    createHeaderRequest({
      "x-nocks-workspace-upload-key-id": "workspace-uploader",
      "x-nocks-workspace-upload-key": "upload-secret"
    }),
    createContext({ workspaceSlug: "launch-lab-private" })
  );
  const body = await issued.json();

  assertEqual(issued.status, 200, "signed upload token status");
  assertEqual(body.status, "token-issued", "signed upload token status body");
  assertEqual(body.token.issuanceStatus, "issued", "signed upload token issuance");
  assertStartsWith(body.token.tokenValue, "nockwut_v0.", "signed upload token value");
  assertEqual(body.token.issuerKeyId, "workspace-upload-token-test", "signed upload token issuer");
  assertEqual(body.token.authenticationRequired, true, "signed upload token remains auth gated");
  assertEqual(body.token.secret, undefined, "signed upload token does not echo signing secret");
  assertEqual(body.workspace.slug, "launch-lab-private", "signed upload token workspace");
  assertEqual(body.challenge.tokenType, "workspace-report-upload", "signed upload token challenge type");
  assertIncludes(body.challenge.requiredClaims, "reportHash", "signed upload token report hash claim");
  assertIncludes(body.challenge.requiredEvidence, "snapshotRoot", "signed upload token snapshot evidence");
  assertEqual(
    body.links.verify,
    "https://nocksperimental.com/api/workspaces/upload-token/verify",
    "signed upload token verifier link"
  );

  const { GET: verifyToken } = loadTypeScriptModule("src/app/api/workspaces/upload-token/verify/route.ts");
  const verified = await verifyToken(
    createUrlRequest(`https://nocksperimental.com/api/workspaces/upload-token/verify?token=${encodeURIComponent(body.token.tokenValue)}`)
  );
  const verifiedBody = await verified.json();

  assertEqual(verified.status, 200, "signed upload token verifier status");
  assertEqual(verifiedBody.verified, true, "signed upload token verifies");
  assertEqual(verifiedBody.payload.workspaceSlug, "launch-lab-private", "signed upload token verifier workspace");
  assertEqual(verifiedBody.payload.tokenType, "workspace-report-upload", "signed upload token verifier type");
  assertEqual(verifiedBody.checks.signatureValid, true, "signed upload token verifier signature");
  assertEqual(verifiedBody.checks.notExpired, true, "signed upload token verifier expiry");
  assertEqual(verifiedBody.token.tokenValue, undefined, "signed upload token verifier does not echo token");
  assertEqual(
    verifiedBody.links.policy,
    "https://nocksperimental.com/api/workspaces/launch-lab-private/upload-policy",
    "signed upload token verifier policy link"
  );

  const tamperedToken = `${body.token.tokenValue.slice(0, -1)}${
    body.token.tokenValue.endsWith("x") ? "y" : "x"
  }`;
  const tampered = await verifyToken(
    createUrlRequest(`https://nocksperimental.com/api/workspaces/upload-token/verify?token=${encodeURIComponent(tamperedToken)}`)
  );
  const tamperedBody = await tampered.json();

  assertEqual(tampered.status, 200, "tampered upload token verifier status");
  assertEqual(tamperedBody.verified, false, "tampered upload token is rejected");
  assertEqual(tamperedBody.checks.signatureValid, false, "tampered upload token signature check");

  delete process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY;

  const unconfiguredVerifier = await verifyToken(
    createUrlRequest(`https://nocksperimental.com/api/workspaces/upload-token/verify?token=${encodeURIComponent(body.token.tokenValue)}`)
  );
  const unconfiguredVerifierBody = await unconfiguredVerifier.json();

  assertEqual(unconfiguredVerifier.status, 200, "unconfigured upload token verifier status");
  assertEqual(unconfiguredVerifierBody.verified, false, "unconfigured upload token verifier rejects");
  assertEqual(unconfiguredVerifierBody.checks.signingKeyConfigured, false, "unconfigured upload token verifier key check");

  delete process.env.NOCKS_WORKSPACE_UPLOAD_KEYS;
  delete process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_ISSUER_KEY_ID;
}

async function assertDiscoveryAndVerificationIndex() {
  process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY = "workspace-upload-signing-secret";
  process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_ISSUER_KEY_ID = "workspace-upload-token-test";

  const { GET: getOpenApi } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const openApi = await getOpenApi();
  const spec = await openApi.json();

  assertEqual(
    spec.paths["/api/workspaces/upload-token/verify"]?.get?.summary,
    "Workspace upload token verifier",
    "OpenAPI upload token verifier path"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(
    registryBody,
    "workspace-upload-token-verifier",
    "/api/workspaces/upload-token/verify",
    "Workspace upload token verifier"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(
    wellKnownBody.links.workspaceUploadTokenVerifier,
    "https://nocksperimental.com/api/workspaces/upload-token/verify",
    "well-known upload token verifier link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "workspace-upload-token-verifier",
    "well-known upload token verifier capability"
  );

  const verification = await loadTypeScriptModule("src/app/api/verify/route.ts").GET();
  const verificationBody = await verification.json();

  assertVerifier(
    verificationBody,
    "workspace-upload-token",
    "/api/workspaces/upload-token/verify",
    "Verify signed workspace upload tokens"
  );
  assertStartsWith(
    verificationBody.samples.workspaceUploadToken.url,
    "https://nocksperimental.com/api/workspaces/upload-token/verify?token=",
    "workspace upload token sample verifier URL"
  );
  assertEqual(
    verificationBody.samples.workspaceUploadToken.workspaceSlug,
    "launch-lab-private",
    "workspace upload token sample workspace"
  );

  delete process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY;
  delete process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_ISSUER_KEY_ID;
}

function assertSmokeDocsAndPackageScript() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");
  const workspaceDocs = readText("docs/workspaces.md");
  const verifyPage = readText("src/app/verify/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(smokeScript, "/api/workspaces/upload-token/verify", "Cloudflare smoke checks upload token verifier");
  assertIncludes(smokeScript, "expectWorkspaceUploadTokenVerification", "Cloudflare smoke validates upload token verifier");
  assertIncludes(deploymentDocs, "/api/workspaces/upload-token/verify", "deployment docs mention upload token verifier");
  assertIncludes(workspaceDocs, "signed upload token", "workspace docs mention signed upload token");
  assertIncludes(verifyPage, "samples.workspaceUploadToken", "verification page exposes upload token sample");
  assertIncludes(
    packageJson.scripts.test,
    "test:workspace-upload-token-signing",
    "full test suite includes signed workspace upload token test"
  );
  assertEqual(
    packageJson.scripts["test:workspace-upload-token-signing"],
    "node scripts/test-workspace-upload-token-signing-api.mjs",
    "signed workspace upload token script"
  );
}

function createHeaderRequest(headers = {}) {
  return {
    headers: new Headers(headers)
  };
}

function createUrlRequest(url) {
  return {
    url,
    headers: new Headers()
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

function assertVerifier(body, id, pathName, description) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);
  assertEqual(verifier?.description, description, `${id} verifier description`);
  assertIncludes(verifier?.queryParameters ?? [], "token", `${id} verifier token query`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
