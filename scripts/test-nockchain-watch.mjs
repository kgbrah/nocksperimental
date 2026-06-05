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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/watch/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "watch status");
  assertEqual(body.version, "v0", "watch version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/watch", "canonical URL");
  assertEqual(body.status, "in-sync", "watch drift status");
  assertEqual(body.pinned.nockchain.commit.shortSha, "5d022ced5504", "pinned commit");
  assertEqual(body.observed.nockchain.commit.shortSha, "5d022ced5504", "observed commit");
  assertEqual(
    body.observed.nockchain.release.tag,
    "build-5d022ced55040221e8b6fcfd78114189fbae91a0",
    "observed release"
  );
  assertEqual(body.drift.commitMatchesPinned, true, "commit drift");
  assertEqual(body.drift.releaseMatchesPinned, true, "release drift");
  assertEqual(body.drift.zorpStateJamFolderClassified, true, "state-jam folder classification");
  assertIncludes(body.drift.requiredReviewSignals, "zorp-corp/nockapp archived repo updated metadata", "nockapp review signal");

  assertSource(body, "github-nockchain-commit", "https://api.github.com/repos/nockchain/nockchain/commits/master");
  assertSource(body, "github-nockchain-release", "https://api.github.com/repos/nockchain/nockchain/releases/latest");
  assertSource(body, "github-zorp-repos", "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated");
  assertSource(body, "zorp-state-jam-drive", "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw");

  assertWatchItem(body, "libp2p-behind-tip-gossip", "fakenet-mining", "high");
  assertWatchItem(body, "state-jam-drive-inventory", "state-artifacts", "high");
  assertWatchItem(body, "zorp-nockapp-archived-update", "zorp-lineage", "medium");
  assertWatchItem(body, "jock-lang-authoring", "fixture-authoring", "medium");
  assertWatchItem(body, "wallet-api-command-drift", "wallet-api", "medium");
  assertWatchItem(body, "rust-workspace-drift", "rust-workspace", "medium");

  assertIncludes(body.operatorChecklist, "Compare live GitHub commit and release against the pinned Nocksperimental upstream snapshot before interpreting fakenet failures.", "drift checklist");
  assertIncludes(body.operatorChecklist, "Treat zorp-corp/nockapp metadata changes as lineage review until a non-archived canonical repo changes.", "nockapp checklist");
  assertIncludes(body.operatorChecklist, "Inventory the Zorp state-jam Drive folder as metadata only before trusting bootstrap artifacts.", "state-jam checklist");

  assertEqual(body.monitor.interval, "FREQ=HOURLY;INTERVAL=6", "monitor cadence");
  assertIncludes(body.monitor.watchedSources, "https://github.com/zorp-corp", "Zorp monitor source");
  assertIncludes(body.monitor.watchedSources, "https://github.com/nockchain/nockchain", "Nockchain monitor source");
  assertIncludes(body.monitor.watchedSources, body.sources.find((source) => source.id === "zorp-state-jam-drive").url, "Drive monitor source");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "nockchain-watch", "/api/nockchain/watch", "Nockchain upstream watch board");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainWatch,
    "https://nocksperimental.com/api/nockchain/watch",
    "well-known watch link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-upstream-watch", "watch capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/watch"]?.get?.summary,
    "Nockchain upstream watch board",
    "OpenAPI watch path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainWatchItems, body.watchQueue.length, "checkpoint watch count");
  assertStartsWith(checkpointBody.roots.nockchainWatch, "sha256:", "checkpoint watch root");
  assertEqual(checkpointBody.checks.nockchainWatchInSync, true, "checkpoint watch in sync");
  assertEqual(
    checkpointBody.links.nockchainWatch,
    "https://nocksperimental.com/api/nockchain/watch",
    "checkpoint watch link"
  );

  const page = readText("src/app/nockchain/watch/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainWatchBoard", "watch page uses board");
  assertIncludes(page, "Nockchain Watch", "watch page title");
  assertIncludes(page, "libp2p-behind-tip-gossip", "watch page renders libp2p item");
  assertIncludes(page, "state-jam-drive-inventory", "watch page renders state-jam item");
  assertIncludes(page, "zorp-nockapp-archived-update", "watch page renders Zorp nockapp item");
  assertIncludes(page, 'href="/api/nockchain/watch"', "watch page links API");
  assertIncludes(page, 'href="/nockchain"', "watch page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/watch"', "Nockchain page links watch page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-watch"],
    "node scripts/test-nockchain-watch.mjs",
    "package watch test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-watch", "full test includes watch test");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/watch", "Cloudflare smoke includes watch API");
  assertIncludes(smokeSource, "/nockchain/watch", "Cloudflare smoke includes watch page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Upstream Watch", "README documents watch board");
  assertIncludes(readme, "/api/nockchain/watch", "README documents watch endpoint");
  assertIncludes(readme, "/nockchain/watch", "README documents watch page");
}

function assertSource(body, id, url) {
  const source = body.sources.find((candidate) => candidate.id === id);

  if (!source) {
    throw new Error(`Missing source: ${id}`);
  }

  assertEqual(source.url, url, `${id} URL`);
}

function assertWatchItem(body, id, domain, severity) {
  const item = body.watchQueue.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Missing watch item: ${id}`);
  }

  assertEqual(item.domain, domain, `${id} domain`);
  assertEqual(item.severity, severity, `${id} severity`);
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

function assertStartsWith(value, prefix, label) {
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to start with ${JSON.stringify(prefix)}`);
  }
}
