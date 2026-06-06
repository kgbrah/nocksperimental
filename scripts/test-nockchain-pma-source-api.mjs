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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/pma/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "PMA source trace status");
  assertEqual(body.version, "v0", "PMA source trace version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/pma", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThan(body.sourceAnchors.length, 4, "PMA source anchor count");
  assertSourceAnchor(
    body,
    "pma-metadata-trailer",
    "crates/nockvm/rust/nockvm/src/pma.rs",
    "Pma::read_file_metadata"
  );
  assertSourceAnchor(
    body,
    "pma-open-growth-recovery",
    "crates/nockvm/rust/nockvm/src/pma.rs",
    "recover_metadata_from_growth_journal"
  );
  assertSourceAnchor(
    body,
    "snapshot-verify-ready",
    "crates/nockapp/src/snapshot.rs",
    "verify_snapshot"
  );
  assertSourceAnchor(
    body,
    "snapshot-create-ready",
    "crates/nockapp/src/snapshot.rs",
    "create_ready_snapshot"
  );
  assertSourceAnchor(
    body,
    "event-log-replay-boundary",
    "crates/nockapp/src/event_log.rs",
    "EventLog::replay_events_after"
  );
  assertSourceAnchor(
    body,
    "kernel-event-log-restore",
    "crates/nockapp/src/kernel/form.rs",
    "SerfThread::new_with_event_log"
  );

  assertDurabilityStep(body, "metadata-trailer-read", "PMA trailer");
  assertDurabilityStep(body, "journal-recovery", "growth and migration journals");
  assertDurabilityStep(body, "source-pma-sync", "snapshot_source_pma_fdatasync");
  assertDurabilityStep(body, "snapshot-copy-verify", "verify_snapshot");
  assertDurabilityStep(body, "event-log-replay", "EventLog::replay_events_after");

  assertIncludes(body.snapshotVerification.requiredChecks, "manifest-pma-words-match", "snapshot PMA words check");
  assertIncludes(body.snapshotVerification.requiredChecks, "manifest-alloc-words-match", "snapshot alloc words check");
  assertIncludes(body.snapshotVerification.requiredChecks, "used-blake3-prefix-match", "snapshot used hash check");
  assertIncludes(body.snapshotVerification.requiredChecks, "kernel-root-raw-valid", "snapshot kernel root check");
  assertIncludes(body.snapshotVerification.requiredChecks, "cold-offset-valid", "snapshot cold offset check");
  assertIncludes(body.snapshotVerification.requiredChecks, "event-log-ready-snapshot-record", "snapshot event-log record check");

  assertIncludes(body.eventLogContract.sqliteFiles, "event-log.sqlite3", "event log file");
  assertIncludes(body.eventLogContract.sqliteFiles, "event-log.sqlite3-wal", "event log WAL");
  assertIncludes(body.eventLogContract.sqliteFiles, "event-log.sqlite3-shm", "event log SHM");
  assertIncludes(body.eventLogContract.replayGuards, "contiguous-event-num-sequence", "event replay gap guard");
  assertIncludes(body.eventLogContract.replayGuards, "sqlite-pragma-quick-check", "event log quick check");
  assertIncludes(body.eventLogContract.replayGuards, "active-snapshot-id-meta", "active snapshot meta guard");

  assertIncludes(body.receiptContract.requiredFields, "pmaMetadataVersion", "receipt metadata version");
  assertIncludes(body.receiptContract.requiredFields, "pmaDataWords", "receipt data words");
  assertIncludes(body.receiptContract.requiredFields, "pmaAllocWords", "receipt alloc words");
  assertIncludes(body.receiptContract.requiredFields, "pmaReservedWords", "receipt reserved words");
  assertIncludes(body.receiptContract.requiredFields, "snapshotManifestPath", "receipt snapshot manifest");
  assertIncludes(body.receiptContract.requiredFields, "snapshotUsedBlake3", "receipt snapshot hash");
  assertIncludes(body.receiptContract.requiredFields, "eventLogMaxEventNum", "receipt event max");
  assertIncludes(body.receiptContract.requiredFields, "eventBoundary", "receipt event boundary");
  assertIncludes(body.receiptContract.requiredFields, "stateJamFingerprint", "receipt state jam fingerprint");
  assertIncludes(body.receiptContract.requiredFields, "nockchainCommit", "receipt commit");
  assertIncludes(body.receiptContract.requiredFields, "nockchainBuild", "receipt build");
  assertIncludes(body.receiptContract.forbiddenFields, "rawPmaSlab", "forbid raw PMA");
  assertIncludes(body.receiptContract.forbiddenFields, "rawSnapshotPma", "forbid raw snapshot PMA");
  assertIncludes(body.receiptContract.forbiddenFields, "rawEventLogSqlite", "forbid raw event log");
  assertIncludes(body.receiptContract.forbiddenFields, "rawStateJam", "forbid raw state jam");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "forbid wallet seed");

  assertIncludes(body.operatorGuards, "stop-node-before-copying-state", "operator stop guard");
  assertIncludes(body.operatorGuards, "record-producing-build-and-event-boundary", "operator build guard");
  assertIncludes(body.operatorGuards, "never-publish-raw-pma-or-event-log", "operator raw artifact guard");
  assertIncludes(body.operatorGuards, "verify-snapshot-before-trusting-state-jam", "operator snapshot guard");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/pma", "page link");
  assertEqual(body.links.stateJams, "https://nocksperimental.com/api/nockchain/state-jams", "state-jams link");
  assertEqual(body.links.rustSource, "https://nocksperimental.com/api/nockchain/rust-source", "rust source link");
  assertEqual(body.links.nockappSource, "https://nocksperimental.com/api/nockchain/nockapp-source", "NockApp source link");
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-pma-source-trace",
    "/api/nockchain/pma",
    "Nockchain PMA durability source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainPmaSourceTrace,
    "https://nocksperimental.com/api/nockchain/pma",
    "well-known PMA source trace link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-pma-source-trace", "PMA source capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/pma"]?.get?.summary,
    "Nockchain PMA durability source trace",
    "OpenAPI PMA path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainPmaSourceAnchors, 4, "checkpoint PMA anchor count");
  assertEqual(checkpointBody.counts.nockchainPmaDurabilitySteps, body.durabilityFlow.length, "checkpoint PMA flow count");
  assertStartsWith(checkpointBody.roots.nockchainPmaSourceTrace, "sha256:", "checkpoint PMA root");
  assertEqual(checkpointBody.checks.nockchainPmaSourceTraceAvailable, true, "checkpoint PMA source check");
  assertIncludes(
    checkpointBody.nockchainPmaSourceTrace.sourceAnchors,
    "pma-metadata-trailer",
    "checkpoint PMA metadata anchor"
  );
  assertIncludes(
    checkpointBody.nockchainPmaSourceTrace.receiptFields,
    "pmaMetadataVersion",
    "checkpoint PMA receipt field"
  );
  assertIncludes(
    checkpointBody.nockchainPmaSourceTrace.forbiddenFields,
    "rawEventLogSqlite",
    "checkpoint PMA forbidden event log"
  );
  assertEqual(
    checkpointBody.links.nockchainPmaSourceTrace,
    "https://nocksperimental.com/api/nockchain/pma",
    "checkpoint PMA link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-pma-source-api"],
    "node scripts/test-nockchain-pma-source-api.mjs",
    "package PMA API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-pma-source-api",
    "full test includes PMA API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/pma", "Cloudflare smoke includes PMA API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain PMA Source Trace", "README documents PMA source trace");
  assertIncludes(readme, "/api/nockchain/pma", "README documents PMA API");
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

function assertDurabilityStep(body, id, expectedDetail) {
  const step = body.durabilityFlow.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`Missing durability step: ${id}`);
  }

  assertIncludes(step.evidence, expectedDetail, `${id} evidence`);
  assertGreaterThan(step.sourceAnchorIds.length, 0, `${id} source anchors`);
  assertGreaterThan(step.receiptFields.length, 0, `${id} receipt fields`);
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

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(modulePath), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire(parentPath) {
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
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
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

  return require(specifier);
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertGreaterThan(actual, expected, label) {
  if (!(actual > expected)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${expected}`);
  }
}

function assertStartsWith(actual, expected, label) {
  if (!actual?.startsWith(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`);
  }
}
