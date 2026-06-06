#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const { createNockchainReceiptProvenance, nockchainUpstreamIntelligence } =
    loadTypeScriptModule("src/lib/nockchain-upstream.ts");

  const provenance = createNockchainReceiptProvenance({
    network: "local-fakenet",
    endpoint: "http://127.0.0.1:5555",
    walletAddress: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    project: "counter-nockapp",
    settlementMode: "fakenet",
    stateJamFingerprint: "sha256:test-state-jam"
  });

  assertEqual(provenance.source, "nockchain-upstream-intelligence", "provenance source");
  assertEqual(provenance.commit.shortSha, "33ba97b1e206", "provenance commit");
  assertEqual(
    provenance.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "provenance release"
  );
  assertEqual(provenance.context.network, "local-fakenet", "network context");
  assertEqual(provenance.context.stateJamFingerprint, "sha256:test-state-jam", "state-jam context");

  assertEqual(
    provenance.links.docsAtlas,
    "https://nocksperimental.com/api/nockchain/docs-atlas",
    "docs atlas link"
  );
  assertEqual(
    provenance.docs.atlas.url,
    "https://nocksperimental.com/api/nockchain/docs-atlas",
    "docs atlas URL"
  );
  assertEqual(provenance.docs.atlas.trustContract.readOrder[0], "START_HERE.md", "docs read order");
  assertIncludes(provenance.docs.atlas.tier0Sources, "PROTOCOL.md", "Tier 0 protocol doc");
  assertIncludes(
    provenance.docs.atlas.tier1Sources,
    "crates/nockchain-wallet/README.md",
    "Tier 1 wallet doc"
  );
  assertIncludes(
    provenance.docs.consistencyAlerts.map((alert) => alert.id),
    "protocol-014-status-drift",
    "docs consistency alert"
  );

  assertEqual(provenance.protocol.specs.next.sequence, "013", "next protocol spec");
  assertEqual(provenance.protocol.specs.next.status, "final", "next protocol spec status");
  assertEqual(provenance.protocol.specs.next.consensusCritical, false, "next protocol consensus flag");
  assertEqual(provenance.protocol.specs.latestConsensusCritical.sequence, "014", "latest consensus spec");
  assertEqual(provenance.protocol.specs.latestConsensusCritical.status, "activated", "latest consensus status");
  assertEqual(
    provenance.protocol.specs.latestConsensusCritical.protocolIndexStatus,
    "draft",
    "latest consensus protocol-index status"
  );
  assertEqual(provenance.protocol.specs.latestConsensusCritical.activationHeight, 65500, "latest consensus height");
  assertIncludes(
    provenance.protocol.consistencyAlerts.map((alert) => alert.id),
    "protocol-014-status-drift",
    "protocol consistency alert"
  );

  assertIncludes(
    nockchainUpstreamIntelligence.nocksperimentalImplications.receiptFields,
    "docConsistencyAlerts",
    "upstream receipt fields include doc consistency alerts"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-receipt-provenance"],
    "node scripts/test-nockchain-receipt-provenance.mjs",
    "package provenance test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-receipt-provenance",
    "full test includes provenance test"
  );
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

function assertIncludes(collection, expected, label) {
  if (!collection?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
