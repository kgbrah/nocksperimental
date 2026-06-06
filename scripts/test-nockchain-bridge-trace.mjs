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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/bridge/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "bridge trace status");
  assertEqual(body.version, "v0", "bridge trace version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/bridge", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "latest bridge commit");
  assertEqual(body.upstream.release.tag, "build-5d022ced55040221e8b6fcfd78114189fbae91a0", "latest release tag");
  assertEqual(body.releaseDrift.defaultBranchAheadOfRelease, true, "default branch ahead of release");
  assertEqual(body.releaseDrift.latestCommitReleased, false, "latest commit not yet released");
  assertEqual(body.releaseDrift.releaseCommitShortSha, "5d022ced5504", "release commit short sha");

  assertSource(body, "bridge-withdrawals-spec", "crates/bridge/docs/bridge-withdrawals.md");
  assertSource(body, "bridge-architecture", "crates/bridge/docs/architecture.md");
  assertSource(body, "bridge-runtime", "crates/bridge/src/withdrawal/runtime.rs");
  assertSource(body, "withdrawal-submission", "crates/bridge/src/withdrawal/submission.rs");
  assertSource(body, "bridge-sequencer-crate", "crates/nockchain-bridge-sequencer/src/main.rs");
  assertSource(body, "wallet-tx-builder-fixture", "crates/wallet-tx-builder/tests/fixtures/withdrawal_tx_fixtures.jam");
  assertSource(body, "hoon-bridge-kernel", "hoon/apps/bridge/bridge.hoon");

  assertFlowStep(body, "base-burn");
  assertFlowStep(body, "kernel-pending");
  assertFlowStep(body, "proposal-built");
  assertFlowStep(body, "sequencer-authorized");
  assertFlowStep(body, "confirmed-settlement");

  assertIncludes(
    body.safetyInvariants,
    "A local submitted event is advisory; confirmed inclusion is chain-observable.",
    "submitted advisory invariant"
  );
  assertIncludes(
    body.safetyInvariants,
    "Withdrawal execution fails closed if blockchain constants cannot be fetched or do not match kernel state.",
    "blockchain constants invariant"
  );
  assertIncludes(body.receiptFields, "bridgeWithdrawalId", "withdrawal id receipt field");
  assertIncludes(body.receiptFields, "withdrawalProposalHash", "proposal hash receipt field");
  assertIncludes(body.receiptFields, "sequencerAuthorizationState", "sequencer state receipt field");
  assertIncludes(body.receiptFields, "blockchainConstantsSource", "constants source receipt field");
  assertIncludes(body.receiptFields, "withdrawalJournalMirror", "journal mirror receipt field");
  assertIncludes(
    body.operatorChecklist,
    "Do not treat peer-canonical as submit-ready; sequencer authorization requires full witness signatures.",
    "sequencer checklist"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertEqual(watchBody.status, "review-needed", "watch status reflects release lag");
  assertEqual(watchBody.observed.nockchain.commit.shortSha, "33ba97b1e206", "watch observed commit");
  assertEqual(watchBody.drift.latestCommitReleased, false, "watch release lag");
  assertIncludes(
    watchBody.drift.requiredReviewSignals,
    "bridge withdrawal execution landed on default branch ahead of the latest public build release",
    "watch release lag signal"
  );
  assertWatchItem(watchBody, "bridge-withdrawal-execution", "bridge-withdrawals", "high");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-bridge-trace",
    "/api/nockchain/bridge",
    "Nockchain bridge withdrawal trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainBridgeTrace,
    "https://nocksperimental.com/api/nockchain/bridge",
    "well-known bridge link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-bridge-withdrawal-trace", "bridge capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/bridge"]?.get?.summary,
    "Nockchain bridge withdrawal trace",
    "OpenAPI bridge path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainBridgeSources, body.sourceAnchors.length, "checkpoint source count");
  assertStartsWith(checkpointBody.roots.nockchainBridgeTrace, "sha256:", "checkpoint bridge root");
  assertEqual(checkpointBody.checks.nockchainBridgeTraceAvailable, true, "checkpoint bridge guard");
  assertEqual(checkpointBody.checks.nockchainWatchInSync, false, "checkpoint watch lag guard");
  assertEqual(
    checkpointBody.links.nockchainBridgeTrace,
    "https://nocksperimental.com/api/nockchain/bridge",
    "checkpoint bridge link"
  );

  const page = readText("src/app/nockchain/bridge/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainBridgeTrace", "bridge page uses trace");
  assertIncludes(page, "Nockchain Bridge", "bridge page title");
  assertIncludes(page, "bridge-withdrawals-spec", "page renders bridge spec source");
  assertIncludes(page, "sequencer-authorized", "page renders sequencer step");
  assertIncludes(page, 'href="/api/nockchain/bridge"', "page links API");
  assertIncludes(page, 'href="/nockchain"', "page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/bridge"', "Nockchain page links bridge page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-bridge-trace"],
    "node scripts/test-nockchain-bridge-trace.mjs",
    "package bridge test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-bridge-trace", "full test includes bridge");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/bridge", "Cloudflare smoke includes bridge API");
  assertIncludes(smokeSource, "/nockchain/bridge", "Cloudflare smoke includes bridge page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Bridge Withdrawal Trace", "README documents bridge trace");
  assertIncludes(readme, "/api/nockchain/bridge", "README documents bridge endpoint");
  assertIncludes(readme, "/nockchain/bridge", "README documents bridge page");
}

function assertSource(body, id, pathName) {
  const source = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!source) {
    throw new Error(`Missing source anchor: ${id}`);
  }

  assertEqual(source.path, pathName, `${id} path`);
}

function assertFlowStep(body, id) {
  const step = body.withdrawalFlow.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`Missing withdrawal flow step: ${id}`);
  }
}

function assertWatchItem(body, id, domain, severity) {
  const item = body.watchQueue.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Missing watch item: ${id}`);
  }

  assertEqual(item.domain, domain, `${id} domain`);
  assertEqual(item.severity, severity, `${id} severity`);
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

function assertStartsWith(value, expected, label) {
  if (typeof value !== "string" || !value.startsWith(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to start with ${JSON.stringify(expected)}`);
  }
}
