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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/impact/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "impact status");
  assertEqual(body.version, "v0", "impact version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/impact",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThan(body.snapshot.totalItems, 7, "impact item count");
  assertGreaterThan(body.snapshot.immediateCount, 1, "immediate item count");
  assertGreaterThan(body.snapshot.highCount, 3, "high item count");
  assertIncludes(body.snapshot.sourceTypes, "open-pr", "snapshot includes PR source");
  assertIncludes(body.snapshot.sourceTypes, "released-commit", "snapshot includes release source");
  assertIncludes(body.snapshot.sourceTypes, "zorp-lineage", "snapshot includes Zorp source");
  assertIncludes(body.snapshot.sourceTypes, "state-artifact-provenance", "snapshot includes state source");

  assertImpactItem(body, "bridge-withdrawal-release", "released-commit", "immediate", "bridgeReceipts");
  assertImpactItem(body, "nockup-template-manifests", "open-pr", "high", "nockupValidation");
  assertImpactItem(body, "wallet-blob-memo", "open-pr", "high", "nockchainWalletAtlas");
  assertImpactItem(body, "nockapp-export-state", "open-pr", "high", "nockchainNockAppSourceTrace");
  assertImpactItem(body, "pma-state-jam-provenance", "state-artifact-provenance", "immediate", "stateJamRegistry");
  assertImpactItem(body, "fakenet-sync-gossip", "open-pr", "high", "nockchainSyncGossipTrace");
  assertImpactItem(body, "zorp-jock-authoring", "zorp-lineage", "medium", "fixtureDocs");
  assertImpactItem(body, "nockchain-benchmarking", "open-pr", "high", "computeBenchmarkProfiles");

  const bridge = findImpactItem(body, "bridge-withdrawal-release");
  assertIncludes(bridge.sourceIds, "commit:33ba97b1e206", "bridge source id");
  assertIncludes(bridge.receiptFields, "bridgeWithdrawalExecutionCommit", "bridge receipt field");
  assertIncludes(bridge.verificationGates, "test:nockchain-bridge-source-api", "bridge gate");
  assertIncludes(bridge.nocksperimentalAction, "withdrawal execution", "bridge action");

  const nockup = findImpactItem(body, "nockup-template-manifests");
  assertIncludes(nockup.sourceIds, "pr:125", "nockup source id");
  assertIncludes(nockup.receiptFields, "templateManifestSource", "nockup receipt field");
  assertIncludes(nockup.verificationGates, "test:nockup-validation", "nockup gate");

  const wallet = findImpactItem(body, "wallet-blob-memo");
  assertIncludes(wallet.sourceIds, "pr:116", "wallet source id");
  assertIncludes(wallet.receiptFields, "transactionBlobHash", "wallet blob field");
  assertIncludes(wallet.receiptFields, "memoPresence", "wallet memo field");
  assertIncludes(wallet.forbiddenFields, "walletSeedPhrase", "wallet forbidden seed");

  const nockapp = findImpactItem(body, "nockapp-export-state");
  assertIncludes(nockapp.sourceIds, "pr:119", "NockApp source id");
  assertIncludes(nockapp.receiptFields, "exportStateCommit", "NockApp export field");
  assertIncludes(nockapp.forbiddenFields, "rawExportJam", "NockApp forbidden raw export");

  const pma = findImpactItem(body, "pma-state-jam-provenance");
  assertIncludes(pma.sourceIds, "drive:1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw", "PMA Drive source");
  assertIncludes(pma.receiptFields, "stateJamFingerprint", "PMA receipt field");
  assertIncludes(pma.forbiddenFields, "rawPmaSlab", "PMA forbidden slab");
  assertIncludes(pma.forbiddenFields, "rawStateJam", "PMA forbidden state jam");

  const benchmark = findImpactItem(body, "nockchain-benchmarking");
  assertIncludes(benchmark.sourceIds, "pr:126", "benchmark source PR");
  assertIncludes(benchmark.sourceIds, "pr:124", "AI PoW source PR");
  assertIncludes(benchmark.sourceIds, "repo:zorp-corp/knock", "benchmark formal semantics source");
  assertIncludes(benchmark.sourceIds, "repo:zorp-corp/sppark", "benchmark proof primitives source");
  assertIncludes(
    benchmark.sourceUrls,
    "https://github.com/zorp-corp/knock/blob/master/README.md",
    "benchmark Knock source URL"
  );
  assertIncludes(
    benchmark.sourceUrls,
    "https://github.com/zorp-corp/sppark/blob/main/README.md",
    "benchmark sppark source URL"
  );
  assertIncludes(benchmark.targetSurfaces, "nockchainKnowledgeSpine", "benchmark semantics target");
  assertIncludes(benchmark.targetSurfaces, "trustComputeBenchmarks", "benchmark proof target");
  assertIncludes(benchmark.receiptFields, "formalSemanticsSource", "benchmark semantics field");
  assertIncludes(benchmark.receiptFields, "proofPrimitiveSource", "benchmark proof field");
  assertIncludes(benchmark.verificationGates, "test:zorp-upstream-api", "benchmark Zorp gate");

  assertIncludes(body.queueContract.requiredFields, "sourceIds", "contract requires source ids");
  assertIncludes(body.queueContract.requiredFields, "sourceType", "contract requires source type");
  assertIncludes(body.queueContract.requiredFields, "evidenceClass", "contract requires evidence class");
  assertIncludes(body.queueContract.requiredFields, "targetSurfaces", "contract requires targets");
  assertIncludes(body.queueContract.requiredFields, "receiptFields", "contract requires receipt fields");
  assertIncludes(body.queueContract.requiredFields, "verificationGates", "contract requires gates");
  assertIncludes(body.queueContract.requiredFields, "nocksperimentalAction", "contract requires action");
  assertIncludes(body.queueContract.forbiddenFields, "rawStateJam", "contract forbids raw state jam");
  assertIncludes(body.queueContract.forbiddenFields, "rawPmaSlab", "contract forbids raw PMA slab");
  assertIncludes(body.queueContract.forbiddenFields, "walletSeedPhrase", "contract forbids wallet seed");
  assertIncludes(body.queueContract.forbiddenFields, "privateSpendKey", "contract forbids spend key");
  assertIncludes(body.queueContract.forbiddenFields, "rawExportJam", "contract forbids raw export jam");
  assertIncludes(
    body.queueContract.reviewRules,
    "Open PRs are early-warning signals, not merged protocol behavior.",
    "contract PR rule"
  );

  assertActionLane(body, "runtime-protocol", "immediate", "bridge-withdrawal-release");
  assertActionLane(body, "state-provenance", "immediate", "pma-state-jam-provenance");
  assertActionLane(body, "fixture-authoring", "high", "nockup-template-manifests");
  assertActionLane(body, "wallet-api", "high", "wallet-blob-memo");
  assertActionLane(body, "ecosystem-lineage", "medium", "zorp-jock-authoring");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/impact", "page link");
  assertEqual(body.links.watch, "https://nocksperimental.com/api/nockchain/watch", "watch link");
  assertEqual(body.links.prRadar, "https://nocksperimental.com/api/nockchain/pr-radar", "PR radar link");
  assertEqual(body.links.stateJams, "https://nocksperimental.com/api/nockchain/state-jams", "state jams link");
  assertEqual(body.links.zorp, "https://nocksperimental.com/api/nockchain/zorp", "Zorp link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-impact-queue",
    "/api/nockchain/impact",
    "Nockchain upstream impact queue"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainImpactQueue,
    "https://nocksperimental.com/api/nockchain/impact",
    "well-known impact link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-impact-queue", "impact capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/impact"]?.get?.summary,
    "Nockchain upstream impact queue",
    "OpenAPI impact path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainImpactItems, body.impactItems.length, "checkpoint impact count");
  assertEqual(checkpointBody.counts.nockchainImpactActionLanes, body.actionLanes.length, "checkpoint lane count");
  assertStartsWith(checkpointBody.roots.nockchainImpactQueue, "sha256:", "checkpoint impact root");
  assertEqual(checkpointBody.checks.nockchainImpactQueueAvailable, true, "checkpoint impact check");
  assertIncludes(
    checkpointBody.nockchainImpactQueue.immediateItems,
    "bridge-withdrawal-release",
    "checkpoint bridge immediate item"
  );
  assertIncludes(
    checkpointBody.nockchainImpactQueue.immediateItems,
    "pma-state-jam-provenance",
    "checkpoint state immediate item"
  );
  assertIncludes(
    checkpointBody.nockchainImpactQueue.highPriorityItems,
    "wallet-blob-memo",
    "checkpoint wallet high item"
  );
  assertIncludes(
    checkpointBody.links.nockchainImpactQueue,
    "https://nocksperimental.com/api/nockchain/impact",
    "checkpoint impact link"
  );
}

function assertImpactItem(body, id, sourceType, priority, targetSurface) {
  const item = findImpactItem(body, id);

  assertEqual(item.sourceType, sourceType, `${id} source type`);
  assertEqual(item.priority, priority, `${id} priority`);
  assertIncludes(item.targetSurfaces, targetSurface, `${id} target surface`);
  assertGreaterThan(item.receiptFields.length, 0, `${id} receipt fields`);
  assertGreaterThan(item.verificationGates.length, 0, `${id} verification gates`);
}

function findImpactItem(body, id) {
  const item = body.impactItems.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Missing impact item: ${id}`);
  }

  return item;
}

function assertActionLane(body, id, escalation, itemId) {
  const lane = body.actionLanes.find((candidate) => candidate.id === id);

  if (!lane) {
    throw new Error(`Missing action lane: ${id}`);
  }

  assertEqual(lane.escalation, escalation, `${id} escalation`);
  assertIncludes(lane.impactItemIds, itemId, `${id} item`);
}

function loadTypeScriptModule(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const cached = moduleCache.get(absolutePath);

  if (cached) {
    return cached.exports;
  }

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
  }

  const source = readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"]
      }
    },
    fileName: absolutePath
  }).outputText;
  const loadedModule = { exports: {} };
  moduleCache.set(absolutePath, loadedModule);
  const localRequire = createLocalRequire(absolutePath);
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  fn(loadedModule.exports, localRequire, loadedModule, absolutePath, path.dirname(absolutePath));

  return loadedModule.exports;
}

function createLocalRequire(parentPath) {
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

    if (specifier.startsWith(".")) {
      return loadTypeScriptModule(path.relative(process.cwd(), path.resolve(path.dirname(parentPath), specifier)));
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(aliasPath) && aliasPath.endsWith(".json")) {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && aliasPath.endsWith(".ts")) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  throw new Error(`Unsupported alias import in test: ${specifier}`);
}

function assertEndpoint(body, id, pathValue, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathValue, `${id} path`);
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

function assertStartsWith(value, prefix, label) {
  if (!value?.startsWith?.(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to start with ${JSON.stringify(prefix)}`);
  }
}

function assertGreaterThan(actual, floor, label) {
  if (!(actual > floor)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${floor}`);
  }
}
