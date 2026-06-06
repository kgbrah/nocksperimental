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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/operations/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "operations atlas status");
  assertEqual(body.version, "v0", "operations atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/operations", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-5d022ced55040221e8b6fcfd78114189fbae91a0",
    "upstream release"
  );

  assertScript(body, "fakenet-node", "scripts/run_nockchain_node_fakenet.sh", "--bind-public-grpc-addr 127.0.0.1:5555");
  assertScript(body, "fakenet-miner", "scripts/run_nockchain_miner_fakenet.sh", "--no-default-peers");
  assertScript(body, "mainnet-node", "scripts/run_nockchain_node.sh", "nockchain");
  assertScript(body, "mainnet-miner", "scripts/run_nockchain_miner.sh", "--num-threads");

  assertScenario(body, "empty-routing-table", "routing table is empty");
  assertScenario(body, "no-connected-peers", "No connected peers");
  assertScenario(body, "wrong-block-commitment", "different fakenet tip or state artifact");
  assertScenario(body, "behind-tip-gossip-suppression", "libp2p: suppress all outgoing gossip");
  assertScenario(body, "state-jam-provenance", "raw PMA slabs");

  assertIncludes(body.operatorChecklist, "Confirm the node is caught up before mining or interpreting block commitments.", "sync checklist");
  assertIncludes(body.operatorChecklist, "Record state-jam/checkpoint source URL, hash, height/event boundary, and Nockchain build before trusting bootstrap state.", "state-jam checklist");
  assertIncludes(body.stateArtifactSafety.doNotStore, "raw PMA slabs", "raw PMA safety");
  assertEqual(body.links.localDiagnostics, "https://nocksperimental.com/api/fakenet/diagnostics", "diagnostics link");
  assertEqual(body.links.fakenetRunbook, "https://nocksperimental.com/api/fakenet/runbook.sh", "runbook link");
  assertEqual(body.links.stateJams, "https://nocksperimental.com/api/nockchain/state-jams", "state-jams link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust atlas link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-operations-atlas",
    "/api/nockchain/operations",
    "Nockchain operations atlas"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainOperationsAtlas,
    "https://nocksperimental.com/api/nockchain/operations",
    "well-known operations link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-operations-atlas", "operations capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/operations"]?.get?.summary,
    "Nockchain operations atlas",
    "OpenAPI operations path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainOperationsScenarios, 4, "checkpoint operations scenario count");
  assertStartsWith(checkpointBody.roots.nockchainOperationsAtlas, "sha256:", "checkpoint operations root");
  assertEqual(checkpointBody.checks.nockchainOperationsAtlasAvailable, true, "checkpoint operations guard");
  assertEqual(
    checkpointBody.links.nockchainOperationsAtlas,
    "https://nocksperimental.com/api/nockchain/operations",
    "checkpoint operations link"
  );

  const page = readText("src/app/nockchain/operations/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainOperationsAtlas", "operations page uses atlas");
  assertIncludes(page, "Nockchain Operations", "operations page title");
  assertIncludes(page, "wrong-block-commitment", "operations page renders wrong commitment scenario");
  assertIncludes(page, "empty-routing-table", "operations page renders empty routing table scenario");
  assertIncludes(page, "no-connected-peers", "operations page renders no peers scenario");
  assertIncludes(page, "behind-tip-gossip-suppression", "operations page renders behind-tip scenario");
  assertIncludes(page, "run_nockchain_node_fakenet.sh", "operations page renders fakenet script");
  assertIncludes(page, 'href="/api/nockchain/operations"', "operations page links API");
  assertIncludes(page, 'href="/nockchain"', "operations page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/operations"', "Nockchain page links operations page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-operations-atlas"],
    "node scripts/test-nockchain-operations-atlas.mjs",
    "package operations test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-operations-atlas", "full test includes operations test");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/operations", "Cloudflare smoke includes operations API");
  assertIncludes(smokeSource, "/nockchain/operations", "Cloudflare smoke includes operations page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Operations Atlas", "README documents operations atlas");
  assertIncludes(readme, "/api/nockchain/operations", "README documents operations endpoint");
  assertIncludes(readme, "/nockchain/operations", "README documents operations page");
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

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
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

function assertScript(body, id, expectedPath, expectedText) {
  const script = body.scriptSources.find((candidate) => candidate.id === id);

  if (!script) {
    throw new Error(`Missing script source: ${id}`);
  }

  assertEqual(script.path, expectedPath, `${id} path`);
  assertIncludes(
    [script.command, script.operationalUse, script.evidenceToCapture].filter(Boolean).join("\n"),
    expectedText,
    `${id} expected text`
  );
}

function assertScenario(body, id, expectedText) {
  const scenario = body.triageScenarios.find((candidate) => candidate.id === id);

  if (!scenario) {
    throw new Error(`Missing triage scenario: ${id}`);
  }

  assertIncludes(
    [
      scenario.title,
      scenario.symptom,
      scenario.interpretation,
      scenario.upstreamSignal,
      ...(scenario.checks ?? []),
      ...(scenario.evidenceToCapture ?? []),
      ...(scenario.relatedCrates ?? [])
    ].join("\n"),
    expectedText,
    `${id} expected text`
  );
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

function assertGreaterThan(actual, expectedMinimum, label) {
  if (!(actual > expectedMinimum)) {
    throw new Error(`${label}: expected more than ${expectedMinimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
