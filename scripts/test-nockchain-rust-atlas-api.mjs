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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/rust-atlas/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "rust atlas status");
  assertEqual(body.version, "v0", "rust atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/rust-atlas", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );
  assertEqual(body.workspace.language, "Rust", "workspace language");
  assertEqual(body.workspace.resolver, "2", "workspace resolver");
  assertEqual(body.workspace.memberCount, 36, "workspace member count");
  assertEqual(body.workspace.coverage.trackedWorkspaceMemberCount, 36, "tracked workspace member count");
  assertEqual(body.workspace.coverage.missingWorkspaceMembers.length, 0, "missing workspace member count");
  assertIncludes(
    body.workspace.coverage.trackedWorkspaceMembers,
    "crates/wallet-tx-builder",
    "workspace coverage includes wallet-tx-builder"
  );
  assertIncludes(
    body.workspace.coverage.trackedWorkspaceMembers,
    "crates/nockchain-bridge-sequencer",
    "workspace coverage includes bridge sequencer"
  );
  assertIncludes(
    body.workspace.coverage.trackedWorkspaceMembers,
    "crates/kernels/wallet",
    "workspace coverage includes wallet kernel"
  );
  assertIncludes(
    body.workspace.coverage.nonWorkspaceTrackedCrates,
    "crates/chaff",
    "workspace coverage preserves chaff lineage"
  );
  assertIncludes(body.workspace.validationGates, "cargo check -p nockchain", "nockchain check gate");
  assertIncludes(body.workspace.validationGates, "cargo check -p nockapp", "nockapp check gate");
  assertIncludes(body.workspace.validationGates, "cargo check -p nockchain-wallet", "wallet check gate");
  assertIncludes(
    body.workspace.validationGates,
    "cargo clippy --all-targets -- -Dclippy::unwrap_used -Aclippy::missing_safety_doc",
    "clippy gate"
  );

  assertGroup(body, "chain-runtime", ["nockchain", "nockchain-libp2p-io", "nockchain-testkit", "nockchain-math"]);
  assertGroup(body, "nockapp-runtime", ["nockapp", "nockvm/rust/nockvm", "nockapp-grpc", "nockapp-grpc-proto"]);
  assertGroup(body, "operator-tools", ["nockchain-wallet", "nockchain-api", "nockchain-peek", "wallet-tx-builder", "raw-tx-checker"]);
  assertGroup(body, "hoon-and-scaffolding", ["hoon", "hoonc", "nockup", "kernels", "kernels-open-wallet"]);
  assertGroup(body, "bridge-and-proof", ["bridge", "bridge-dev", "nockchain-bridge-sequencer", "zkvm-jetpack", "equix-latency"]);
  assertGroup(body, "serialization-support", ["noun-serde", "noun-serde-derive", "habit", "chaff"]);

  assertCrate(body, "nockchain", "chain-runtime", "fakenet receipts");
  assertCrate(body, "nockchain-libp2p-io", "chain-runtime", "peer");
  assertCrate(body, "nockapp", "nockapp-runtime", "poke");
  assertCrate(body, "nockchain-wallet", "operator-tools", "wallet");
  assertCrate(body, "nockchain-api", "operator-tools", "alpha/test-grade");
  assertCrate(body, "nockup", "hoon-and-scaffolding", "build/run receipts");
  assertCrate(body, "wallet-tx-builder", "operator-tools", "withdrawal");
  assertCrate(body, "nockchain-bridge-sequencer", "bridge-and-proof", "sequencer");
  assertCrate(body, "bridge-dev", "bridge-and-proof", "bridge fixture scenarios");
  assertCrate(body, "raw-tx-checker", "operator-tools", "raw transaction");
  assertCrate(body, "nockchain-math", "chain-runtime", "finite-field");
  assertCrate(body, "nockapp-grpc-proto", "nockapp-runtime", "protobuf");

  assertIncludes(
    body.watchThemes,
    "#127 bridge: add end-to-end withdrawal execution",
    "merged bridge withdrawal watch signal"
  );
  assertIncludes(body.watchThemes, "#125 fix(nockup): harden templates and run UX", "nockup watch PR");
  assertIncludes(body.watchThemes, "#116 wallet blobs and memo support", "wallet watch PR");
  assertIncludes(
    body.nocksperimentalNextUses,
    "Use bridge-dev scenarios as implementation fixtures for bridge withdrawal tests before promoting settlement checks into public receipts.",
    "bridge-dev next use"
  );
  assertEqual(body.links.upstream, "https://nocksperimental.com/api/nockchain/upstream", "upstream link");
  assertEqual(body.links.stateJams, "https://nocksperimental.com/api/nockchain/state-jams", "state-jams link");
  assertEqual(body.links.repository, "https://github.com/nockchain/nockchain", "repository link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-rust-atlas",
    "/api/nockchain/rust-atlas",
    "Nockchain Rust workspace atlas"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainRustAtlas,
    "https://nocksperimental.com/api/nockchain/rust-atlas",
    "well-known rust atlas link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-rust-workspace-atlas", "rust atlas capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/rust-atlas"]?.get?.summary,
    "Nockchain Rust workspace atlas",
    "OpenAPI rust atlas path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainRustCrates, 10, "checkpoint rust crate count");
  assertEqual(checkpointBody.counts.nockchainRustWorkspaceMembers, 36, "checkpoint rust workspace member count");
  assertStartsWith(checkpointBody.roots.nockchainRustAtlas, "sha256:", "checkpoint rust atlas root");
  assertEqual(
    checkpointBody.nockchainRustAtlas.missingWorkspaceMembers.length,
    0,
    "checkpoint missing rust workspace members"
  );
  assertEqual(
    checkpointBody.checks.nockchainRustWorkspaceCovered,
    true,
    "checkpoint rust workspace coverage"
  );
  assertEqual(
    checkpointBody.links.nockchainRustAtlas,
    "https://nocksperimental.com/api/nockchain/rust-atlas",
    "checkpoint rust atlas link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-rust-atlas-api"],
    "node scripts/test-nockchain-rust-atlas-api.mjs",
    "package rust atlas test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-rust-atlas-api", "full test includes rust atlas test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/rust-atlas", "Cloudflare smoke includes rust atlas API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Rust Workspace Atlas", "README documents Rust atlas");
  assertIncludes(readme, "36 upstream workspace members", "README documents Rust workspace coverage");
  assertIncludes(readme, "/api/nockchain/rust-atlas", "README documents Rust atlas endpoint");
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

function assertGroup(body, id, crates) {
  const group = body.groups.find((candidate) => candidate.id === id);

  if (!group) {
    throw new Error(`Missing Rust atlas group: ${id}`);
  }

  for (const crateName of crates) {
    assertIncludes(group.crates, crateName, `${id} includes ${crateName}`);
  }
}

function assertCrate(body, crateName, groupId, expectedText) {
  const item = body.crates.find((candidate) => candidate.name === crateName);

  if (!item) {
    throw new Error(`Missing Rust atlas crate: ${crateName}`);
  }

  assertEqual(item.group, groupId, `${crateName} group`);
  assertIncludes(
    [item.role, item.nocksperimentalUse, item.riskPosture, item.primaryCheck].filter(Boolean).join("\n"),
    expectedText,
    `${crateName} expected text`
  );
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
