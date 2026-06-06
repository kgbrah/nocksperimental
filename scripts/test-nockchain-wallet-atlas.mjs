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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/wallet/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "wallet atlas status");
  assertEqual(body.version, "v0", "wallet atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/wallet", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );
  assertIncludes(body.upstream.docs, "crates/nockchain-wallet/README.md", "wallet README source");
  assertIncludes(body.upstream.docs, "crates/nockchain-api/README.md", "API README source");

  assertCommand(body, "show-balance", "nockchain-wallet show-balance", "aggregate wallet balance");
  assertCommand(body, "list-notes", "nockchain-wallet list-notes", "sync-heavy");
  assertCommand(body, "list-notes-by-address", "nockchain-wallet list-notes-by-address <base58-address>", "specified public key");
  assertCommand(body, "watch-address", "nockchain-wallet watch address <base58-pkh-or-pubkey>", "watch-only");
  assertCommand(body, "export-keys", "nockchain-wallet export-keys", "key backup");
  assertCommand(body, "tx-accepted", "nockchain-wallet --client public tx-accepted <base58-tx-id>", "public API only");

  assertEndpointMode(body, "public", "https://nockchain-api.zorp.io", "--client public");
  assertEndpointMode(body, "private", "127.0.0.1:5555", "--client private");
  assertIncludes(body.endpointModes.find((mode) => mode.id === "public")?.riskNotes ?? [], "default public endpoint is remote", "public endpoint risk");
  assertIncludes(body.endpointModes.find((mode) => mode.id === "private")?.riskNotes ?? [], "requires a local running nockchain instance", "private endpoint risk");

  assertEqual(body.localFakenetProfile.walletAddress, "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ", "local wallet address");
  assertEqual(body.localFakenetProfile.endpoint, "127.0.0.1:5555", "local fakenet endpoint");
  assertIncludes(body.localFakenetProfile.commands, "fakenock --balance", "local fakenock balance command");
  assertIncludes(
    body.localFakenetProfile.upstreamEquivalentCommands,
    "nockchain-wallet --client private show-balance",
    "private show-balance equivalent"
  );
  assertIncludes(
    body.localFakenetProfile.upstreamEquivalentCommands,
    "nockchain-wallet --client private list-notes-by-address 532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    "private address notes equivalent"
  );

  assertIncludes(body.balanceEvidenceContract.requiredFields, "walletAddress", "balance contract wallet");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "endpointMode", "balance contract endpoint mode");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "outputHash", "balance contract hash");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "nockchainBuild", "balance contract build");
  assertEqual(
    body.publicApiEvidenceContract.sourceDoc,
    "crates/nockchain-api/README.md",
    "public API evidence source doc"
  );
  assertIncludes(
    body.publicApiEvidenceContract.services,
    "NockchainService",
    "public API NockchainService"
  );
  assertIncludes(
    body.publicApiEvidenceContract.services,
    "NockchainBlockService",
    "public API NockchainBlockService"
  );
  assertContractSurface(body, "transaction-acceptance", "accepted does not prove block inclusion");
  assertContractSurface(body, "block-explorer-cache", "GetBlocks");
  assertContractSurface(body, "block-explorer-cache", "pending transactions are only reported as pending");
  assertContractSurface(body, "block-explorer-cache", "newest up to 1024 blocks");
  assertContractSurface(body, "block-explorer-cache", "short-lived stale data can appear after a reorg");
  assertContractSurface(body, "observability", "nockchain_public_grpc.*");
  assertIncludes(
    body.publicApiEvidenceContract.requiredReceiptFields,
    "cacheWarmupState",
    "public API receipt cache warmup field"
  );
  assertIncludes(
    body.publicApiEvidenceContract.requiredReceiptFields,
    "heaviestChainFreshness",
    "public API receipt freshness field"
  );
  assertIncludes(
    body.publicApiEvidenceContract.interpretationRules,
    "Treat tx-accepted as node acceptance, not block inclusion.",
    "public API tx accepted interpretation"
  );
  assertIncludes(
    body.publicApiEvidenceContract.interpretationRules,
    "Treat empty or missing explorer pages during warm-up as inconclusive until cache state and heaviest-chain freshness are recorded.",
    "public API cache warm-up interpretation"
  );

  const txSource = body.walletTransactionSourceContract;
  assertEqual(txSource.releaseCommit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "wallet tx source release commit");
  assertEqual(
    txSource.releaseBuild,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "wallet tx source release build"
  );
  assertEqual(txSource.sourceAuthority, "current-released-nockchain-rust", "wallet tx source authority");
  assertIncludes(txSource.crateSurfaces, "wallet-tx-builder", "wallet tx builder crate surface");
  assertIncludes(txSource.crateSurfaces, "nockchain-wallet", "nockchain wallet crate surface");
  assertSourceAnchor(
    txSource,
    "wallet-tx-builder-planner",
    "crates/wallet-tx-builder/src/planner.rs",
    "bbb80bb18f47c20c4c095138b402d339787650ebe4428ef375f1c82c3bc795e8",
    78573,
    "compute_minimum_fee"
  );
  assertSourceAnchor(
    txSource,
    "wallet-note-data",
    "crates/wallet-tx-builder/src/note_data.rs",
    "4f47aab8658aff1f1eb996fbd65620cf269a7d72e1524c36d1afe660f6d68829",
    32367,
    "RawNoteDataEntry"
  );
  assertSourceAnchor(
    txSource,
    "wallet-lock-resolver",
    "crates/wallet-tx-builder/src/lock_resolver.rs",
    "02f0a048e224db8964c4e7344b6cfecb3dbc3d4dcb22529ed15d09fd7a9d1d77",
    24172,
    "LockResolutionSource"
  );
  assertSourceAnchor(
    txSource,
    "wallet-fee",
    "crates/wallet-tx-builder/src/fee.rs",
    "88dcc863ab3ec13ea4c8eafd0aa63acc2dfa46689319f8e2a2b780880d29823e",
    5447,
    "compute_bridge_fee"
  );
  assertSourceAnchor(
    txSource,
    "wallet-word-count",
    "crates/wallet-tx-builder/src/word_count.rs",
    "b68dbb80fb0bfd0582abf995b8d18be61086622b87a467c60dd3c9ca25cb6eb4",
    36418,
    "WordCountEstimator"
  );
  assertSourceAnchor(
    txSource,
    "wallet-types",
    "crates/wallet-tx-builder/src/types.rs",
    "4ae5fb18e586e0820ddf6894017fae96dfb021619c8acca94315b3e67a50f757",
    15335,
    "CreateTxPlanningMode"
  );
  assertSourceAnchor(
    txSource,
    "nockchain-wallet-create-tx",
    "crates/nockchain-wallet/src/create_tx.rs",
    "544d662fffc4b239cd0aa81ac23613fee621d0f790e91d3172a40486d5168fc8",
    87565,
    "CreateTxRequest"
  );
  assertSourceAnchor(
    txSource,
    "nockchain-wallet-command",
    "crates/nockchain-wallet/src/command.rs",
    "7340d1c242e8f3317a124e856c5c3610afc9ea60d1ff74d22d8de43e26514784",
    26527,
    "NoteSelectionStrategyCli"
  );
  assertSourceAnchor(
    txSource,
    "nockchain-wallet-recipient",
    "crates/nockchain-wallet/src/recipient.rs",
    "4fabfa51d9584840a876b54f9be7691c9efef713b9e017d73236dd7d186addf1",
    18860,
    "RecipientSpec"
  );
  assertIncludes(txSource.receiptFields, "walletTransactionSourceCommit", "wallet tx receipt source commit");
  assertIncludes(txSource.receiptFields, "feeBreakdown", "wallet tx receipt fee breakdown");
  assertIncludes(txSource.receiptFields, "wordCountBreakdown", "wallet tx receipt word count");
  assertIncludes(txSource.receiptFields, "lockResolutionSource", "wallet tx receipt lock source");
  assertIncludes(txSource.receiptFields, "noteDataKeys", "wallet tx receipt note data keys");
  assertIncludes(txSource.forbiddenFields, "rawUnsignedTx", "wallet tx forbidden unsigned tx");
  assertIncludes(txSource.forbiddenFields, "rawTransactionJam", "wallet tx forbidden raw jam");
  assertIncludes(txSource.verificationCommands, "npm run test:nockchain-upstream-drift-check", "wallet tx drift verification");
  const memoBlobSignal = txSource.openPrSignals.find((signal) => signal.id === "wallet-memo-blob-pr-116");
  if (!memoBlobSignal) {
    throw new Error("Missing wallet memo/blob PR signal");
  }
  assertEqual(memoBlobSignal.status, "open", "wallet memo/blob PR status");
  assertEqual(memoBlobSignal.sourceAuthority, "open-pr-early-warning", "wallet memo/blob PR authority");
  assertEqual(memoBlobSignal.url, "https://github.com/nockchain/nockchain/pull/116", "wallet memo/blob PR URL");
  assertIncludes(memoBlobSignal.signals, "memo", "wallet memo PR signal");
  assertIncludes(memoBlobSignal.signals, "blob", "wallet blob PR signal");
  assertIncludes(
    txSource.interpretationRules,
    "Treat open PR #116 memo/blob support as watch-only until it lands in a released Nockchain build.",
    "wallet memo/blob watch-only interpretation"
  );

  assertIncludes(body.safety.doNotStore, "seed phrases", "seed safety");
  assertIncludes(body.safety.doNotStore, "private keys", "private key safety");
  assertIncludes(body.safety.doNotStore, "keys.export", "exported key safety");
  assertIncludes(body.safety.publicApiWarnings, "no authentication", "public API warning");
  assertIncludes(body.safety.publicApiWarnings, "no rate limiting", "rate-limit warning");

  assertScenario(body, "balance-unknown", "endpoint and sync context");
  assertScenario(body, "watch-only-missing", "watch-only identifier");
  assertScenario(body, "private-grpc-unreachable", "127.0.0.1:5555");
  assertScenario(body, "public-api-exposure-risk", "no authentication");
  assertScenario(body, "tx-accepted-public-only", "private API cannot be queried");

  assertEqual(body.links.localFakenetCommands, "https://nocksperimental.com/api/fakenet/commands", "commands link");
  assertEqual(body.links.operationsAtlas, "https://nocksperimental.com/api/nockchain/operations", "operations link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "nockchain-wallet-atlas", "/api/nockchain/wallet", "Nockchain wallet/API atlas");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainWalletAtlas,
    "https://nocksperimental.com/api/nockchain/wallet",
    "well-known wallet link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-wallet-api-atlas", "wallet capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/wallet"]?.get?.summary,
    "Nockchain wallet/API atlas",
    "OpenAPI wallet path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainWalletCommands, 5, "checkpoint wallet command count");
  assertEqual(
    checkpointBody.counts.nockchainPublicApiEvidenceSurfaces,
    3,
    "checkpoint public API evidence surface count"
  );
  assertStartsWith(checkpointBody.roots.nockchainWalletAtlas, "sha256:", "checkpoint wallet root");
  assertEqual(checkpointBody.checks.nockchainWalletAtlasAvailable, true, "checkpoint wallet guard");
  assertEqual(
    checkpointBody.checks.nockchainPublicApiEvidenceContractAvailable,
    true,
    "checkpoint public API evidence contract guard"
  );
  assertIncludes(
    checkpointBody.nockchainWalletAtlas.publicApiEvidenceSurfaceIds,
    "block-explorer-cache",
    "checkpoint public API cache surface"
  );
  assertIncludes(
    checkpointBody.nockchainWalletAtlas.publicApiEvidenceSurfaceIds,
    "transaction-acceptance",
    "checkpoint public API tx surface"
  );
  assertEqual(
    checkpointBody.links.nockchainWalletAtlas,
    "https://nocksperimental.com/api/nockchain/wallet",
    "checkpoint wallet link"
  );

  const page = readText("src/app/nockchain/wallet/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainWalletAtlas", "wallet page uses atlas");
  assertIncludes(page, "Nockchain Wallet", "wallet page title");
  assertIncludes(page, "show-balance", "wallet page renders show balance");
  assertIncludes(page, "list-notes-by-address", "wallet page renders address notes");
  assertIncludes(page, "watch-only", "wallet page renders watch-only");
  assertIncludes(page, "public API exposure", "wallet page renders public risk");
  assertIncludes(page, "Public API Evidence Contract", "wallet page renders public API evidence contract");
  assertIncludes(page, "blockExplorerCacheSurfaceId", "wallet page pins block explorer cache surface");
  assertIncludes(page, "transactionAcceptanceSurfaceId", "wallet page pins transaction acceptance surface");
  assertIncludes(page, "nockchain_public_grpc.*", "wallet page renders public API metrics");
  assertIncludes(page, "accepted does not prove block inclusion", "wallet page renders tx accepted caveat");
  assertIncludes(page, "Transaction Source Contract", "wallet page renders tx source contract");
  assertIncludes(page, "wallet-tx-builder", "wallet page renders wallet tx builder crate");
  assertIncludes(page, "crates/wallet-tx-builder/src/planner.rs", "wallet page renders planner source path");
  assertIncludes(page, "crates/nockchain-wallet/src/create_tx.rs", "wallet page renders create tx source path");
  assertIncludes(page, "walletTransactionSourceCommit", "wallet page renders tx source receipt field");
  assertIncludes(page, "feeBreakdown", "wallet page renders fee receipt field");
  assertIncludes(page, "wordCountBreakdown", "wallet page renders word count receipt field");
  assertIncludes(page, "lockResolutionSource", "wallet page renders lock source receipt field");
  assertIncludes(page, "memo", "wallet page renders memo PR signal");
  assertIncludes(page, "blob", "wallet page renders blob PR signal");
  assertIncludes(page, "open-pr-early-warning", "wallet page renders open PR authority");
  assertIncludes(page, "rawUnsignedTx", "wallet page renders raw unsigned tx forbidden field");
  assertIncludes(page, "rawTransactionJam", "wallet page renders raw transaction jam forbidden field");
  assertIncludes(
    page,
    "npm run test:nockchain-upstream-drift-check",
    "wallet page renders tx source drift check"
  );
  assertIncludes(page, "seed phrases", "wallet page renders secret safety");
  assertIncludes(page, 'href="/api/nockchain/wallet"', "wallet page links API");
  assertIncludes(page, 'href="/nockchain"', "wallet page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/wallet"', "Nockchain page links wallet page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-wallet-atlas"],
    "node scripts/test-nockchain-wallet-atlas.mjs",
    "package wallet test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-wallet-atlas", "full test includes wallet atlas");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/wallet", "Cloudflare smoke includes wallet API");
  assertIncludes(smokeSource, "/nockchain/wallet", "Cloudflare smoke includes wallet page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Wallet/API Atlas", "README documents wallet atlas");
  assertIncludes(readme, "public API evidence contract", "README documents public API evidence contract");
  assertIncludes(readme, "Transaction Source Contract", "README documents wallet tx source contract");
  assertIncludes(readme, "wallet-tx-builder", "README documents wallet tx builder");
  assertIncludes(readme, "PR #116", "README documents wallet memo/blob PR signal");
  assertIncludes(readme, "/api/nockchain/wallet", "README documents wallet endpoint");
  assertIncludes(readme, "/nockchain/wallet", "README documents wallet page");
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

function assertCommand(body, id, expectedCommand, expectedText) {
  const command = body.walletCommands.find((candidate) => candidate.id === id);

  if (!command) {
    throw new Error(`Missing wallet command: ${id}`);
  }

  assertEqual(command.command, expectedCommand, `${id} command`);
  assertIncludes(
    [command.description, command.evidenceUse, command.risk].filter(Boolean).join("\n"),
    expectedText,
    `${id} expected text`
  );
}

function assertEndpointMode(body, id, expectedEndpoint, expectedFlag) {
  const mode = body.endpointModes.find((candidate) => candidate.id === id);

  if (!mode) {
    throw new Error(`Missing endpoint mode: ${id}`);
  }

  assertEqual(mode.endpoint, expectedEndpoint, `${id} endpoint`);
  assertIncludes(mode.commandPattern, expectedFlag, `${id} flag`);
}

function assertScenario(body, id, expectedText) {
  const scenario = body.triageScenarios.find((candidate) => candidate.id === id);

  if (!scenario) {
    throw new Error(`Missing wallet scenario: ${id}`);
  }

  assertIncludes(
    [scenario.title, scenario.symptom, scenario.interpretation, ...(scenario.checks ?? [])].join("\n"),
    expectedText,
    `${id} expected text`
  );
}

function assertContractSurface(body, id, expectedText) {
  const surface = body.publicApiEvidenceContract.surfaces.find((candidate) => candidate.id === id);

  if (!surface) {
    throw new Error(`Missing public API evidence surface: ${id}`);
  }

  assertIncludes(
    [
      surface.label,
      surface.evidenceMeaning,
      ...(surface.endpoints ?? []),
      ...(surface.limits ?? []),
      ...(surface.observability ?? []),
      ...(surface.notProofOf ?? [])
    ].join("\n"),
    expectedText,
    `${id} expected text`
  );
}

function assertSourceAnchor(contract, id, pathName, sha256, bytes, expectedSymbol) {
  const anchor = contract.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing wallet tx source anchor: ${id}`);
  }

  assertEqual(anchor.path, pathName, `${id} path`);
  assertEqual(anchor.sha256, sha256, `${id} sha256`);
  assertEqual(anchor.bytes, bytes, `${id} byte length`);
  assertIncludes(anchor.sourceUrl, `/blob/${contract.releaseCommit}/${pathName}`, `${id} source URL`);
  assertIncludes(anchor.lineAnchors.join("\n"), expectedSymbol, `${id} expected line anchor`);
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

function assertGreaterThan(actual, expectedMinimum, label) {
  if (!(actual > expectedMinimum)) {
    throw new Error(`${label}: expected more than ${expectedMinimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
