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
  const { GET } = loadTypeScriptModule("src/app/api/trust/feed/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "feed status code");
  assertEqual(body.version, "v0", "feed version");
  assertEqual(body.source, "nocksperimental-trust-feed", "feed source");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/trust/feed", "feed canonical URL");
  assertEqual(body.counts.registryUpdates, 5, "registry update count");
  assertEqual(body.counts.badgeIssuances, 11, "badge issuance count");
  assertEqual(body.counts.badgeRevocations, 1, "badge revocation count");
  assertEqual(body.counts.localFakenetEvidence, 1, "local fakenet evidence count");
  assertEqual(body.eventCount, body.events.length, "event count matches events");
  assertEqual(body.eventCount, 18, "total event count");
  assertNonEmpty(body.chain.latestRoot, "latest root");
  assertEqual(body.chain.isAppendOnly, true, "append-only chain flag");
  assertHasEventType(body, "registry-update");
  assertHasEventType(body, "badge-issuance");
  assertHasEventType(body, "badge-revocation");
  assertHasEventType(body, "local-fakenet-evidence");
  assertSortedDescending(body.events.map((event) => event.recordedAt), "feed event ordering");
  assertEqual(body.events[0].url.startsWith("https://nocksperimental.com/"), true, "event URL");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  const feedEndpoint = registryBody.endpoints.find((endpoint) => endpoint.id === "trust-feed");

  assertEqual(feedEndpoint?.url, "https://nocksperimental.com/api/trust/feed", "registry feed endpoint URL");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(wellKnownBody.links.trustFeed, "https://nocksperimental.com/api/trust/feed", "well-known feed link");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(openApiBody.paths["/api/trust/feed"]?.get?.summary, "Chronological trust registry event feed", "OpenAPI feed path");
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

function assertHasEventType(body, type) {
  if (!body.events.some((event) => event.type === type)) {
    throw new Error(`expected trust feed to include ${type}`);
  }
}

function assertSortedDescending(values, label) {
  const sorted = [...values].sort((left, right) => right.localeCompare(left));

  assertEqual(values.join("|"), sorted.join("|"), label);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNonEmpty(actual, label) {
  if (typeof actual !== "string" || actual.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(actual)}`);
  }
}
