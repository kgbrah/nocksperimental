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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/nockapp-source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "NockApp source trace status");
  assertEqual(body.version, "v0", "NockApp source trace version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/nockapp-source",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertAnchor(body, "nockapp-runtime", "crates/nockapp/src/nockapp/mod.rs", "NockApp");
  assertAnchor(body, "driver-io-action", "crates/nockapp/src/nockapp/driver.rs", "IOAction");
  assertAnchor(body, "action-dispatch", "crates/nockapp/src/nockapp/mod.rs", "handle_action");
  assertAnchor(body, "poke-effect-broadcast", "crates/nockapp/src/nockapp/mod.rs", "handle_poke");
  assertAnchor(body, "peek-result-boundary", "crates/nockapp/src/nockapp/mod.rs", "handle_peek");
  assertAnchor(body, "wire-repr", "crates/nockapp/src/nockapp/wire.rs", "WireRepr");
  assertAnchor(body, "exported-state-format", "crates/nockapp/src/nockapp/export.rs", "ExportedState");
  assertAnchor(body, "checkpoint-bootstrap", "crates/nockapp/src/nockapp/save.rs", "CheckpointBootstrapReader");
  assertAnchor(body, "event-log-sqlite", "crates/nockapp/src/event_log.rs", "EventLog");
  assertAnchor(
    body,
    "private-grpc-boundary",
    "crates/nockapp-grpc/src/services/private_nockapp/driver.rs",
    "grpc_server_driver"
  );
  assertAnchor(
    body,
    "public-grpc-boundary",
    "crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs",
    "PublicNockchainEffect"
  );
  assertAnchor(
    body,
    "pma-regression-suite",
    "crates/nockapp/tests/pma_regressions",
    "pma_regressions"
  );

  const pokeBroadcast = findAnchor(body, "poke-effect-broadcast");
  assertIncludes(pokeBroadcast.receiptFields, "effectTag", "poke broadcast maps effect tag");
  assertIncludes(pokeBroadcast.receiptFields, "pokeAck", "poke broadcast maps ack");
  assertIncludes(pokeBroadcast.evidenceUse, "broadcasts effects", "poke broadcast evidence use");

  const privateGrpc = findAnchor(body, "private-grpc-boundary");
  assertEqual(privateGrpc.exposure, "private-local-admin", "private gRPC exposure");
  assertIncludes(privateGrpc.riskPosture, "Do NOT expose", "private gRPC risk posture");

  const eventLog = findAnchor(body, "event-log-sqlite");
  assertIncludes(eventLog.receiptFields, "eventLogBoundary", "event log boundary receipt field");
  assertIncludes(eventLog.receiptFields, "snapshotId", "event log snapshot receipt field");

  assertEqual(body.runtimeFlow.length, 6, "runtime flow step count");
  assertRuntimeStep(body, "driver-sends-action", "driver-io-action");
  assertRuntimeStep(body, "nockapp-dispatches-action", "action-dispatch");
  assertRuntimeStep(body, "poke-produces-effects", "poke-effect-broadcast");
  assertRuntimeStep(body, "peek-returns-optional-state", "peek-result-boundary");
  assertRuntimeStep(body, "state-export-encodes-loadstate", "exported-state-format");
  assertRuntimeStep(body, "event-log-preserves-replay-boundary", "event-log-sqlite");

  assertIncludes(body.sourceTraceContract.requiredFields, "nockchainCommit", "trace requires commit");
  assertIncludes(body.sourceTraceContract.requiredFields, "upstreamFile", "trace requires upstream file");
  assertIncludes(body.sourceTraceContract.requiredFields, "upstreamSymbol", "trace requires symbol");
  assertIncludes(body.sourceTraceContract.requiredFields, "lineRange", "trace requires line range");
  assertIncludes(body.sourceTraceContract.requiredFields, "evidenceBoundary", "trace requires boundary");
  assertIncludes(body.sourceTraceContract.requiredFields, "receiptFieldMapping", "trace requires receipt field mapping");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "rawPmaSlab", "trace forbids raw PMA");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "rawEventLog", "trace forbids raw event log");

  assertIncludes(body.pendingWatchItems.map((item) => item.prNumber), 119, "watch includes export_state PR");
  const exportStateWatch = body.pendingWatchItems.find((item) => item.prNumber === 119);
  assertIncludes(exportStateWatch.title, "export_state", "export_state watch title");
  assertEqual(
    exportStateWatch.url,
    "https://github.com/nockchain/nockchain/pull/119",
    "export_state watch URL"
  );

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/nockapp/source", "page link");
  assertEqual(body.links.nockAppAtlas, "https://nocksperimental.com/api/nockchain/nockapp-atlas", "atlas link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "Rust atlas link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-nockapp-source-trace",
    "/api/nockchain/nockapp-source",
    "Nockchain NockApp source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainNockAppSourceTrace,
    "https://nocksperimental.com/api/nockchain/nockapp-source",
    "well-known NockApp source trace link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "nockchain-nockapp-source-trace",
    "NockApp source trace capability"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/nockapp-source"]?.get?.summary,
    "Nockchain NockApp source trace",
    "OpenAPI NockApp source trace path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainNockAppSourceAnchors, 12, "checkpoint source anchor count");
  assertEqual(checkpointBody.counts.nockchainNockAppRuntimeFlowSteps, 6, "checkpoint runtime flow count");
  assertStartsWith(checkpointBody.roots.nockchainNockAppSourceTrace, "sha256:", "checkpoint source trace root");
  assertEqual(
    checkpointBody.checks.nockchainNockAppSourceTraceAvailable,
    true,
    "checkpoint source trace check"
  );
  assertIncludes(
    checkpointBody.nockchainNockAppSourceTrace.anchorIds,
    "private-grpc-boundary",
    "checkpoint source trace private gRPC anchor"
  );
  assertIncludes(
    checkpointBody.nockchainNockAppSourceTrace.receiptFields,
    "eventLogBoundary",
    "checkpoint source trace event log field"
  );
  assertEqual(
    checkpointBody.links.nockchainNockAppSourceTrace,
    "https://nocksperimental.com/api/nockchain/nockapp-source",
    "checkpoint source trace link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-nockapp-source-api"],
    "node scripts/test-nockchain-nockapp-source-api.mjs",
    "package NockApp source API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockapp-source-api",
    "full test includes NockApp source API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/nockapp-source", "Cloudflare smoke includes NockApp source API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain NockApp Source Trace", "README documents NockApp source trace");
  assertIncludes(readme, "/api/nockchain/nockapp-source", "README documents NockApp source endpoint");
}

function findAnchor(body, id) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing NockApp source anchor: ${id}`);
  }

  return anchor;
}

function assertAnchor(body, id, upstreamFile, upstreamSymbol) {
  const anchor = findAnchor(body, id);

  assertEqual(anchor.upstreamFile, upstreamFile, `${id} upstream file`);
  assertIncludes(anchor.upstreamSymbols, upstreamSymbol, `${id} upstream symbol`);
  const expectedBlobPrefix =
    "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18/";
  const expectedTreePrefix =
    "https://github.com/nockchain/nockchain/tree/33ba97b1e206dd89b15c61b72b7802caf2136c18/";
  if (!anchor.upstreamUrl.includes(expectedBlobPrefix) && !anchor.upstreamUrl.includes(expectedTreePrefix)) {
    throw new Error(`${id} upstream URL: expected ${anchor.upstreamUrl} to use current commit blob/tree URL`);
  }
  assertStartsWith(anchor.lineRange, "L", `${id} line range`);
}

function assertRuntimeStep(body, id, sourceAnchorId) {
  const step = body.runtimeFlow.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`Missing runtime flow step: ${id}`);
  }

  assertEqual(step.sourceAnchorId, sourceAnchorId, `${id} source anchor`);
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
