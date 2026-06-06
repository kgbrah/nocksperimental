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
  const { GET } = loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "checkpoint status code");
  assertEqual(body.version, "v0", "checkpoint version");
  assertEqual(body.service, "nocksperimental", "checkpoint service");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/registry/checkpoint", "canonical URL");
  assertEqual(body.subject, "nocksperimental.com", "checkpoint subject");
  assertGreaterThan(body.counts.badges, 0, "badge count");
  assertGreaterThan(body.counts.publicBadgeEmbeds, 0, "public badge embed count");
  assertGreaterThan(body.counts.generatedReports, 0, "generated report count");
  assertGreaterThan(body.counts.localFakenetReports, 0, "local fakenet report count");
  assertEqual(body.counts.nockchainOpenPullRequests, 35, "Nockchain open PR count");
  assertEqual(body.counts.nockchainOpenIssues, 0, "Nockchain open issue count");
  assertEqual(body.counts.zorpMonitorReviewClasses, 5, "Zorp monitor review class count");
  assertGreaterThan(body.counts.trustUpdates, 0, "trust update count");
  assertEqual(body.checks.appendOnlyTrustUpdates, true, "append-only trust updates");
  assertEqual(body.checks.validTrustUpdateSignatures, true, "valid trust update signatures");
  assertEqual(body.checks.generatedReportsAvailable, true, "generated reports available");
  assertEqual(body.checks.localFakenetEvidenceAvailable, true, "local fakenet evidence available");
  assertEqual(body.checks.publicBadgesAvailable, true, "public badges available");
  assertEqual(
    body.checks.zorpMonitorReviewContractAvailable,
    true,
    "Zorp monitor review contract available"
  );
  assertStartsWith(body.roots.trustSignals, "sha256:", "trust signal root");
  assertStartsWith(body.roots.generatedReports, "sha256:", "generated reports root");
  assertStartsWith(body.roots.localFakenetEvidence, "sha256:", "local fakenet evidence root");
  assertStartsWith(body.roots.checkpoint, "sha256:", "checkpoint root");
  assertEqual(body.roots.trustUpdates, body.chain.latestRoot, "trust update root");
  assertEqual(body.chain.entryCount, body.counts.trustUpdates, "trust update entry count");
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");
  assertEqual(body.links.openApi, "https://nocksperimental.com/openapi.json", "OpenAPI link");
  assertEqual(body.links.trustFeed, "https://nocksperimental.com/api/trust/feed", "trust feed link");
  assertEqual(body.links.generatedReports, "https://nocksperimental.com/api/reports/generated", "generated reports link");
  assertEqual(body.links.fakenetEvidence, "https://nocksperimental.com/api/fakenet/evidence", "fakenet evidence link");
  assertEqual(
    body.links.fakenetEvidenceVerifier,
    "https://nocksperimental.com/api/fakenet/evidence/verify",
    "fakenet evidence verifier link"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  const checkpointEndpoint = registryBody.endpoints.find((endpoint) => endpoint.id === "registry-checkpoint");

  assertEqual(checkpointEndpoint?.path, "/api/registry/checkpoint", "registry checkpoint endpoint path");
  assertEqual(checkpointEndpoint?.url, "https://nocksperimental.com/api/registry/checkpoint", "registry checkpoint endpoint URL");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/registry/checkpoint"]?.get?.summary,
    "Registry integrity checkpoint",
    "OpenAPI checkpoint path"
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
