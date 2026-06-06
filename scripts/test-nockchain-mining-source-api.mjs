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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/mining-source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "mining source status");
  assertEqual(body.version, "v0", "mining source version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/mining-source",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertIncludes(body.upstream.crates, "nockchain", "upstream nockchain crate");
  assertIncludes(body.upstream.crates, "kernels-open-miner", "upstream miner kernel crate");
  assertIncludes(body.upstream.crates, "nockchain-libp2p-io", "upstream libp2p crate");

  assertGreaterThan(body.sourceAnchors.length, 12, "source anchor count");
  assertSourceAnchor(body, "fakenet-miner-script", "scripts/run_nockchain_miner_fakenet.sh", "--mine");
  assertSourceAnchor(body, "node-fakenet-script", "scripts/run_nockchain_node_fakenet.sh", "--bind-public-grpc-addr");
  assertSourceAnchor(body, "mainnet-miner-script", "scripts/run_nockchain_miner.sh", "--num-threads");
  assertSourceAnchor(body, "mining-cli-flags", "crates/nockchain/src/config.rs", "fakenet_pow_len");
  assertSourceAnchor(body, "fakenet-constants-poke", "crates/nockchain/src/lib.rs", "PokeFakenetConstants");
  assertSourceAnchor(body, "fakenet-blockchain-constants", "crates/nockchain-types/src/blockchain_constants.rs", "DEFAULT_FAKENET_POW_LEN");
  assertSourceAnchor(body, "mining-driver-bootstrap", "crates/nockchain/src/lib.rs", "create_mining_driver");
  assertSourceAnchor(body, "mining-wire-contract", "crates/nockchain/src/mining.rs", "MiningWire::Candidate");
  assertSourceAnchor(body, "candidate-effect-handler", "crates/nockchain/src/mining.rs", "pow_len");
  assertSourceAnchor(body, "mined-pow-poke", "crates/nockchain/src/mining.rs", "start_mining_attempt");
  assertSourceAnchor(body, "miner-kernel-pow-check", "hoon/apps/dumbnet/miner.hoon", "check-target:mine");
  assertSourceAnchor(body, "pow-library", "hoon/common/pow.hoon", "prove-block-inner");
  assertSourceAnchor(body, "candidate-block-state", "hoon/apps/dumbnet/lib/miner.hoon", "update-candidate-block");
  assertSourceAnchor(body, "structured-miner-traces", "crates/nockchain/src/traces.rs", "new_heaviest_miner");
  assertSourceAnchor(body, "libp2p-request-pow-separation", "crates/nockchain-libp2p-io/src/messages.rs", "verify_pow");

  assertCapability(body, "operator-fakenet-miner-command", "fakenet-miner-script");
  assertCapability(body, "wallet-address-reward-target", "mining-cli-flags");
  assertCapability(body, "fakenet-difficulty-controls", "fakenet-blockchain-constants");
  assertCapability(body, "candidate-block-refresh", "candidate-block-state");
  assertCapability(body, "threaded-mining-driver", "candidate-effect-handler");
  assertCapability(body, "proof-kernel-validation", "miner-kernel-pow-check");
  assertCapability(body, "mined-block-submission", "mined-pow-poke");
  assertCapability(body, "trace-and-diagnostics", "structured-miner-traces");
  assertCapability(body, "network-pow-separation", "libp2p-request-pow-separation");

  assertIncludes(body.receiptContract.requiredFields, "miningPkh", "mining pkh field");
  assertIncludes(body.receiptContract.requiredFields, "fakenetPowLen", "pow len field");
  assertIncludes(body.receiptContract.requiredFields, "candidatePowLen", "candidate pow field");
  assertIncludes(body.receiptContract.requiredFields, "candidateHeader", "candidate header field");
  assertIncludes(body.receiptContract.requiredFields, "candidateTarget", "candidate target field");
  assertIncludes(body.receiptContract.requiredFields, "minedBlockDigest", "mined digest field");
  assertIncludes(body.receiptContract.requiredFields, "heaviestMinerHeight", "heaviest miner field");
  assertIncludes(body.receiptContract.requiredFields, "syncMode", "sync field");
  assertIncludes(body.receiptContract.requiredFields, "routeTableSize", "route table field");
  assertIncludes(body.receiptContract.forbiddenFields, "rawMinerJam", "forbid raw miner jam");
  assertIncludes(body.receiptContract.forbiddenFields, "rawCandidateNoun", "forbid raw candidate noun");
  assertIncludes(body.receiptContract.forbiddenFields, "rawPowProof", "forbid raw pow proof");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "forbid wallet seed phrase");

  assertIncludes(body.operationalModes.map((mode) => mode.id), "local-fakenet-hub", "fakenet hub mode");
  assertIncludes(body.operationalModes.map((mode) => mode.id), "local-fakenet-miner", "fakenet miner mode");
  assertIncludes(body.operationalModes.map((mode) => mode.id), "mainnet-miner", "mainnet miner mode");
  assertIncludes(body.diagnosticScenarios.map((scenario) => scenario.id), "wrong-block-commitment", "wrong commitment diagnostic");
  assertIncludes(body.diagnosticScenarios.map((scenario) => scenario.id), "empty-routing-table", "empty routing table diagnostic");
  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p nockchain", "nockchain cargo check");
  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p kernels-open-miner", "miner kernel cargo check");
  assertIncludes(body.localVerification.recommendedCommands, "cargo test -p nockchain-libp2p-io req_res_pow", "libp2p pow cargo test");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-mining-source-trace",
    "/api/nockchain/mining-source",
    "Nockchain mining and PoW source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainMiningSourceTrace,
    "https://nocksperimental.com/api/nockchain/mining-source",
    "well-known mining source link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-mining-source-trace", "mining source capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/mining-source"]?.get?.summary,
    "Nockchain mining and PoW source trace",
    "OpenAPI mining source path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainMiningSourceAnchors, 12, "checkpoint mining anchors");
  assertEqual(
    checkpointBody.counts.nockchainMiningSourceCapabilities,
    body.miningCapabilities.length,
    "checkpoint mining capabilities"
  );
  assertStartsWith(
    checkpointBody.roots.nockchainMiningSourceTrace,
    "sha256:",
    "checkpoint mining root"
  );
  assertEqual(
    checkpointBody.checks.nockchainMiningSourceTraceAvailable,
    true,
    "checkpoint mining source check"
  );
  assertIncludes(
    checkpointBody.nockchainMiningSourceTrace.sourceAnchors,
    "miner-kernel-pow-check",
    "checkpoint miner kernel anchor"
  );
  assertIncludes(
    checkpointBody.nockchainMiningSourceTrace.miningCapabilityIds,
    "proof-kernel-validation",
    "checkpoint proof capability"
  );
  assertEqual(
    checkpointBody.links.nockchainMiningSourceTrace,
    "https://nocksperimental.com/api/nockchain/mining-source",
    "checkpoint mining source link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-mining-source-api"],
    "node scripts/test-nockchain-mining-source-api.mjs",
    "package mining source API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-mining-source-api",
    "full test includes mining source API test"
  );

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/mining-source", "Cloudflare smoke includes mining source API");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Mining/PoW Source Trace", "README documents mining source trace");
  assertIncludes(readme, "/api/nockchain/mining-source", "README documents mining source route");
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

function assertCapability(body, id, sourceAnchorId) {
  const capability = body.miningCapabilities.find((candidate) => candidate.id === id);

  if (!capability) {
    throw new Error(`Missing mining capability: ${id}`);
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

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiledModule.exports, createModuleRequire(), compiledModule, modulePath, path.dirname(modulePath));

  return compiledModule.exports;
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
