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
  await assertTrustUpdateDetailApi();
  await assertOpenApiPath();
  assertDetailPage();
  assertListPage();
  assertSmokeAndDocs();
  assertPackageScript();
}

async function assertTrustUpdateDetailApi() {
  const { GET } = loadTypeScriptModule("src/app/api/trust/updates/[updateId]/route.ts");
  const response = await GET(createRequest(), createContext({ updateId: "update-score-history-v0" }));
  const body = await response.json();

  assertEqual(response.status, 200, "trust update detail API status");
  assertEqual(body.version, "v0", "trust update detail API version");
  assertEqual(body.entry.id, "update-score-history-v0", "trust update entry id");
  assertEqual(body.entry.sequence, 4, "trust update entry sequence");
  assertEqual(body.entry.previousRoot, "root-badge-revocation-v0", "trust update previous root");
  assertEqual(body.entry.rootHash, "root-score-history-v0", "trust update root hash");
  assertEqual(body.entry.entryHash, "sha256:append-score-history-v0", "trust update entry hash");
  assertEqual(body.validation.isAppendOnly, true, "trust update chain validation");
  assertEqual(body.position.previousUpdateId, "update-badge-revocation-v0", "trust update previous entry link");
  assertEqual(body.position.nextUpdateId, "update-game-badge-issuance-v0", "trust update next entry link");
  assertEqual(body.links.collection, "/api/trust/updates", "trust update collection API link");
  assertEqual(body.links.detail, "/trust/updates/update-score-history-v0", "trust update detail page link");
  assertEqual(body.links.targetApi, "/api/trust/score-history", "trust update target API link");

  const missing = await GET(createRequest(), createContext({ updateId: "missing-update" }));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing trust update status");
  assertEqual(missingBody.error, "Trust update entry not found", "missing trust update error");
  assertEqual(missingBody.updateId, "missing-update", "missing trust update id");
}

async function assertOpenApiPath() {
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(
    spec.paths["/api/trust/updates/{updateId}"]?.get?.summary,
    "Trust update entry detail",
    "OpenAPI trust update detail path"
  );
}

function assertDetailPage() {
  const pagePath = "src/app/trust/updates/[updateId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);

  assertIncludes(page, "notFound", "trust update detail page 404s missing updates");
  assertIncludes(page, "Update Detail", "trust update detail page title");
  assertIncludes(page, "Verification Actions", "trust update detail page renders verification actions");
  assertIncludes(page, 'href={`/api/trust/updates/${entry.id}`}', "trust update detail page links entry API");
  assertIncludes(page, "entry.entryHash", "trust update detail page renders entry hash");
  assertIncludes(page, "entry.previousRoot", "trust update detail page renders previous root");
  assertIncludes(page, "entry.rootHash", "trust update detail page renders root hash");
  assertIncludes(page, "validation.isAppendOnly", "trust update detail page renders chain validation");
}

function assertListPage() {
  const page = readText("src/app/trust/updates/page.tsx");

  assertIncludes(page, 'href={`/trust/updates/${entry.id}`}', "trust updates list links detail page");
  assertIncludes(page, "Open Detail", "trust updates list exposes detail action");
}

function assertSmokeAndDocs() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  for (const pathName of [
    "/api/trust/updates/update-score-history-v0",
    "/trust/updates/update-score-history-v0"
  ]) {
    assertIncludes(smokeScript, pathName, `Cloudflare smoke checks ${pathName}`);
    assertIncludes(deploymentDocs, pathName, `deployment docs mention ${pathName}`);
  }
}

function assertPackageScript() {
  const packageJson = JSON.parse(readText("package.json"));

  assertIncludes(
    packageJson.scripts.test,
    "test:trust-update-detail",
    "full test suite includes trust update detail test"
  );
  assertEqual(
    packageJson.scripts["test:trust-update-detail"],
    "node scripts/test-trust-update-detail.mjs",
    "trust update detail script"
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
