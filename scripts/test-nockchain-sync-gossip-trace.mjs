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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/sync-gossip/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "sync gossip status");
  assertEqual(body.version, "v0", "sync gossip version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/sync-gossip", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "5d022ced5504", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-5d022ced55040221e8b6fcfd78114189fbae91a0",
    "upstream release"
  );
  assertIncludes(body.upstream.commit.message, "suppress all outgoing gossip", "commit message");

  assertSourceAnchor(body, "catch-up-signal", "crates/nockchain-libp2p-io/src/catch_up.rs", "CatchUpSignal::is_catching_up");
  assertSourceAnchor(body, "p2p-state-gate", "crates/nockchain-libp2p-io/src/p2p_state.rs", "P2PState::should_suppress_outgoing_gossip");
  assertSourceAnchor(body, "driver-gossip-effect", "crates/nockchain-libp2p-io/src/driver.rs", "EffectType::Gossip");
  assertSourceAnchor(body, "suppression-metric", "crates/nockchain-libp2p-io/src/metrics.rs", "gossip_suppressed_behind_tip_total");
  assertSourceAnchor(body, "driver-suppression-test", "crates/nockchain-libp2p-io/src/driver/tests.rs", "test_gossip_effect_suppresses_all_outbound_gossip_while_catching_up");

  assertInvariant(body, "cold-does-not-suppress", "Cold");
  assertInvariant(body, "catching-up-suppresses-all-gossip", "CatchingUp");
  assertInvariant(body, "tip-does-not-suppress", "Tip");
  assertInvariant(body, "hysteresis-refresh-exits-catching-up", "refresh_mode");

  assertScenario(body, "wrong-block-commitment-while-catching-up", "wrong block commitment");
  assertScenario(body, "empty-routing-table-with-quiet-node", "routing table");
  assertScenario(body, "miner-output-not-gossiped", "mining output");
  assertScenario(body, "stale-tx-gossip-suppressed", "tx submission");

  assertIncludes(body.receiptFields, "syncMode", "sync mode field");
  assertIncludes(body.receiptFields, "behindTipEstimate", "behind-tip field");
  assertIncludes(body.receiptFields, "gossipSuppressedBehindTipTotal", "suppression metric field");
  assertIncludes(body.receiptFields, "routeTableSize", "route table field");
  assertIncludes(body.receiptFields, "connectedPeerCount", "peer count field");
  assertIncludes(body.localVerification.attemptedCommands, "cargo test -p nockchain-libp2p-io suppress_outgoing_gossip --lib", "cargo attempt");
  assertEqual(body.localVerification.status, "source-inspected-cargo-timeout", "cargo attempt status");
  assertIncludes(body.operatorChecklist, "Do not treat quiet mining output as failure until syncMode is Tip.", "quiet miner checklist");
  assertIncludes(body.operatorChecklist, "Record gossip_suppressed_behind_tip_total with fakenet diagnostics when available.", "metric checklist");
  assertEqual(body.links.watch, "https://nocksperimental.com/api/nockchain/watch", "watch link");
  assertEqual(body.links.operations, "https://nocksperimental.com/api/nockchain/operations", "operations link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-sync-gossip-trace",
    "/api/nockchain/sync-gossip",
    "Nockchain sync/gossip source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainSyncGossipTrace,
    "https://nocksperimental.com/api/nockchain/sync-gossip",
    "well-known sync gossip link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-sync-gossip-trace", "sync gossip capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/sync-gossip"]?.get?.summary,
    "Nockchain sync/gossip source trace",
    "OpenAPI sync gossip path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainSyncGossipAnchors, body.sourceAnchors.length, "checkpoint anchor count");
  assertStartsWith(checkpointBody.roots.nockchainSyncGossipTrace, "sha256:", "checkpoint sync gossip root");
  assertEqual(checkpointBody.checks.nockchainSyncGossipTraceAvailable, true, "checkpoint sync gossip guard");
  assertEqual(
    checkpointBody.links.nockchainSyncGossipTrace,
    "https://nocksperimental.com/api/nockchain/sync-gossip",
    "checkpoint sync gossip link"
  );

  const page = readText("src/app/nockchain/sync-gossip/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainSyncGossipTrace", "sync gossip page uses trace");
  assertIncludes(page, "Nockchain Sync/Gossip", "sync gossip page title");
  assertIncludes(page, "catch-up-signal", "page renders catch-up anchor");
  assertIncludes(page, "driver-gossip-effect", "page renders driver anchor");
  assertIncludes(page, "wrong-block-commitment-while-catching-up", "page renders wrong commitment scenario");
  assertIncludes(page, 'href="/api/nockchain/sync-gossip"', "page links API");
  assertIncludes(page, 'href="/nockchain"', "page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/sync-gossip"', "Nockchain page links sync gossip page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-sync-gossip-trace"],
    "node scripts/test-nockchain-sync-gossip-trace.mjs",
    "package sync gossip test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-sync-gossip-trace", "full test includes sync gossip");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/sync-gossip", "Cloudflare smoke includes sync gossip API");
  assertIncludes(smokeSource, "/nockchain/sync-gossip", "Cloudflare smoke includes sync gossip page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Sync/Gossip Source Trace", "README documents sync gossip trace");
  assertIncludes(readme, "/api/nockchain/sync-gossip", "README documents sync gossip endpoint");
  assertIncludes(readme, "/nockchain/sync-gossip", "README documents sync gossip page");
}

function assertSourceAnchor(body, id, file, symbol) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing source anchor: ${id}`);
  }

  assertEqual(anchor.file, file, `${id} file`);
  assertEqual(anchor.symbol, symbol, `${id} symbol`);
}

function assertInvariant(body, id, expectedText) {
  const invariant = body.behaviorInvariants.find((candidate) => candidate.id === id);

  if (!invariant) {
    throw new Error(`Missing behavior invariant: ${id}`);
  }

  assertIncludes(invariant.rule, expectedText, `${id} rule`);
}

function assertScenario(body, id, expectedText) {
  const scenario = body.triageScenarios.find((candidate) => candidate.id === id);

  if (!scenario) {
    throw new Error(`Missing triage scenario: ${id}`);
  }

  assertIncludes(scenario.symptom, expectedText, `${id} symptom`);
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expected, label) {
  if (!value?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(value, prefix, label) {
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to start with ${JSON.stringify(prefix)}`);
  }
}
