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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/docs-atlas/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "docs atlas status");
  assertEqual(body.version, "v0", "docs atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/docs-atlas", "canonical URL");
  assertEqual(body.upstream.repository.fullName, "nockchain/nockchain", "upstream repository");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertEqual(body.trustContract.readOrder[0], "START_HERE.md", "trust contract starts at START_HERE");
  assertIncludes(body.trustContract.readOrder, "PROTOCOL.md", "trust contract includes PROTOCOL");
  assertIncludes(body.trustContract.conflictRule, "Tier 0 overrides Tier 1", "trust conflict rule");
  assertIncludes(body.trustContract.crateReadmeIsolationRule, "Do not trust a crate README", "crate README rule");

  assertPaths(body.tier0, [
    "START_HERE.md",
    "PROTOCOL.md",
    "ARCHITECTURE.md",
    "WORKFLOWS.md",
    "DECISIONS/README.md"
  ]);
  assertPaths(body.tier1, [
    "crates/nockapp/README.md",
    "crates/nockchain-api/README.md",
    "crates/nockchain-wallet/README.md"
  ]);
  assertPaths(body.legacyOrExperimental, ["crates/nockup/README.md"]);
  assertIncludes(
    body.legacyOrExperimental[0].canonicalStatus,
    "Legacy",
    "nockup stays legacy/experimental"
  );

  const nous = findSpec(body, "013");
  assertEqual(nous.codename, "Nous", "Nous codename");
  assertEqual(nous.status, "final", "Nous status");
  assertEqual(nous.consensusCritical, false, "Nous consensus critical flag");
  assertEqual(nous.activationHeight, 0, "Nous activation height");
  assertEqual(nous.activationTarget, "2026-Q2", "Nous activation target");

  const aletheia = findSpec(body, "014");
  assertEqual(aletheia.codename, "Aletheia", "Aletheia codename");
  assertEqual(aletheia.status, "activated", "Aletheia frontmatter status");
  assertEqual(aletheia.consensusCritical, true, "Aletheia consensus critical flag");
  assertEqual(aletheia.activationHeight, 65500, "Aletheia activation height");

  assertEqual(
    body.consistencyChecks.protocolIndexMatchesSpecFrontmatter,
    false,
    "protocol index/spec frontmatter mismatch is surfaced"
  );
  assertIncludes(
    body.consistencyChecks.alerts.map((alert) => alert.id),
    "protocol-014-status-drift",
    "014 status drift alert"
  );
  assertIncludes(
    body.nocksperimentalImplications.receiptFields,
    "docConsistencyAlerts",
    "receipt fields include consistency alerts"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-docs-atlas",
    "/api/nockchain/docs-atlas",
    "Nockchain docs and protocol atlas"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainDocsAtlas,
    "https://nocksperimental.com/api/nockchain/docs-atlas",
    "well-known docs atlas link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-docs-protocol-atlas", "docs atlas capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/docs-atlas"]?.get?.summary,
    "Nockchain docs and protocol atlas",
    "OpenAPI docs atlas path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainProtocolSpecs, 10, "checkpoint protocol spec count");
  assertStartsWith(checkpointBody.roots.nockchainDocsAtlas, "sha256:", "checkpoint docs atlas root");
  assertEqual(
    checkpointBody.links.nockchainDocsAtlas,
    "https://nocksperimental.com/api/nockchain/docs-atlas",
    "checkpoint docs atlas link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-docs-atlas-api"],
    "node scripts/test-nockchain-docs-atlas-api.mjs",
    "package docs atlas test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-docs-atlas-api", "full test includes docs atlas test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/docs-atlas", "Cloudflare smoke includes docs atlas API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Docs And Protocol Atlas", "README documents docs atlas");
  assertIncludes(readme, "/api/nockchain/docs-atlas", "README documents docs atlas endpoint");
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

function findSpec(body, sequence) {
  const spec = body.protocolSpecs.specs.find((candidate) => candidate.sequence === sequence);

  if (!spec) {
    throw new Error(`Missing protocol spec ${sequence}`);
  }

  return spec;
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

function assertPaths(collection, expectedPaths) {
  const actualPaths = collection.map((item) => item.path);

  for (const expectedPath of expectedPaths) {
    assertIncludes(actualPaths, expectedPath, `${expectedPath} present`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertGreaterThan(actual, minimum, label) {
  if (!(actual > minimum)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${minimum}`);
  }
}

function assertStartsWith(actual, prefix, label) {
  if (typeof actual !== "string" || !actual.startsWith(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(prefix)}`);
  }
}
