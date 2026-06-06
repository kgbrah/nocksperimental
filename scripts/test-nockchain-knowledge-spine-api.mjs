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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/knowledge-spine/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "knowledge spine status");
  assertEqual(body.version, "v0", "knowledge spine version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/knowledge-spine",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertEqual(body.documentFingerprints.length, 8, "document fingerprint count");
  assertDocHash(
    body,
    "START_HERE.md",
    "tier0",
    "61f86959050831147bebb6f350be297d7a0f2f68d476c8bfac15928efebd71aa"
  );
  assertDocHash(
    body,
    "PROTOCOL.md",
    "tier0",
    "b6da66218a7faf7b5e5aafaff32f717d14881255678f351160cc96f6fba922fb"
  );
  assertDocHash(
    body,
    "ARCHITECTURE.md",
    "tier0",
    "5a810f14ea035279417e61c91806ee4401b997bdcb799ad12e25a94f23e28bde"
  );
  assertDocHash(
    body,
    "WORKFLOWS.md",
    "tier0",
    "3bc7afe118415760a9e91100b9a9025e240d7d9a353b98ab829df0376b38aa21"
  );
  assertDocHash(
    body,
    "DECISIONS/README.md",
    "tier0",
    "8f71f573a21af6823736155df6b189aeb31875f1b622e70c2ed4ee595f516dcf"
  );
  assertDocHash(
    body,
    "crates/nockapp/README.md",
    "tier1",
    "ae4d3949cae8823ef8cff9724b789099b19a3365f0e294c60bf98dc9bf2e6472"
  );
  assertDocHash(
    body,
    "crates/nockchain-api/README.md",
    "tier1",
    "b51e19065c20359e19c5a338debba9f468d7d4847ad01e908d6bb43f2007e5c6"
  );
  assertDocHash(
    body,
    "crates/nockchain-wallet/README.md",
    "tier1",
    "d069f43e7eaad0631f78c1c3e51b68984e6a89f6182d287258225ef806e350c1"
  );

  assertEqual(body.authorityReadOrder[0], "START_HERE.md", "read order starts with START_HERE");
  assertIncludes(body.authorityReadOrder, "PROTOCOL.md", "read order includes protocol");
  assertIncludes(body.authorityReadOrder, "crates/nockchain-wallet/README.md", "read order includes wallet");

  assertEqual(body.workspaceManifest.language, "Rust", "workspace language");
  assertEqual(body.workspaceManifest.resolver, "2", "workspace resolver");
  assertEqual(body.workspaceManifest.memberCount, 36, "workspace member count");
  assertStartsWith(body.workspaceManifest.workspaceMemberHash, "sha256:", "workspace member hash");
  assertIncludes(body.workspaceManifest.members, "crates/nockchain", "workspace includes nockchain");
  assertIncludes(body.workspaceManifest.members, "crates/nockchain-wallet", "workspace includes wallet");
  assertIncludes(body.workspaceManifest.members, "crates/nockchain-bridge-sequencer", "workspace includes bridge sequencer");

  assertCoverage(body, "protocol-authority", "/nockchain/protocol", "nockchainProtocolTrace");
  assertCoverage(body, "rust-workspace", "/nockchain/rust", "nockchainRustAtlas");
  assertCoverage(body, "nockapp-runtime", "/nockchain/nockapp", "nockchainNockAppAtlas");
  assertCoverage(body, "wallet-api", "/nockchain/wallet", "nockchainWalletAtlas");
  assertCoverage(body, "zorp-source-monitor", "/nockchain/zorp", "zorpUpstream");
  assertCoverage(body, "pull-request-radar", "/nockchain/pr-radar", "nockchainPrRadar");
  assertCoverage(body, "state-artifacts", "/nockchain/state-jams", "stateJamRegistry");

  assertIncludes(body.monitoringContract.requiredEvidence, "documentFingerprints", "requires doc fingerprints");
  assertIncludes(body.monitoringContract.requiredEvidence, "workspaceMemberHash", "requires workspace hash");
  assertIncludes(body.monitoringContract.requiredEvidence, "canonicalCommit", "requires canonical commit");
  assertIncludes(body.monitoringContract.requiredEvidence, "zorpOrgScan", "requires Zorp scan");
  assertIncludes(body.monitoringContract.forbiddenFields, "rawPmaSlab", "forbids raw PMA");
  assertIncludes(body.monitoringContract.forbiddenFields, "rawStateJam", "forbids raw state jam");
  assertIncludes(body.monitoringContract.forbiddenFields, "walletSeedPhrase", "forbids wallet seed");
  assertEqual(
    body.driftCheck.command,
    "npm run check:nockchain-docs-drift -- --json",
    "docs drift command"
  );
  assertEqual(
    body.driftCheck.testCommand,
    "npm run test:nockchain-docs-drift-check",
    "docs drift test command"
  );
  assertIncludes(body.driftCheck.compareFields, "sha256", "docs drift compares hashes");
  assertIncludes(body.driftCheck.documentPaths, "START_HERE.md", "docs drift path list");
  assertIncludes(
    body.driftCheck.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md",
    "docs drift START_HERE source URL"
  );

  assertIncludes(body.expertiseLadder.map((entry) => entry.id), "orientation", "orientation ladder");
  assertIncludes(body.expertiseLadder.map((entry) => entry.id), "rust-implementation", "Rust ladder");
  assertIncludes(body.expertiseLadder.map((entry) => entry.id), "operations", "operations ladder");
  assertIncludes(body.expertiseLadder.map((entry) => entry.id), "evidence-authoring", "evidence ladder");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/knowledge-spine", "page link");
  assertEqual(body.links.docsAtlas, "https://nocksperimental.com/api/nockchain/docs-atlas", "docs atlas link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust atlas link");
  assertEqual(body.links.zorp, "https://nocksperimental.com/api/nockchain/zorp", "Zorp link");
  assertEqual(body.links.prRadar, "https://nocksperimental.com/api/nockchain/pr-radar", "PR radar link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-knowledge-spine",
    "/api/nockchain/knowledge-spine",
    "Nockchain knowledge spine integrity map"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainKnowledgeSpine,
    "https://nocksperimental.com/api/nockchain/knowledge-spine",
    "well-known knowledge spine link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-knowledge-spine", "knowledge spine capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/knowledge-spine"]?.get?.summary,
    "Nockchain knowledge spine integrity map",
    "OpenAPI knowledge spine path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainKnowledgeDocuments, 8, "checkpoint document count");
  assertEqual(checkpointBody.counts.nockchainKnowledgeCoverageDomains, 8, "checkpoint coverage count");
  assertStartsWith(checkpointBody.roots.nockchainKnowledgeSpine, "sha256:", "checkpoint spine root");
  assertEqual(checkpointBody.checks.nockchainKnowledgeSpineAvailable, true, "checkpoint spine check");
  assertEqual(
    checkpointBody.nockchainKnowledgeSpine.workspaceMemberCount,
    36,
    "checkpoint workspace member count"
  );
  assertIncludes(
    checkpointBody.nockchainKnowledgeSpine.forbiddenFields,
    "walletSeedPhrase",
    "checkpoint forbidden seed"
  );
  assertEqual(
    checkpointBody.nockchainKnowledgeSpine.driftCheck.command,
    "npm run check:nockchain-docs-drift -- --json",
    "checkpoint docs drift command"
  );
  assertIncludes(
    checkpointBody.nockchainKnowledgeSpine.driftCheck.compareFields,
    "sha256",
    "checkpoint docs drift hash field"
  );
  assertIncludes(
    checkpointBody.nockchainKnowledgeSpine.driftCheck.documentPaths,
    "START_HERE.md",
    "checkpoint docs drift document path"
  );
  assertEqual(
    checkpointBody.links.nockchainKnowledgeSpine,
    "https://nocksperimental.com/api/nockchain/knowledge-spine",
    "checkpoint knowledge spine link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-knowledge-spine-api"],
    "node scripts/test-nockchain-knowledge-spine-api.mjs",
    "package knowledge spine API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-knowledge-spine-api",
    "full test includes knowledge spine API"
  );
  assertEqual(
    packageJson.scripts["check:nockchain-docs-drift"],
    "node scripts/check-nockchain-docs-drift.mjs",
    "package docs drift check script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-docs-drift-check",
    "full test includes docs drift check"
  );

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/knowledge-spine", "Cloudflare smoke includes knowledge spine API");

  const page = readText("src/app/nockchain/knowledge-spine/page.tsx");
  assertIncludes(page, "Drift Check", "page renders docs drift check");
  assertIncludes(page, "npm run check:nockchain-docs-drift -- --json", "page renders docs drift command");
  assertIncludes(
    page,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md",
    "page renders raw START_HERE source"
  );

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Knowledge Spine", "README documents knowledge spine");
  assertIncludes(readme, "/api/nockchain/knowledge-spine", "README documents knowledge spine API");
  assertIncludes(readme, "check:nockchain-docs-drift", "README documents docs drift command");
}

function assertDocHash(body, docPath, tier, sha256) {
  const doc = body.documentFingerprints.find((candidate) => candidate.path === docPath);

  if (!doc) {
    throw new Error(`Missing document fingerprint: ${docPath}`);
  }

  assertEqual(doc.tier, tier, `${docPath} tier`);
  assertEqual(doc.sha256, sha256, `${docPath} sha256`);
  assertEqual(doc.commit, body.upstream.commit.sha, `${docPath} commit`);
  assertStartsWith(doc.url, "https://github.com/nockchain/nockchain/blob/", `${docPath} URL`);
}

function assertCoverage(body, id, pagePath, checkpointSurface) {
  const coverage = body.coverageMatrix.find((entry) => entry.id === id);

  if (!coverage) {
    throw new Error(`Missing coverage entry: ${id}`);
  }

  assertEqual(coverage.pagePath, pagePath, `${id} page path`);
  assertEqual(coverage.checkpointSurface, checkpointSurface, `${id} checkpoint surface`);
  assertEqual(coverage.status, "covered", `${id} coverage status`);
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
