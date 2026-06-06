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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/state-jams/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "state-jams status");
  assertEqual(body.version, "v0", "state-jams version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/state-jams", "canonical URL");
  assertEqual(body.policy.mode, "metadata-only", "metadata-only policy");
  assertEqual(body.policy.rawArtifactStorage, "forbidden", "raw artifact storage policy");
  assertIncludes(body.policy.doNotStore, "raw PMA slabs", "PMA slabs are not stored");
  assertIncludes(body.policy.doNotStore, "state jams", "state jams are not stored");
  assertIncludes(body.requiredMetadata, "source URL or Drive folder id", "source metadata requirement");
  assertIncludes(body.requiredMetadata, "hash", "hash metadata requirement");
  assertIncludes(body.requiredMetadata, "checkpoint height or event boundary", "height metadata requirement");
  assertIncludes(body.requiredMetadata, "Nockchain build or commit", "build metadata requirement");

  const zorpSource = body.sources.find((source) => source.id === "zorp-state-jam-drive");
  assertEqual(zorpSource?.kind, "google-drive-folder", "Zorp state-jam source kind");
  assertEqual(
    zorpSource?.url,
    "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    "Zorp state-jam Drive folder URL"
  );
  assertEqual(zorpSource?.custodian, "Zorp", "Zorp state-jam custodian");
  assertEqual(zorpSource?.artifactPolicy, "metadata-only", "Zorp state-jam artifact policy");
  assertIncludes(zorpSource?.watchReasons, "state-jam/checkpoint provenance", "Zorp watch reason");
  assertIncludes(zorpSource?.verificationQuestions, "Which Nockchain commit/build produced it?", "Zorp provenance question");

  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(body.upstream.protocol.next.codename, "Nous", "protocol context");
  assertEqual(body.links.upstream, "https://nocksperimental.com/api/nockchain/upstream", "upstream link");
  assertEqual(body.links.zorp, "https://github.com/zorp-corp", "Zorp org link");
  assertEqual(body.links.repository, "https://github.com/nockchain/nockchain", "Nockchain repository link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-state-jams",
    "/api/nockchain/state-jams",
    "Nockchain state-jam provenance registry"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainStateJams,
    "https://nocksperimental.com/api/nockchain/state-jams",
    "well-known state-jams link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-state-jam-provenance", "state-jam capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/state-jams"]?.get?.summary,
    "Nockchain state-jam provenance registry",
    "OpenAPI state-jams path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.stateJamSources, 0, "checkpoint state-jam source count");
  assertStartsWith(checkpointBody.roots.stateJamRegistry, "sha256:", "checkpoint state-jam root");
  assertEqual(checkpointBody.checks.noRawStateJamArtifactsStored, true, "checkpoint raw artifact guard");
  assertEqual(
    checkpointBody.links.stateJams,
    "https://nocksperimental.com/api/nockchain/state-jams",
    "checkpoint state-jams link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-state-jams-api"],
    "node scripts/test-nockchain-state-jams-api.mjs",
    "package state-jams test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-state-jams-api", "full test includes state-jams test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/state-jams", "Cloudflare smoke includes state-jams API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain State-Jam Provenance", "README documents state-jam provenance");
  assertIncludes(readme, "/api/nockchain/state-jams", "README documents state-jams endpoint");
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
