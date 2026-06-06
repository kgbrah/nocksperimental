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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/nockapp-atlas/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "NockApp atlas status");
  assertEqual(body.version, "v0", "NockApp atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/nockapp-atlas",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertIncludes(body.sourceAuthority.canonical.sources, "crates/nockapp", "canonical tracks nockapp");
  assertIncludes(body.sourceAuthority.canonical.sources, "crates/nockapp-grpc", "canonical tracks grpc");
  assertIncludes(body.sourceAuthority.canonical.sources, "crates/nockvm/rust/nockvm", "canonical tracks nockvm");
  assertIncludes(body.sourceAuthority.lineage.sources, "zorp-corp/nockapp", "lineage tracks Zorp NockApp");
  assertIncludes(body.sourceAuthority.lineage.sources, "zorp-corp/sword", "lineage tracks Sword");
  assertIncludes(
    body.sourceAuthority.stateArtifacts.sources,
    "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    "state artifact source tracks Zorp state-jam folder"
  );

  assertRuntimeBoundary(body, "poke-effects", "effectTag", "stateRootAfter");
  assertRuntimeBoundary(body, "peek-reads", "peekPath", "stateRootAtPeek");
  assertRuntimeBoundary(body, "pma-durability", "stateJamFingerprint", "pmaBoundary");
  assertRuntimeBoundary(body, "grpc-private-endpoint", "grpcEndpoint", "endpointMode");
  assertRuntimeBoundary(body, "nockup-fixture", "jamHash", "nockupTemplate");

  assertIncludes(body.receiptContract.requiredFields, "nockchainCommit", "receipt requires commit");
  assertIncludes(body.receiptContract.requiredFields, "nockchainBuild", "receipt requires build");
  assertIncludes(body.receiptContract.requiredFields, "kernel", "receipt requires kernel");
  assertIncludes(body.receiptContract.requiredFields, "pokePath", "receipt requires poke path");
  assertIncludes(body.receiptContract.requiredFields, "peekPath", "receipt requires peek path");
  assertIncludes(body.receiptContract.requiredFields, "stateRootBefore", "receipt requires before root");
  assertIncludes(body.receiptContract.requiredFields, "stateRootAfter", "receipt requires after root");
  assertIncludes(body.receiptContract.requiredFields, "jamHash", "receipt requires jam hash");
  assertIncludes(body.receiptContract.requiredFields, "stateJamFingerprint", "receipt requires state-jam fingerprint");
  assertIncludes(body.receiptContract.forbiddenFields, "rawPmaSlab", "receipt forbids raw PMA");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "receipt forbids seed phrase");
  assertIncludes(
    body.receiptContract.interpretationRules,
    "Treat Zorp NockApp and Sword repositories as lineage/context, not current protocol authority.",
    "lineage interpretation rule"
  );

  assertIncludes(body.probeTemplates.map((template) => template.id), "poke-roundtrip", "poke template");
  assertIncludes(body.probeTemplates.map((template) => template.id), "peek-state-read", "peek template");
  assertIncludes(body.probeTemplates.map((template) => template.id), "nockup-build-run", "nockup template");
  assertIncludes(body.probeTemplates.map((template) => template.id), "state-export-snapshot", "state export template");

  assertIncludes(
    body.nocksperimentalNextUses,
    "Attach the NockApp runtime boundary to fakenet, Nockup, VESL, and user-connected fakenet receipts.",
    "next use attaches runtime boundary"
  );
  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/nockapp", "page link");
  assertEqual(body.links.zorp, "https://nocksperimental.com/api/nockchain/zorp", "Zorp link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "Rust atlas link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-nockapp-atlas",
    "/api/nockchain/nockapp-atlas",
    "Nockchain NockApp runtime atlas"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainNockAppAtlas,
    "https://nocksperimental.com/api/nockchain/nockapp-atlas",
    "well-known NockApp atlas link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "nockchain-nockapp-runtime-atlas",
    "NockApp atlas capability"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/nockapp-atlas"]?.get?.summary,
    "Nockchain NockApp runtime atlas",
    "OpenAPI NockApp atlas path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainNockAppRuntimeBoundaries, 5, "checkpoint boundary count");
  assertEqual(checkpointBody.counts.nockchainNockAppProbeTemplates, 4, "checkpoint probe template count");
  assertStartsWith(checkpointBody.roots.nockchainNockAppAtlas, "sha256:", "checkpoint NockApp root");
  assertEqual(
    checkpointBody.checks.nockchainNockAppAtlasAvailable,
    true,
    "checkpoint NockApp atlas check"
  );
  assertIncludes(
    checkpointBody.nockchainNockAppAtlas.boundaryIds,
    "poke-effects",
    "checkpoint boundary ids include poke"
  );
  assertIncludes(
    checkpointBody.nockchainNockAppAtlas.receiptFields,
    "stateJamFingerprint",
    "checkpoint receipt fields include state jam fingerprint"
  );
  assertEqual(
    checkpointBody.links.nockchainNockAppAtlas,
    "https://nocksperimental.com/api/nockchain/nockapp-atlas",
    "checkpoint NockApp link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-nockapp-atlas-api"],
    "node scripts/test-nockchain-nockapp-atlas-api.mjs",
    "package NockApp atlas test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockapp-atlas-api",
    "full test includes NockApp atlas test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/nockapp-atlas", "Cloudflare smoke includes NockApp atlas API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain NockApp Runtime Atlas", "README documents NockApp atlas");
  assertIncludes(readme, "/api/nockchain/nockapp-atlas", "README documents NockApp atlas endpoint");
}

function assertRuntimeBoundary(body, id, firstField, secondField) {
  const boundary = body.runtimeBoundaries.find((candidate) => candidate.id === id);

  if (!boundary) {
    throw new Error(`Missing NockApp runtime boundary: ${id}`);
  }

  assertIncludes(boundary.receiptFields, firstField, `${id} includes ${firstField}`);
  assertIncludes(boundary.receiptFields, secondField, `${id} includes ${secondField}`);
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

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
