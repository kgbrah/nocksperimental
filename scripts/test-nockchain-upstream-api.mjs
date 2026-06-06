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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/upstream/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "upstream status");
  assertEqual(body.version, "v0", "upstream version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/upstream", "canonical URL");
  assertEqual(body.repository.fullName, "nockchain/nockchain", "repository name");
  assertEqual(body.repository.defaultBranch, "master", "repository default branch");
  assertEqual(body.latestCommit.shortSha, "33ba97b1e206", "latest commit short sha");
  assertIncludes(body.latestCommit.message, "bridge", "latest commit message");
  assertEqual(
    body.latestRelease.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "latest release tag"
  );
  assertEqual(body.latestRelease.publishedAt, "2026-06-06T00:17:53Z", "latest release published timestamp");
  assertEqual(body.docs.canonicalSpine[0].path, "START_HERE.md", "canonical docs start");
  assertIncludes(
    body.docs.policy,
    "Tier 0 overrides Tier 1",
    "docs authority policy"
  );
  assertEqual(body.protocol.currentTrack.next.codename, "Nous", "protocol next codename");
  assertEqual(body.protocol.currentTrack.draft.codename, "Aletheia", "protocol draft codename");
  assertIncludes(body.workspace.crateGroups.chainRuntime, "nockchain", "chain runtime crate");
  assertIncludes(body.workspace.crateGroups.nockAppRuntime, "nockapp", "nockapp crate");
  assertIncludes(body.workspace.crateGroups.operatorTools, "nockchain-wallet", "wallet crate");
  assertIncludes(body.workspace.crateGroups.bridgeAndProof, "bridge-dev", "bridge dev crate");
  assertIncludes(
    body.workspace.crateGroups.bridgeAndProof,
    "nockchain-bridge-sequencer",
    "bridge sequencer crate"
  );
  assertIncludes(body.operationalScripts.fakenet, "scripts/run_nockchain_node_fakenet.sh", "fakenet node script");
  assertIncludes(body.operationalScripts.fakenet, "scripts/run_nockchain_miner_fakenet.sh", "fakenet miner script");
  assertIncludes(body.watchItems, "libp2p/sync behavior while behind tip", "sync watch item");
  assertIncludes(
    body.watchItems,
    "bridge withdrawal execution and sequencer journal persistence",
    "bridge watch item"
  );
  assertIncludes(body.nocksperimentalImplications.receiptFields, "nockchainBuild", "receipt build implication");
  assertIncludes(
    body.nocksperimentalImplications.receiptFields,
    "sequencerAuthorizationState",
    "bridge receipt implication"
  );
  assertIncludes(body.safety.stateArtifacts.doNotStore, "raw PMA slabs", "state safety");
  assertEqual(body.links.repository, "https://github.com/nockchain/nockchain", "repository link");
  assertEqual(body.links.research, "https://nocksperimental.com/docs/research/nockchain-rust-architecture.md", "research link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "nockchain-upstream", "/api/nockchain/upstream", "Nockchain upstream intelligence");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainUpstream,
    "https://nocksperimental.com/api/nockchain/upstream",
    "well-known nockchain upstream link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-upstream-intelligence", "nockchain capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/upstream"]?.get?.summary,
    "Nockchain upstream intelligence",
    "OpenAPI Nockchain upstream path"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-upstream-api"],
    "node scripts/test-nockchain-upstream-api.mjs",
    "package Nockchain upstream test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-upstream-api", "full test includes Nockchain upstream test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/upstream", "Cloudflare smoke includes Nockchain upstream API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Upstream Intelligence", "README documents Nockchain upstream intelligence");
  assertIncludes(readme, "/api/nockchain/upstream", "README documents Nockchain upstream endpoint");
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
