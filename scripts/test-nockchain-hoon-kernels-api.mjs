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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/hoon-kernels/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "Hoon kernel atlas status");
  assertEqual(body.version, "v0", "Hoon kernel atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/hoon-kernels",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertEqual(body.buildPipeline.compiler, "hoonc", "Hoon compiler");
  assertIncludes(body.buildPipeline.makeTargets, "build-hoon", "build pipeline has build-hoon");
  assertIncludes(body.buildPipeline.makeTargets, "build-assets", "build pipeline has build-assets");
  assertEqual(body.buildPipeline.assetTargets.length, 5, "compiled jam target count");
  assertIncludes(body.buildPipeline.assetTargets, "assets/dumb.jam", "dumb jam target");
  assertIncludes(body.buildPipeline.assetTargets, "assets/miner.jam", "miner jam target");
  assertIncludes(body.buildPipeline.assetTargets, "assets/wal.jam", "wallet jam target");
  assertIncludes(body.buildPipeline.assetTargets, "assets/peek.jam", "peek jam target");
  assertIncludes(body.buildPipeline.assetTargets, "assets/bridge.jam", "bridge jam target");

  assertEqual(body.kernels.length, 5, "kernel count");
  assertKernel(body, "dumbnet-consensus", "assets/dumb.jam", "hoon/apps/dumbnet/outer.hoon", "crates/kernels/dumb", "nockchain");
  assertKernel(body, "dumbnet-miner", "assets/miner.jam", "hoon/apps/dumbnet/miner.hoon", "crates/kernels/miner", "nockchain");
  assertKernel(body, "wallet", "assets/wal.jam", "hoon/apps/wallet/wallet.hoon", "crates/kernels/wallet", "nockchain-wallet");
  assertKernel(body, "nockchain-peek", "assets/peek.jam", "hoon/apps/peek/peek.hoon", "crates/kernels/nockchain-peek", "nockchain-peek");
  assertKernel(body, "bridge", "assets/bridge.jam", "hoon/apps/bridge/bridge.hoon", "crates/kernels/bridge", "bridge");

  const consensus = findKernel(body, "dumbnet-consensus");
  assertEqual(consensus.stateVersion, "%9", "consensus state version");
  assertIncludes(consensus.imports, "/apps/dumbnet/lib/consensus", "consensus imports consensus lib");
  assertIncludes(consensus.imports, "/apps/dumbnet/lib/miner", "consensus imports miner lib");
  assertIncludes(consensus.imports, "/common/tx-engine", "consensus imports tx engine");
  assertIncludes(consensus.interfaceArms, "load", "consensus load arm");
  assertIncludes(consensus.interfaceArms, "poke", "consensus poke arm");
  assertIncludes(consensus.stateUpgradeSignals, "state-8-to-9", "consensus state 8 to 9");
  assertIncludes(consensus.receiptFields, "blockchainConstantsSource", "consensus constants field");

  const miner = findKernel(body, "dumbnet-miner");
  assertEqual(miner.stateVersion, "%1", "miner state version");
  assertIncludes(miner.causeTags, "%0", "miner cause %0");
  assertIncludes(miner.causeTags, "%1", "miner cause %1");
  assertIncludes(miner.effectTags, "%mine-result", "miner mine-result effect");
  assertIncludes(miner.receiptFields, "powDigest", "miner pow digest field");

  const wallet = findKernel(body, "wallet");
  assertEqual(wallet.stateVersion, "%8", "wallet state version");
  assertIncludes(wallet.imports, "/apps/wallet/lib/tx-builder", "wallet imports tx builder");
  assertIncludes(wallet.imports, "/apps/wallet/lib/s10", "wallet imports slip10");
  assertIncludes(wallet.stateUpgradeSignals, "state-7-8", "wallet state 7 to 8");
  assertIncludes(wallet.receiptFields, "walletEndpointMode", "wallet endpoint mode field");
  assertIncludes(wallet.forbiddenFields, "walletSeedPhrase", "wallet forbids seed");

  const peek = findKernel(body, "nockchain-peek");
  assertIncludes(peek.causeTags, "%grpc-bind", "peek grpc bind cause");
  assertIncludes(peek.effectTags, "%markdown", "peek markdown effect");
  assertIncludes(peek.effectTags, "%file", "peek file effect");
  assertIncludes(peek.receiptFields, "peekCommand", "peek command field");

  const bridge = findKernel(body, "bridge");
  assertIncludes(bridge.imports, "/apps/bridge/base", "bridge imports base");
  assertIncludes(bridge.imports, "/apps/bridge/nock", "bridge imports nock");
  assertIncludes(bridge.causeTags, "%base-block-withdrawals-committed", "bridge withdrawal committed cause");
  assertIncludes(bridge.causeTags, "%create-withdrawal-tx", "bridge create withdrawal cause");
  assertIncludes(bridge.causeTags, "%proposed-nock-tx", "bridge proposed nock tx cause");
  assertIncludes(bridge.receiptFields, "kernelReconciliationStatus", "bridge reconciliation receipt field");

  assertIncludes(
    body.rustEmbedding.kernelCrates,
    "crates/kernels/nockchain-peek",
    "embedding includes peek kernel crate"
  );
  assertIncludes(body.rustEmbedding.consumers, "crates/nockchain/src/main.rs", "embedding includes node main");
  assertIncludes(body.rustEmbedding.consumers, "crates/nockchain-wallet/src/main.rs", "embedding includes wallet main");
  assertIncludes(body.rustEmbedding.consumers, "crates/bridge/src/main.rs", "embedding includes bridge main");
  assertIncludes(body.rustEmbedding.consumers, "crates/nockchain-peek/src/main.rs", "embedding includes peek main");

  assertIncludes(body.evidenceContract.requiredFields, "kernelId", "contract requires kernel id");
  assertIncludes(body.evidenceContract.requiredFields, "jamAsset", "contract requires jam asset");
  assertIncludes(body.evidenceContract.requiredFields, "hoonSource", "contract requires Hoon source");
  assertIncludes(body.evidenceContract.requiredFields, "nockchainCommit", "contract requires commit");
  assertIncludes(body.evidenceContract.forbiddenFields, "rawJamBytes", "contract forbids raw jam bytes");
  assertIncludes(body.evidenceContract.forbiddenFields, "rawKernelState", "contract forbids raw kernel state");
  assertIncludes(body.evidenceContract.forbiddenFields, "walletSeedPhrase", "contract forbids wallet seed");
  assertIncludes(body.verificationMatrix.availableTooling, "cargo 1.96.0", "local cargo availability");
  assertIncludes(body.verificationMatrix.availableTooling, "hoonc", "local hoonc availability");
  assertIncludes(
    body.verificationMatrix.localCautions,
    "$HOME/.cargo/bin must be present on PATH for cargo and hoonc checks",
    "local PATH caution"
  );

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/hoon-kernels", "page link");
  assertEqual(body.links.nockAppSource, "https://nocksperimental.com/api/nockchain/nockapp-source", "NockApp source link");
  assertEqual(body.links.cargoSurface, "https://nocksperimental.com/api/nockchain/cargo-surface", "Cargo surface link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-hoon-kernels",
    "/api/nockchain/hoon-kernels",
    "Nockchain Hoon kernel and jam atlas"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainHoonKernels,
    "https://nocksperimental.com/api/nockchain/hoon-kernels",
    "well-known Hoon kernel link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-hoon-kernel-atlas", "Hoon kernel capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/hoon-kernels"]?.get?.summary,
    "Nockchain Hoon kernel and jam atlas",
    "OpenAPI Hoon kernel path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainHoonKernels, 5, "checkpoint Hoon kernel count");
  assertEqual(checkpointBody.counts.nockchainHoonJamAssets, 5, "checkpoint Hoon jam asset count");
  assertStartsWith(checkpointBody.roots.nockchainHoonKernels, "sha256:", "checkpoint Hoon root");
  assertEqual(checkpointBody.checks.nockchainHoonKernelsAvailable, true, "checkpoint Hoon check");
  assertIncludes(checkpointBody.nockchainHoonKernels.jamAssets, "assets/bridge.jam", "checkpoint bridge jam");
  assertIncludes(checkpointBody.nockchainHoonKernels.forbiddenFields, "rawJamBytes", "checkpoint raw jam forbidden");
  assertEqual(
    checkpointBody.links.nockchainHoonKernels,
    "https://nocksperimental.com/api/nockchain/hoon-kernels",
    "checkpoint Hoon link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-hoon-kernels-api"],
    "node scripts/test-nockchain-hoon-kernels-api.mjs",
    "package Hoon kernel API test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-hoon-kernels-api", "full test includes Hoon API");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/hoon-kernels", "Cloudflare smoke includes Hoon API");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Hoon Kernel Atlas", "README documents Hoon kernel atlas");
  assertIncludes(readme, "/api/nockchain/hoon-kernels", "README documents Hoon API");
}

function assertKernel(body, id, jamAsset, entrySource, kernelCrate, consumerCrate) {
  const kernel = findKernel(body, id);

  assertEqual(kernel.jamAsset, jamAsset, `${id} jam asset`);
  assertEqual(kernel.entrySource, entrySource, `${id} entry source`);
  assertEqual(kernel.kernelCrate, kernelCrate, `${id} kernel crate`);
  assertEqual(kernel.consumerCrate, consumerCrate, `${id} consumer crate`);
  assertStartsWith(kernel.upstreamUrl, "https://github.com/nockchain/nockchain/blob/", `${id} upstream URL`);
}

function findKernel(body, id) {
  const kernel = body.kernels.find((candidate) => candidate.id === id);

  if (!kernel) {
    throw new Error(`Missing kernel: ${id}`);
  }

  return kernel;
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing module: ${relativePath}`);
  }

  const source = readText(relativePath);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: modulePath
  }).outputText;

  const loadedModule = { exports: {} };
  moduleCache.set(modulePath, loadedModule);

  const localRequire = createRequire(modulePath);
  const requireWithAliases = (specifier) => {
    if (specifier.startsWith("@/data/") && specifier.endsWith(".json")) {
      return { __esModule: true, default: JSON.parse(readText(`src/${specifier.slice(2)}`)) };
    }

    if (specifier.startsWith("@/")) {
      return loadTypeScriptModule(`src/${specifier.slice(2)}.ts`);
    }

    return localRequire(specifier);
  };

  const wrapped = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  wrapped(loadedModule.exports, requireWithAliases, loadedModule, modulePath, path.dirname(modulePath));

  return loadedModule.exports;
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertEndpoint(registryBody, id, pathName, description) {
  const endpoint = registryBody.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}

function assertStartsWith(actual, prefix, label) {
  if (!actual?.startsWith?.(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(prefix)}`);
  }
}
