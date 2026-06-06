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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/cargo-surface/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "cargo surface status");
  assertEqual(body.version, "v0", "cargo surface version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/cargo-surface",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertEqual(body.workspace.resolver, "2", "workspace resolver");
  assertEqual(body.workspace.memberCount, 36, "workspace member count");
  assertIncludes(body.workspace.manifestPaths, "crates/nockchain/Cargo.toml", "workspace includes nockchain manifest");
  assertIncludes(body.workspace.manifestPaths, "crates/nockchain-wallet/Cargo.toml", "workspace includes wallet manifest");
  assertIncludes(body.workspace.manifestPaths, "crates/nockchain-api/Cargo.toml", "workspace includes API manifest");
  assertIncludes(body.workspaceDependencyHighlights.libp2p.features, "quic", "libp2p quic feature");
  assertEqual(
    body.workspaceDependencyHighlights.libp2p.rev,
    "da0017ee887a868e231ed78c7de892779c17800d",
    "libp2p pinned rev"
  );
  assertEqual(
    body.workspaceDependencyHighlights.snmalloc.rev,
    "060d5b9fa1c5777a52deae8dbdd82da91babf35f",
    "snmalloc pinned rev"
  );

  assertEqual(body.crates.length, 9, "high-signal crate count");
  assertCrate(body, "nockchain", "crates/nockchain/Cargo.toml", "bin", "src/main.rs", "cargo check -p nockchain");
  assertCrate(body, "nockchain-wallet", "crates/nockchain-wallet/Cargo.toml", "bin", "src/main.rs", "cargo check -p nockchain-wallet");
  assertCrate(body, "nockchain-api", "crates/nockchain-api/Cargo.toml", "bin", "src/main.rs", "cargo check -p nockchain-api");
  assertCrate(body, "nockapp", "crates/nockapp/Cargo.toml", "lib", "src/lib.rs", "cargo check -p nockapp");
  assertCrate(body, "nockup", "crates/nockup/Cargo.toml", "bin", "src/main.rs", "cargo check -p nockup");
  assertCrate(
    body,
    "nockchain-bridge-sequencer",
    "crates/nockchain-bridge-sequencer/Cargo.toml",
    "bin",
    "src/main.rs",
    "cargo check -p nockchain-bridge-sequencer"
  );
  assertCrate(body, "wallet-tx-builder", "crates/wallet-tx-builder/Cargo.toml", "lib", "src/lib.rs", "cargo check -p wallet-tx-builder");
  assertCrate(
    body,
    "nockchain-libp2p-io",
    "crates/nockchain-libp2p-io/Cargo.toml",
    "lib",
    "src/lib.rs",
    "cargo check -p nockchain-libp2p-io"
  );
  assertCrate(body, "nockvm", "crates/nockvm/rust/nockvm/Cargo.toml", "lib", "src/lib.rs", "cargo check -p nockvm");

  const nockchain = findCrate(body, "nockchain");
  assertIncludes(nockchain.features, "jemalloc", "nockchain jemalloc feature");
  assertIncludes(nockchain.features, "tracing-heap", "nockchain tracing heap feature");
  assertIncludes(nockchain.dependencies, "nockchain-libp2p-io", "nockchain depends on libp2p IO");
  assertIncludes(nockchain.dependencies, "zkvm-jetpack", "nockchain depends on zkvm jetpack");
  assertIncludes(nockchain.targets.map((target) => target.name), "bench_nockchain_kernel", "nockchain kernel bench target");

  const wallet = findCrate(body, "nockchain-wallet");
  assertIncludes(wallet.dependencies, "wallet-tx-builder", "wallet depends on tx builder");
  assertIncludes(wallet.sourceFocus, "crates/nockchain-wallet/src/command.rs", "wallet command source");
  assertIncludes(wallet.sourceFocus, "crates/nockchain-wallet/src/create_tx.rs", "wallet create tx source");

  const api = findCrate(body, "nockchain-api");
  assertIncludes(api.features, "malloc", "API malloc feature");
  assertIncludes(api.targets.map((target) => target.name), "peek_refresh", "API peek refresh bench");
  assertIncludes(api.riskPosture, "alpha/test-grade", "API alpha risk");

  const nockapp = findCrate(body, "nockapp");
  assertIncludes(nockapp.features, "pma-assert", "NockApp PMA assert feature");
  assertIncludes(nockapp.targets.map((target) => target.name), "nockapp-chkjam-to-state-jam", "NockApp chkjam helper");
  assertIncludes(nockapp.sourceFocus, "crates/nockapp/src/nockapp/export.rs", "NockApp export source");

  const nockup = findCrate(body, "nockup");
  assertIncludes(nockup.features, "vendored-openssl", "Nockup vendored openssl feature");
  assertIncludes(nockup.sourceFocus, "crates/nockup/src/manifest.rs", "Nockup manifest source");
  assertIncludes(nockup.sourceFocus, "crates/nockup/src/validation.rs", "Nockup validation source");

  const txBuilder = findCrate(body, "wallet-tx-builder");
  assertIncludes(txBuilder.sourceFocus, "crates/wallet-tx-builder/src/planner.rs", "tx planner source");
  assertIncludes(txBuilder.sourceFocus, "crates/wallet-tx-builder/src/determinism.rs", "tx determinism source");

  const libp2p = findCrate(body, "nockchain-libp2p-io");
  assertIncludes(libp2p.sourceFocus, "crates/nockchain-libp2p-io/src/catch_up.rs", "catch-up source");
  assertIncludes(libp2p.sourceFocus, "crates/nockchain-libp2p-io/src/p2p_state.rs", "p2p state source");
  assertIncludes(libp2p.dependencies, "libp2p", "libp2p dependency");

  const nockvm = findCrate(body, "nockvm");
  assertIncludes(nockvm.features, "mmap", "NockVM mmap feature");
  assertIncludes(nockvm.features, "pma-assert", "NockVM pma assert feature");
  assertIncludes(nockvm.targets.map((target) => target.name), "pma_growth", "NockVM PMA growth bench");

  assertEqual(body.dependencyRiskMatrix.families.length, 6, "dependency risk family count");
  assertDependencyFamily(
    body,
    "libp2p-sync",
    "libp2p",
    "fakenetEvidence",
    "peerCount",
    "cargo check -p nockchain-libp2p-io"
  );
  assertDependencyFamily(
    body,
    "wallet-transaction",
    "wallet-tx-builder",
    "balanceEvidence",
    "walletAddress",
    "cargo check -p wallet-tx-builder"
  );
  assertDependencyFamily(
    body,
    "nockapp-pma",
    "nockapp",
    "nockappEvidence",
    "stateJamFingerprint",
    "cargo check -p nockapp"
  );
  assertDependencyFamily(
    body,
    "bridge-settlement",
    "bridge",
    "nockchainBridgeTrace",
    "settlementMode",
    "cargo check -p bridge"
  );
  assertDependencyFamily(
    body,
    "zk-proof-compute",
    "zkvm-jetpack",
    "computeBenchmarks",
    "verificationStatus",
    "cargo check -p zkvm-jetpack"
  );
  assertDependencyFamily(
    body,
    "noun-serialization",
    "noun-serde",
    "receiptVerifiers",
    "manifestSha256",
    "cargo check -p noun-serde"
  );
  assertIncludes(
    body.dependencyRiskMatrix.highestRiskFamilyIds,
    "libp2p-sync",
    "dependency matrix highlights sync risk"
  );
  assertIncludes(
    body.dependencyRiskMatrix.highestRiskFamilyIds,
    "nockapp-pma",
    "dependency matrix highlights PMA risk"
  );
  assertIncludes(
    body.dependencyRiskMatrix.forbiddenFields,
    "rawEventLog",
    "dependency matrix forbids raw event logs"
  );
  assertIncludes(
    body.dependencyRiskMatrix.reviewTriggers,
    "Any crate manifest drift in npm run check:nockchain-cargo-manifests-drift -- --json",
    "dependency matrix ties to manifest drift check"
  );

  assertIncludes(body.targetSummary.binaryCrates, "nockchain", "binary summary includes nockchain");
  assertIncludes(body.targetSummary.binaryCrates, "nockchain-wallet", "binary summary includes wallet");
  assertIncludes(body.targetSummary.libraryCrates, "wallet-tx-builder", "library summary includes tx builder");
  assertIncludes(body.targetSummary.benchmarkTargets, "pma_growth", "benchmark summary includes PMA growth");

  assertIncludes(body.verificationMatrix.requiredCommands, "cargo check -p nockchain", "verification nockchain check");
  assertIncludes(body.verificationMatrix.requiredCommands, "cargo check -p nockchain-wallet", "verification wallet check");
  assertIncludes(body.verificationMatrix.requiredCommands, "cargo check -p nockapp", "verification NockApp check");
  assertIncludes(body.verificationMatrix.requiredCommands, "cargo check -p nockchain-libp2p-io", "verification libp2p check");
  assertIncludes(body.verificationMatrix.availableTooling, "cargo 1.96.0", "local cargo availability");
  assertIncludes(
    body.verificationMatrix.localLimitations,
    "$HOME/.cargo/bin must be present on PATH for cargo metadata and crate checks",
    "local cargo PATH caution"
  );
  assertIncludes(body.evidenceContract.requiredFields, "manifestPath", "contract manifest path");
  assertIncludes(body.evidenceContract.requiredFields, "targetKind", "contract target kind");
  assertIncludes(body.evidenceContract.requiredFields, "sourceFocus", "contract source focus");
  assertIncludes(body.evidenceContract.forbiddenFields, "rawPmaSlab", "contract forbids raw PMA");
  assertIncludes(body.evidenceContract.forbiddenFields, "walletSeedPhrase", "contract forbids seed");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/cargo-surface", "page link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust atlas link");
  assertEqual(body.links.knowledgeSpine, "https://nocksperimental.com/api/nockchain/knowledge-spine", "knowledge spine link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-cargo-surface",
    "/api/nockchain/cargo-surface",
    "Nockchain Cargo manifest and target surface"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainCargoSurface,
    "https://nocksperimental.com/api/nockchain/cargo-surface",
    "well-known cargo surface link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-cargo-surface", "cargo surface capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/cargo-surface"]?.get?.summary,
    "Nockchain Cargo manifest and target surface",
    "OpenAPI cargo surface path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainCargoSurfaceCrates, 9, "checkpoint cargo crate count");
  assertGreaterThan(checkpointBody.counts.nockchainCargoSurfaceTargets, 10, "checkpoint cargo target count");
  assertStartsWith(checkpointBody.roots.nockchainCargoSurface, "sha256:", "checkpoint cargo root");
  assertEqual(checkpointBody.checks.nockchainCargoSurfaceAvailable, true, "checkpoint cargo check");
  assertEqual(
    checkpointBody.checks.nockchainCargoDependencyRiskMatrixAvailable,
    true,
    "checkpoint dependency risk matrix check"
  );
  assertEqual(
    checkpointBody.nockchainCargoSurface.dependencyRiskFamilyCount,
    6,
    "checkpoint dependency risk count"
  );
  assertIncludes(
    checkpointBody.nockchainCargoSurface.dependencyRiskFamilyIds,
    "wallet-transaction",
    "checkpoint dependency risk family IDs"
  );
  assertIncludes(checkpointBody.nockchainCargoSurface.binaryCrates, "nockchain-wallet", "checkpoint wallet binary");
  assertIncludes(checkpointBody.nockchainCargoSurface.forbiddenFields, "walletSeedPhrase", "checkpoint forbidden seed");
  assertEqual(
    checkpointBody.links.nockchainCargoSurface,
    "https://nocksperimental.com/api/nockchain/cargo-surface",
    "checkpoint cargo surface link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-cargo-surface-api"],
    "node scripts/test-nockchain-cargo-surface-api.mjs",
    "package cargo surface API test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-cargo-surface-api", "full test includes cargo surface API");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/cargo-surface", "Cloudflare smoke includes cargo surface API");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Cargo Surface", "README documents cargo surface");
  assertIncludes(readme, "/api/nockchain/cargo-surface", "README documents cargo surface API");
}

function assertCrate(body, name, manifestPath, targetKind, sourcePath, primaryCheck) {
  const crate = findCrate(body, name);

  assertEqual(crate.manifestPath, manifestPath, `${name} manifest path`);
  assertIncludes(crate.targets.map((target) => target.kind), targetKind, `${name} target kind`);
  assertIncludes(crate.targets.map((target) => target.source), sourcePath, `${name} source target`);
  assertEqual(crate.primaryCheck, primaryCheck, `${name} primary check`);
}

function findCrate(body, name) {
  const crate = body.crates.find((candidate) => candidate.name === name);

  if (!crate) {
    throw new Error(`Missing crate: ${name}`);
  }

  return crate;
}

function assertDependencyFamily(body, id, dependency, targetSurface, receiptField, command) {
  const family = body.dependencyRiskMatrix.families.find((candidate) => candidate.id === id);

  if (!family) {
    throw new Error(`Missing dependency risk family: ${id}`);
  }

  assertIncludes(family.dependencyNames, dependency, `${id} dependency`);
  assertIncludes(family.targetSurfaces, targetSurface, `${id} target surface`);
  assertIncludes(family.receiptFields, receiptField, `${id} receipt field`);
  assertIncludes(family.verificationCommands, command, `${id} verification command`);
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

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertEndpoint(registryBody, id, pathValue, description) {
  const endpoint = registryBody.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathValue, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathValue}`, `${id} URL`);
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

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
