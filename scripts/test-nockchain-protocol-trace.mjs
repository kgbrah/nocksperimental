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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/protocol/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "protocol trace status");
  assertEqual(body.version, "v0", "protocol trace version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/protocol", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(body.upstream.release.tag, "build-33ba97b1e206dd89b15c61b72b7802caf2136c18", "upstream release");

  assertSource(body, "protocol-index", "PROTOCOL.md");
  assertSource(body, "spec-format", "changelog/protocol/SPECIFICATION.md");
  assertSource(body, "nous-013", "changelog/protocol/013-nous.md");
  assertSource(body, "aletheia-014", "changelog/protocol/014-aletheia.md");
  assertSource(body, "status-drift-014", "PROTOCOL.md");

  assertEqual(body.releaseTrack.nextScheduled.sequence, "013", "next scheduled protocol sequence");
  assertEqual(body.releaseTrack.nextScheduled.codename, "Nous", "next scheduled protocol codename");
  assertEqual(body.releaseTrack.nextScheduled.consensusCritical, false, "Nous consensus posture");
  assertEqual(body.releaseTrack.latestConsensusCritical.sequence, "014", "latest consensus protocol sequence");
  assertEqual(body.releaseTrack.latestConsensusCritical.codename, "Aletheia", "latest consensus protocol codename");
  assertEqual(body.releaseTrack.latestConsensusCritical.activationHeight, 65500, "Aletheia activation height");
  assertEqual(body.releaseTrack.latestConsensusCritical.statusDrift, true, "Aletheia status drift");

  assertIncludes(body.lifecycleContract.statuses, "draft", "draft lifecycle");
  assertIncludes(body.lifecycleContract.statuses, "activated", "activated lifecycle");
  assertIncludes(body.lifecycleContract.requiredSections, "Testing and Validation", "testing section");
  assertIncludes(body.receiptFields, "protocolIndexStatus", "index status field");
  assertIncludes(body.receiptFields, "specFrontmatterStatus", "spec status field");
  assertIncludes(body.receiptFields, "networkPartitionRisk", "network partition field");
  assertIncludes(body.operatorChecklist, "Do not flatten 014 Aletheia status until PROTOCOL.md and spec frontmatter agree.", "status drift checklist");
  assertIncludes(body.operatorChecklist, "Treat activation_height = 0 as rollout-gated or historical-gap context, not proof of no upgrade.", "activation zero checklist");
  assertEqual(body.links.docsAtlas, "https://nocksperimental.com/api/nockchain/docs-atlas", "docs atlas link");
  assertEqual(body.links.syncGossipTrace, "https://nocksperimental.com/api/nockchain/sync-gossip", "sync gossip link");
  assertEqual(body.links.zorpMap, "https://nocksperimental.com/api/nockchain/zorp", "zorp map link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-protocol-trace",
    "/api/nockchain/protocol",
    "Nockchain protocol authority trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainProtocolTrace,
    "https://nocksperimental.com/api/nockchain/protocol",
    "well-known protocol link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-protocol-trace", "protocol capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/protocol"]?.get?.summary,
    "Nockchain protocol authority trace",
    "OpenAPI protocol path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainProtocolSources, body.authoritySources.length, "checkpoint source count");
  assertStartsWith(checkpointBody.roots.nockchainProtocolTrace, "sha256:", "checkpoint protocol root");
  assertEqual(checkpointBody.checks.nockchainProtocolTraceAvailable, true, "checkpoint protocol guard");
  assertEqual(
    checkpointBody.links.nockchainProtocolTrace,
    "https://nocksperimental.com/api/nockchain/protocol",
    "checkpoint protocol link"
  );

  const page = readText("src/app/nockchain/protocol/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainProtocolTrace", "protocol page uses trace");
  assertIncludes(page, "Nockchain Protocol", "protocol page title");
  assertIncludes(page, "protocol-index", "page renders protocol index");
  assertIncludes(page, "aletheia-014", "page renders Aletheia source");
  assertIncludes(page, "status-drift-014", "page renders status drift");
  assertIncludes(page, 'href="/api/nockchain/protocol"', "page links API");
  assertIncludes(page, 'href="/nockchain"', "page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/protocol"', "Nockchain page links protocol page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-protocol-trace"],
    "node scripts/test-nockchain-protocol-trace.mjs",
    "package protocol test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-protocol-trace", "full test includes protocol");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/protocol", "Cloudflare smoke includes protocol API");
  assertIncludes(smokeSource, "/nockchain/protocol", "Cloudflare smoke includes protocol page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Protocol Authority Trace", "README documents protocol trace");
  assertIncludes(readme, "/api/nockchain/protocol", "README documents protocol endpoint");
  assertIncludes(readme, "/nockchain/protocol", "README documents protocol page");
}

function assertSource(body, id, pathName) {
  const source = body.authoritySources.find((candidate) => candidate.id === id);

  if (!source) {
    throw new Error(`Missing authority source: ${id}`);
  }

  assertEqual(source.path, pathName, `${id} path`);
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
