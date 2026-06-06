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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/bridge-source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "bridge source trace status");
  assertEqual(body.version, "v0", "bridge source trace version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/bridge-source",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );
  assertEqual(body.sourceAnchors.length, 12, "source anchor count");

  assertAnchor(body, "bridge-withdrawals-spec", "crates/bridge/docs/bridge-withdrawals.md", "bridge-withdrawals");
  assertAnchor(body, "runtime-loop-bootstrap", "crates/bridge/src/withdrawal/runtime.rs", "spawn_runtime_loops");
  assertAnchor(body, "withdrawal-kernel-port", "crates/bridge/src/withdrawal/assembly.rs", "WithdrawalKernelPort");
  assertAnchor(body, "execution-driver-effects", "crates/bridge/src/withdrawal/assembly.rs", "create_withdrawal_execution_driver");
  assertAnchor(body, "assembly-tick", "crates/bridge/src/withdrawal/assembly.rs", "withdrawal_assembly_tick_once");
  assertAnchor(body, "submission-tick", "crates/bridge/src/withdrawal/submission.rs", "withdrawal_submission_tick_once");
  assertAnchor(body, "public-submitter", "crates/bridge/src/withdrawal/submission.rs", "PublicNockchainWithdrawalSubmitter");
  assertAnchor(body, "confirmation-loop", "crates/bridge/src/withdrawal/submission.rs", "withdrawal_sequencer_confirmation_tick_once");
  assertAnchor(body, "orphan-retry-loop", "crates/bridge/src/withdrawal/submission.rs", "withdrawal_sequencer_orphan_retry_tick_once");
  assertAnchor(body, "sequencer-rpc-service", "crates/bridge/src/withdrawal/sequencer/rpc.rs", "WithdrawalSequencerRpcService");
  assertAnchor(body, "sequencer-store", "crates/bridge/src/withdrawal/sequencer/store.rs", "WithdrawalSequencerStore");
  assertAnchor(body, "sequencer-journal", "crates/bridge/src/withdrawal/sequencer/journal.rs", "SequencerJournalRecord");

  const spec = findAnchor(body, "bridge-withdrawals-spec");
  assertIncludes(spec.evidenceUse, "peer canonicalization is not enough", "spec captures peer canonical risk");
  assertIncludes(spec.receiptFields, "kernelReconciliationStatus", "spec maps reconciliation");

  const driver = findAnchor(body, "execution-driver-effects");
  assertIncludes(driver.receiptFields, "withdrawalProposalBuilt", "driver maps proposal built");
  assertIncludes(driver.receiptFields, "withdrawalTxSigned", "driver maps signed tx");

  const rpc = findAnchor(body, "sequencer-rpc-service");
  assertEqual(rpc.exposure, "api-node-private-sequencer", "sequencer RPC exposure");
  assertIncludes(rpc.riskPosture, "caller_node_id is currently trusted", "RPC risk posture names trusted caller");

  const store = findAnchor(body, "sequencer-store");
  assertIncludes(store.receiptFields, "singleFlightWithdrawal", "store maps single-flight field");
  assertIncludes(store.receiptFields, "reservedInputNames", "store maps reserved inputs");

  const journal = findAnchor(body, "sequencer-journal");
  assertIncludes(journal.receiptFields, "sequencerJournalId", "journal maps journal id");
  assertIncludes(journal.receiptFields, "previousEventId", "journal maps previous event");
  assertIncludes(journal.receiptFields, "recordHash", "journal maps record hash");
  assertIncludes(journal.receiptFields, "signature", "journal maps signature");

  assertEqual(body.executionFlow.length, 8, "execution flow step count");
  assertFlowStep(body, "base-burn-pending", "bridge-withdrawals-spec");
  assertFlowStep(body, "kernel-effects-to-driver", "execution-driver-effects");
  assertFlowStep(body, "assembly-builds-proposal", "assembly-tick");
  assertFlowStep(body, "peer-canonical-not-submit-ready", "sequencer-store");
  assertFlowStep(body, "sequencer-authorizes", "submission-tick");
  assertFlowStep(body, "sequencer-submits", "public-submitter");
  assertFlowStep(body, "sequencer-confirms", "confirmation-loop");
  assertFlowStep(body, "kernel-reconciles", "bridge-withdrawals-spec");

  assertIncludes(body.sourceTraceContract.requiredFields, "nockchainCommit", "trace requires commit");
  assertIncludes(body.sourceTraceContract.requiredFields, "upstreamFile", "trace requires upstream file");
  assertIncludes(body.sourceTraceContract.requiredFields, "upstreamSymbol", "trace requires symbol");
  assertIncludes(body.sourceTraceContract.requiredFields, "lineRange", "trace requires line range");
  assertIncludes(body.sourceTraceContract.requiredFields, "withdrawalId", "trace requires withdrawal id");
  assertIncludes(body.sourceTraceContract.requiredFields, "sequencerState", "trace requires sequencer state");
  assertIncludes(body.sourceTraceContract.requiredFields, "journalEventId", "trace requires journal event");
  assertIncludes(body.sourceTraceContract.requiredFields, "confirmationEvidence", "trace requires confirmation evidence");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "rawTransactionJam", "trace forbids raw tx jam");
  assertIncludes(body.sourceTraceContract.forbiddenFields, "sequencerJournalSigningKey", "trace forbids journal signing key");

  assertIncludes(body.upstreamSignals.map((item) => item.prNumber), 127, "trace includes bridge PR 127");
  const bridgePr = body.upstreamSignals.find((item) => item.prNumber === 127);
  assertIncludes(bridgePr.title, "end-to-end withdrawal execution", "bridge PR title");
  assertEqual(bridgePr.status, "merged", "bridge PR status");

  assertIncludes(body.operatorInvariants, "peer-canonical is not submit-ready", "operator invariant");
  assertIncludes(body.operatorInvariants, "submitted is advisory until confirmation depth", "confirmation invariant");
  assertIncludes(body.operatorInvariants, "sequencer journal secrets never enter receipts", "journal secret invariant");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/bridge/source", "page link");
  assertEqual(body.links.bridgeTrace, "https://nocksperimental.com/api/nockchain/bridge", "bridge trace link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "Rust atlas link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-bridge-source-trace",
    "/api/nockchain/bridge-source",
    "Nockchain bridge execution source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainBridgeSourceTrace,
    "https://nocksperimental.com/api/nockchain/bridge-source",
    "well-known bridge source trace link"
  );
  assertIncludes(
    wellKnownBody.capabilities,
    "nockchain-bridge-source-trace",
    "bridge source trace capability"
  );

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/bridge-source"]?.get?.summary,
    "Nockchain bridge execution source trace",
    "OpenAPI bridge source trace path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainBridgeSourceAnchors, 12, "checkpoint bridge source anchor count");
  assertEqual(checkpointBody.counts.nockchainBridgeExecutionFlowSteps, 8, "checkpoint bridge flow count");
  assertStartsWith(checkpointBody.roots.nockchainBridgeSourceTrace, "sha256:", "checkpoint bridge source root");
  assertEqual(
    checkpointBody.checks.nockchainBridgeSourceTraceAvailable,
    true,
    "checkpoint bridge source trace check"
  );
  assertIncludes(
    checkpointBody.nockchainBridgeSourceTrace.anchorIds,
    "sequencer-journal",
    "checkpoint bridge source journal anchor"
  );
  assertIncludes(
    checkpointBody.nockchainBridgeSourceTrace.receiptFields,
    "singleFlightWithdrawal",
    "checkpoint bridge source single-flight field"
  );
  assertEqual(
    checkpointBody.links.nockchainBridgeSourceTrace,
    "https://nocksperimental.com/api/nockchain/bridge-source",
    "checkpoint bridge source trace link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-bridge-source-api"],
    "node scripts/test-nockchain-bridge-source-api.mjs",
    "package bridge source API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-bridge-source-api",
    "full test includes bridge source API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/bridge-source", "Cloudflare smoke includes bridge source API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Bridge Source Trace", "README documents bridge source trace");
  assertIncludes(readme, "/api/nockchain/bridge-source", "README documents bridge source endpoint");
}

function findAnchor(body, id) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing bridge source anchor: ${id}`);
  }

  return anchor;
}

function assertAnchor(body, id, upstreamFile, upstreamSymbol) {
  const anchor = findAnchor(body, id);

  assertEqual(anchor.upstreamFile, upstreamFile, `${id} upstream file`);
  assertIncludes(anchor.upstreamSymbols, upstreamSymbol, `${id} upstream symbol`);
  const expectedBlobPrefix =
    "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18/";
  if (!anchor.upstreamUrl.includes(expectedBlobPrefix)) {
    throw new Error(`${id} upstream URL: expected ${anchor.upstreamUrl} to use current commit blob URL`);
  }
  assertStartsWith(anchor.lineRange, "L", `${id} line range`);
}

function assertFlowStep(body, id, sourceAnchorId) {
  const step = body.executionFlow.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`Missing execution flow step: ${id}`);
  }

  assertEqual(step.sourceAnchorId, sourceAnchorId, `${id} source anchor`);
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

function assertEndpoint(body, id, path, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, path, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${path}`, `${id} url`);
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)}, received ${JSON.stringify(expected)}`);
  }
}
