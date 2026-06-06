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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/rust-source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "rust source guide status");
  assertEqual(body.version, "v0", "rust source guide version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/rust-source", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThanOrEqual(body.sourceDomains.length, 10, "source domain count");
  for (const domainId of [
    "node-runtime",
    "mining-runtime",
    "p2p-sync-gossip",
    "nockapp-runtime",
    "pma-durability",
    "runtime-stack-safety",
    "wallet-cli",
    "wallet-transaction-builder",
    "public-api-grpc",
    "bridge-withdrawal",
    "bridge-sequencer",
    "bridge-dev-scenarios",
    "nockup-scaffold"
  ]) {
    assertIncludes(body.sourceDomains.map((domain) => domain.id), domainId, `${domainId} source domain`);
  }

  assertGreaterThanOrEqual(body.sourceAnchors.length, 15, "source anchor count");
  assertAnchor(body, "nockchain-node-main", {
    domainId: "node-runtime",
    crateName: "nockchain",
    sourcePath: "crates/nockchain/src/main.rs",
    symbol: "main",
    lineRange: "L20-L80",
    receiptField: "nodeCommand",
    forbiddenField: "rawPmaSlab",
    targetSurface: "localFakenetReadiness"
  });
  assertAnchor(body, "mining-key-config", {
    domainId: "mining-runtime",
    crateName: "nockchain",
    sourcePath: "crates/nockchain/src/mining.rs",
    symbol: "MiningKeyConfig / MiningPkhConfig",
    lineRange: "L53-L130",
    receiptField: "miningPublicKey",
    targetSurface: "nockchainOperationsAtlas"
  });
  assertAnchor(body, "libp2p-catch-up-signal", {
    domainId: "p2p-sync-gossip",
    crateName: "nockchain-libp2p-io",
    sourcePath: "crates/nockchain-libp2p-io/src/catch_up.rs",
    symbol: "CatchUpSignal::is_catching_up",
    lineRange: "L77-L160",
    receiptField: "syncMode",
    targetSurface: "nockchainSyncGossipTrace"
  });
  assertAnchor(body, "libp2p-gossip-suppression", {
    domainId: "p2p-sync-gossip",
    crateName: "nockchain-libp2p-io",
    sourcePath: "crates/nockchain-libp2p-io/src/p2p_state.rs",
    symbol: "P2PState::should_suppress_outgoing_gossip",
    lineRange: "L2518-L2525",
    receiptField: "gossipSuppressedBehindTip",
    targetSurface: "nockchainSyncGossipTrace"
  });
  assertAnchor(body, "nockapp-poke-peek", {
    domainId: "nockapp-runtime",
    crateName: "nockapp",
    sourcePath: "crates/nockapp/src/nockapp/mod.rs",
    symbol: "NockApp::poke / NockApp::peek",
    lineRange: "L278-L355",
    receiptField: "pokeOrPeek",
    forbiddenField: "rawEventLog",
    targetSurface: "nockchainNockAppSourceTrace"
  });
  assertAnchor(body, "pma-open-growth", {
    domainId: "pma-durability",
    crateName: "nockvm",
    sourcePath: "crates/nockvm/rust/nockvm/src/pma.rs",
    symbol: "Pma::open",
    lineRange: "L617-L640",
    receiptField: "pmaMetadata",
    forbiddenField: "rawPmaSlab",
    targetSurface: "stateJamRegistry"
  });
  const stackSafety = assertAnchor(body, "nockstack-frame-safety", {
    domainId: "runtime-stack-safety",
    crateName: "nockvm",
    sourcePath: "crates/nockvm/rust/nockvm/src/mem.rs",
    symbol: "NockStack::is_in_frame",
    lineRange: "L1338-L1356",
    receiptField: "runtimeStackFrameCheck",
    targetSurface: "nockchainPrRadar"
  });
  assertIncludes(stackSafety.watchRefs, "issue #121", "stack safety issue watch");
  assertAnchor(body, "wallet-cli-commands", {
    domainId: "wallet-cli",
    crateName: "nockchain-wallet",
    sourcePath: "crates/nockchain-wallet/src/command.rs",
    symbol: "Commands",
    lineRange: "L306-L650",
    receiptField: "walletCommand",
    forbiddenField: "walletSeedPhrase",
    targetSurface: "nockchainWalletAtlas"
  });
  assertAnchor(body, "wallet-create-tx-with-planner", {
    domainId: "wallet-cli",
    crateName: "nockchain-wallet",
    sourcePath: "crates/nockchain-wallet/src/create_tx.rs",
    symbol: "Wallet::create_tx_with_planner",
    lineRange: "L1064-L1125",
    receiptField: "walletTransactionPlan",
    targetSurface: "nockchainWalletAtlas"
  });
  assertAnchor(body, "wallet-tx-planner", {
    domainId: "wallet-transaction-builder",
    crateName: "wallet-tx-builder",
    sourcePath: "crates/wallet-tx-builder/src/planner.rs",
    symbol: "plan_create_tx / plan_withdrawal_tx",
    lineRange: "L1018-L1056",
    receiptField: "withdrawalPlan",
    targetSurface: "nockchainBridgeSourceTrace"
  });
  assertAnchor(body, "nockchain-public-api-main", {
    domainId: "public-api-grpc",
    crateName: "nockchain-api",
    sourcePath: "crates/nockchain-api/src/main.rs",
    symbol: "main",
    lineRange: "L25-L50",
    receiptField: "apiEndpointMode",
    targetSurface: "nockchainWalletAtlas"
  });
  assertAnchor(body, "nockapp-grpc-wire-conversion", {
    domainId: "public-api-grpc",
    crateName: "nockapp-grpc",
    sourcePath: "crates/nockapp-grpc/src/wire_conversion.rs",
    symbol: "grpc_wire_to_nockapp",
    lineRange: "L7-L43",
    receiptField: "wireConversion",
    targetSurface: "localFakenetEvidence"
  });
  assertAnchor(body, "bridge-withdrawal-runtime", {
    domainId: "bridge-withdrawal",
    crateName: "bridge",
    sourcePath: "crates/bridge/src/withdrawal/runtime.rs",
    symbol: "bootstrap_runtime",
    lineRange: "L45-L108",
    receiptField: "withdrawalRuntime",
    forbiddenField: "rawTransactionJam",
    targetSurface: "nockchainBridgeSourceTrace"
  });
  assertAnchor(body, "bridge-sequencer-journal", {
    domainId: "bridge-sequencer",
    crateName: "nockchain-bridge-sequencer",
    sourcePath: "crates/nockchain-bridge-sequencer/src/main.rs",
    symbol: "build_sequencer_journal",
    lineRange: "L154-L240",
    receiptField: "sequencerJournalEntry",
    forbiddenField: "sequencerJournalSigningKey",
    targetSurface: "veslEvidenceBridge"
  });
  assertAnchor(body, "bridge-dev-scenario-readme", {
    domainId: "bridge-dev-scenarios",
    crateName: "bridge-dev",
    sourcePath: "crates/bridge-dev/tests/README.md",
    symbol: "bridge-dev Scenario Tests",
    lineRange: "L1-L58",
    receiptField: "bridgeDevScenarioName",
    forbiddenField: "tenderlyAccessKey",
    targetSurface: "nockchainBridgeSourceTrace"
  });
  assertAnchor(body, "bridge-dev-withdrawal-scenarios", {
    domainId: "bridge-dev-scenarios",
    crateName: "bridge-dev",
    sourcePath: "crates/bridge-dev/tests/scenarios.rs",
    symbol: "withdrawal_happy_path_reaches_executed / withdrawal_sequencer_rebuilds_from_r2_after_sqlite_wipe",
    lineRange: "L955-L1084",
    receiptField: "bridgeDevWithdrawalPhase",
    forbiddenField: "r2TestToken",
    targetSurface: "nockchainBridgeSourceTrace"
  });
  assertAnchor(body, "nockup-main", {
    domainId: "nockup-scaffold",
    crateName: "nockup",
    sourcePath: "crates/nockup/src/main.rs",
    symbol: "main",
    lineRange: "L9-L40",
    receiptField: "nockupTemplate",
    targetSurface: "nockupValidation"
  });

  assertIncludes(body.sourceTraceContract.requiredFields, "sourceAnchorId", "contract source anchor field");
  assertIncludes(body.sourceTraceContract.requiredFields, "lineRange", "contract line range field");
  assertIncludes(body.sourceTraceContract.requiredFields, "cargoGate", "contract cargo gate field");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "walletSeedPhrase", "contract forbids wallet seed");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "rawPmaSlab", "contract forbids raw PMA");
  assertIncludes(
    body.sourceTraceContract.forbiddenFields,
    "sequencerJournalSigningKey",
    "contract forbids sequencer signing key"
  );
  assertIncludes(body.sourceTraceContract.forbiddenFields, "tenderlyAccessKey", "contract forbids Tenderly access key");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "r2TestToken", "contract forbids R2 test token");
  assertIncludes(body.learningPath.map((step) => step.domainId), "node-runtime", "learning path starts with node");
  assertIncludes(body.learningPath.map((step) => step.domainId), "wallet-cli", "learning path includes wallet");
  assertIncludes(body.learningPath.map((step) => step.domainId), "pma-durability", "learning path includes PMA");
  assertIncludes(body.learningPath.map((step) => step.domainId), "bridge-dev-scenarios", "learning path includes bridge-dev scenarios");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust atlas link");
  assertEqual(body.links.repository, "https://github.com/nockchain/nockchain", "repository link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-rust-source-guide",
    "/api/nockchain/rust-source",
    "Nockchain Rust source guide"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainRustSourceGuide,
    "https://nocksperimental.com/api/nockchain/rust-source",
    "well-known rust source guide link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "nockchain-rust-source-guide",
    "rust source guide capability"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/rust-source"]?.get?.summary,
    "Nockchain Rust source guide",
    "OpenAPI rust source guide path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThanOrEqual(checkpointBody.counts.nockchainRustSourceAnchors, 15, "checkpoint rust source anchor count");
  assertEqual(checkpointBody.counts.nockchainRustSourceDomains, body.sourceDomains.length, "checkpoint rust source domain count");
  assertStartsWith(checkpointBody.roots.nockchainRustSourceGuide, "sha256:", "checkpoint rust source root");
  assertEqual(
    checkpointBody.checks.nockchainRustSourceGuideAvailable,
    true,
    "checkpoint rust source guide availability"
  );
  assertIncludes(
    checkpointBody.nockchainRustSourceGuide.anchorIds,
    "nockstack-frame-safety",
    "checkpoint rust source anchor IDs"
  );
  assertIncludes(
    checkpointBody.nockchainRustSourceGuide.anchorIds,
    "bridge-dev-withdrawal-scenarios",
    "checkpoint rust source bridge-dev anchor IDs"
  );
  assertEqual(
    checkpointBody.links.nockchainRustSourceGuide,
    "https://nocksperimental.com/api/nockchain/rust-source",
    "checkpoint rust source guide link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-rust-source-guide-api"],
    "node scripts/test-nockchain-rust-source-guide-api.mjs",
    "package rust source guide test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-rust-source-guide-api",
    "full test includes rust source guide test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/rust-source", "Cloudflare smoke includes rust source guide API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Rust Source Guide", "README documents Rust source guide");
  assertIncludes(readme, "/api/nockchain/rust-source", "README documents Rust source guide endpoint");
  assertIncludes(readme, "/nockchain/rust/source", "README documents Rust source guide page");
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

function assertAnchor(body, id, expected) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing Rust source anchor: ${id}`);
  }

  for (const [field, value] of Object.entries(expected)) {
    if (field === "receiptField") {
      assertIncludes(anchor.receiptFields, value, `${id} receipt field`);
      continue;
    }

    if (field === "forbiddenField") {
      assertIncludes(anchor.forbiddenFields, value, `${id} forbidden field`);
      continue;
    }

    if (field === "targetSurface") {
      assertIncludes(anchor.targetSurfaces, value, `${id} target surface`);
      continue;
    }

    assertEqual(anchor[field], value, `${id} ${field}`);
  }

  assertEqual(anchor.sourceCommit, body.upstream.commit.sha, `${id} source commit`);
  assertStartsWith(anchor.sourceUrl, "https://github.com/nockchain/nockchain/blob/", `${id} source URL`);

  return anchor;
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

function assertGreaterThanOrEqual(actual, expectedMinimum, label) {
  if (!(actual >= expectedMinimum)) {
    throw new Error(`${label}: expected at least ${expectedMinimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
