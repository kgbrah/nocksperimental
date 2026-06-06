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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/testkit-e2e/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "testkit/e2e status");
  assertEqual(body.version, "v0", "testkit/e2e version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/testkit-e2e",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThan(body.sourceAnchors.length, 10, "testkit/e2e source anchor count");
  assertSourceAnchor(
    body,
    "scenario-yaml-schema",
    "crates/nockchain-testkit/src/scenario.rs",
    "Scenario"
  );
  assertSourceAnchor(
    body,
    "scenario-yaml-schema",
    "crates/nockchain-testkit/src/scenario.rs",
    "Action"
  );
  assertSourceAnchor(
    body,
    "runner-scenario-lifecycle",
    "crates/nockchain-e2e/src/runner.rs",
    "run_scenario"
  );
  assertSourceAnchor(
    body,
    "node-manager-process-docker",
    "crates/nockchain-e2e/src/node.rs",
    "NodeManager::start_nodes"
  );
  assertSourceAnchor(
    body,
    "node-command-args",
    "crates/nockchain-e2e/src/node.rs",
    "build_node_args"
  );
  assertSourceAnchor(
    body,
    "grpc-readiness-height",
    "crates/nockchain-e2e/src/grpc.rs",
    "wait_for_ready"
  );
  assertSourceAnchor(
    body,
    "grpc-transaction-lifecycle",
    "crates/nockchain-e2e/src/grpc.rs",
    "submit_raw_tx"
  );
  assertSourceAnchor(
    body,
    "private-poke-mining-controls",
    "crates/nockchain-e2e/src/grpc.rs",
    "set_mining_enabled"
  );
  assertSourceAnchor(
    body,
    "report-json-contract",
    "crates/nockchain-e2e/src/report.rs",
    "Report::write_json"
  );
  assertSourceAnchor(
    body,
    "peer-speedup-report",
    "crates/nockchain-e2e/src/peer_speedup.rs",
    "assert_peer_speedup"
  );
  assertSourceAnchor(
    body,
    "upgrade-cluster-harness",
    "crates/nockchain-e2e/src/upgrade.rs",
    "NockchainCluster"
  );
  assertSourceAnchor(
    body,
    "nous-gen2-scenarios",
    "tests/e2e/scenarios/nous_testnet_gen2_send.yaml",
    "nous_testnet_gen2_send.yaml"
  );

  assertScenarioCapability(body, "process-and-docker-nodes", "node-manager-process-docker");
  assertScenarioCapability(body, "fakenet-mining-and-peer-topology", "node-command-args");
  assertScenarioCapability(body, "grpc-readiness-height-and-head-equality", "grpc-readiness-height");
  assertScenarioCapability(body, "wallet-command-capture-and-retry", "runner-scenario-lifecycle");
  assertScenarioCapability(body, "transaction-accepted-and-in-block", "grpc-transaction-lifecycle");
  assertScenarioCapability(body, "partition-reorg-and-upgrade", "upgrade-cluster-harness");
  assertScenarioCapability(body, "gen2-req-res-peer-speedup", "peer-speedup-report");
  assertScenarioCapability(body, "report-json-node-summaries", "report-json-contract");

  assertIncludes(body.receiptContract.requiredFields, "scenarioName", "receipt scenario name");
  assertIncludes(body.receiptContract.requiredFields, "scenarioSeed", "receipt scenario seed");
  assertIncludes(body.receiptContract.requiredFields, "runId", "receipt run id");
  assertIncludes(body.receiptContract.requiredFields, "nockchainCommit", "receipt Nockchain commit");
  assertIncludes(body.receiptContract.requiredFields, "nockchainBuild", "receipt Nockchain build");
  assertIncludes(body.receiptContract.requiredFields, "nodeIds", "receipt node ids");
  assertIncludes(body.receiptContract.requiredFields, "nodeMode", "receipt node mode");
  assertIncludes(body.receiptContract.requiredFields, "baseGrpcPort", "receipt base gRPC port");
  assertIncludes(body.receiptContract.requiredFields, "fakenetPhase", "receipt fakenet phase");
  assertIncludes(body.receiptContract.requiredFields, "stepRecords", "receipt step records");
  assertIncludes(body.receiptContract.requiredFields, "assertOutcomes", "receipt assert outcomes");
  assertIncludes(body.receiptContract.requiredFields, "finalHeights", "receipt final heights");
  assertIncludes(body.receiptContract.requiredFields, "artifactHash", "receipt artifact hash");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "forbid wallet seed phrase");
  assertIncludes(body.receiptContract.forbiddenFields, "privateSpendKey", "forbid private spend key");
  assertIncludes(body.receiptContract.forbiddenFields, "rawWalletExport", "forbid raw wallet export");
  assertIncludes(body.receiptContract.forbiddenFields, "rawPmaSlab", "forbid raw PMA slab");
  assertIncludes(body.receiptContract.forbiddenFields, "rawStateJam", "forbid raw state jam");
  assertIncludes(body.receiptContract.forbiddenFields, "rawStdoutLog", "forbid raw stdout log");
  assertIncludes(body.receiptContract.forbiddenFields, "rawTransactionPayload", "forbid raw transaction");

  assertIncludes(
    body.localVerification.recommendedCommands,
    "cargo check -p nockchain-testkit",
    "Nockchain testkit check command"
  );
  assertIncludes(
    body.localVerification.recommendedCommands,
    "cargo check -p nockchain-e2e",
    "Nockchain e2e check command"
  );
  assertEqual(body.localVerification.status, "source-inspected", "local verification status");
  assertGreaterThan(body.nocksperimentalImplications.length, 3, "Nocksperimental implication count");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/testkit-e2e", "page link");
  assertEqual(body.links.upstream, "https://github.com/nockchain/nockchain", "upstream link");
  assertEqual(body.links.operations, "https://nocksperimental.com/api/nockchain/operations", "operations link");
  assertEqual(body.links.syncGossip, "https://nocksperimental.com/api/nockchain/sync-gossip", "sync/gossip link");
  assertEqual(
    body.links.runtimeSafety,
    "https://nocksperimental.com/api/nockchain/runtime-safety",
    "runtime safety link"
  );
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-testkit-e2e",
    "/api/nockchain/testkit-e2e",
    "Nockchain testkit and E2E source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainTestkitE2e,
    "https://nocksperimental.com/api/nockchain/testkit-e2e",
    "well-known testkit/e2e link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-testkit-e2e", "testkit/e2e capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/testkit-e2e"]?.get?.summary,
    "Nockchain testkit and E2E source trace",
    "OpenAPI testkit/e2e path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(
    checkpointBody.counts.nockchainTestkitE2eAnchors,
    10,
    "checkpoint testkit/e2e anchor count"
  );
  assertEqual(
    checkpointBody.counts.nockchainTestkitE2eCapabilities,
    body.scenarioCapabilities.length,
    "checkpoint testkit/e2e capability count"
  );
  assertStartsWith(
    checkpointBody.roots.nockchainTestkitE2e,
    "sha256:",
    "checkpoint testkit/e2e root"
  );
  assertEqual(
    checkpointBody.checks.nockchainTestkitE2eAvailable,
    true,
    "checkpoint testkit/e2e check"
  );
  assertIncludes(
    checkpointBody.nockchainTestkitE2e.sourceAnchors,
    "scenario-yaml-schema",
    "checkpoint scenario schema anchor"
  );
  assertIncludes(
    checkpointBody.nockchainTestkitE2e.scenarioCapabilityIds,
    "transaction-accepted-and-in-block",
    "checkpoint transaction capability"
  );
  assertIncludes(
    checkpointBody.nockchainTestkitE2e.receiptFields,
    "stepRecords",
    "checkpoint testkit/e2e receipt field"
  );
  assertIncludes(
    checkpointBody.nockchainTestkitE2e.forbiddenFields,
    "rawStateJam",
    "checkpoint testkit/e2e forbidden state jam"
  );
  assertEqual(
    checkpointBody.links.nockchainTestkitE2e,
    "https://nocksperimental.com/api/nockchain/testkit-e2e",
    "checkpoint testkit/e2e link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-testkit-e2e-api"],
    "node scripts/test-nockchain-testkit-e2e-api.mjs",
    "package testkit/e2e API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-testkit-e2e-api",
    "full test includes testkit/e2e API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/testkit-e2e", "Cloudflare smoke includes testkit/e2e API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Testkit/E2E Trace", "README documents testkit/e2e trace");
  assertIncludes(readme, "/api/nockchain/testkit-e2e", "README documents testkit/e2e API");
}

function assertSourceAnchor(body, id, file, symbol) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing source anchor: ${id}`);
  }

  assertEqual(anchor.file, file, `${id} file`);
  assertIncludes(anchor.symbols, symbol, `${id} symbol`);
  assertGreaterThan(anchor.sourceUrls.length, 0, `${id} source URL`);
  assertGreaterThan(anchor.receiptFields.length, 0, `${id} receipt fields`);
}

function assertScenarioCapability(body, id, sourceAnchorId) {
  const capability = body.scenarioCapabilities.find((candidate) => candidate.id === id);

  if (!capability) {
    throw new Error(`Missing scenario capability: ${id}`);
  }

  assertIncludes(capability.sourceAnchorIds, sourceAnchorId, `${id} source anchor`);
  assertGreaterThan(capability.receiptFields.length, 0, `${id} receipt fields`);
}

function assertEndpoint(registry, id, pathName, description) {
  const endpoint = registry.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathName}`, `${id} URL`);
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(actual, expected, label) {
  if (!actual?.startsWith(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`);
  }
}

function assertGreaterThan(actual, expected, label) {
  if (!(actual > expected)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function loadTypeScriptModule(filePath) {
  const modulePath = path.join(process.cwd(), filePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${filePath}`);
  }

  const compiledModule = { exports: {} };
  moduleCache.set(modulePath, compiledModule);

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      baseUrl: process.cwd(),
      paths: {
        "@/*": ["src/*"]
      }
    },
    fileName: modulePath
  }).outputText;

  const dirname = path.dirname(modulePath);
  const localRequire = createLocalRequire(dirname);
  const compiled = new Function("exports", "require", "module", "__filename", "__dirname", output);
  compiled(compiledModule.exports, localRequire, compiledModule, modulePath, dirname);

  return compiledModule.exports;
}

function createLocalRequire(dirname) {
  return (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json(body, init = {}) {
            return Response.json(body, init);
          }
        }
      };
    }

    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }

    if (specifier.startsWith(".")) {
      const resolvedPath = path.resolve(dirname, specifier);
      const candidates = [resolvedPath, `${resolvedPath}.ts`, `${resolvedPath}.tsx`, `${resolvedPath}.js`];
      const found = candidates.find((candidate) => existsSync(candidate));

      if (found && (found.endsWith(".ts") || found.endsWith(".tsx"))) {
        return loadTypeScriptModule(path.relative(process.cwd(), found));
      }
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && [".ts", ".tsx"].includes(path.extname(aliasPath))) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(tsxPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsxPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}
