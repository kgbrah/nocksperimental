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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/runtime-safety/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "runtime safety status");
  assertEqual(body.version, "v0", "runtime safety version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/runtime-safety",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThan(body.sourceAnchors.length, 8, "runtime safety source anchor count");
  assertSourceAnchor(
    body,
    "nockstack-frame-bounds",
    "crates/nockvm/rust/nockvm/src/mem.rs",
    "NockStack::is_in_frame"
  );
  assertSourceAnchor(
    body,
    "nockstack-frame-lifecycle",
    "crates/nockvm/rust/nockvm/src/mem.rs",
    "NockStack::frame_push"
  );
  assertSourceAnchor(
    body,
    "nockstack-frame-lifecycle",
    "crates/nockvm/rust/nockvm/src/mem.rs",
    "NockStack::frame_pop"
  );
  assertSourceAnchor(
    body,
    "interpreter-stack-frame-preserve",
    "crates/nockvm/rust/nockvm/src/interpreter.rs",
    "Context::with_stack_frame"
  );
  assertSourceAnchor(
    body,
    "cue-stack-deserialization",
    "crates/nockvm/rust/nockvm/src/serialization.rs",
    "cue_bitslice_with_mode"
  );
  assertSourceAnchor(
    body,
    "rub-backref-bounds",
    "crates/nockvm/rust/nockvm/src/serialization.rs",
    "rub_atom_internal"
  );
  assertSourceAnchor(
    body,
    "rub-backref-bounds",
    "crates/nockvm/rust/nockvm/src/serialization.rs",
    "rub_backref"
  );
  assertSourceAnchor(
    body,
    "jam-traversal-bounds",
    "crates/nockvm/rust/nockvm/src/serialization.rs",
    "jam"
  );
  assertSourceAnchor(
    body,
    "jam-traversal-bounds",
    "crates/nockvm/rust/nockvm/src/serialization.rs",
    "mat"
  );
  assertSourceAnchor(
    body,
    "noun-space-provenance",
    "crates/nockvm/rust/nockvm/src/noun.rs",
    "NounSpace::with_brand"
  );
  assertSourceAnchor(
    body,
    "noun-space-provenance",
    "crates/nockvm/rust/nockvm/src/noun.rs",
    "BrandedNounHandle"
  );
  assertSourceAnchor(
    body,
    "hamt-fixed-depth-preserve",
    "crates/nockvm/rust/nockvm/src/hamt.rs",
    "Preserve for Hamt<T>"
  );
  assertSourceAnchor(
    body,
    "pma-direct-reader-bounds",
    "crates/nockvm/rust/nockvm/src/pma/stream.rs",
    "PmaDirectReader::read_u64"
  );

  assertRuntimeSafetyClass(body, "stack-frame-pointer-outside-arena", "nockstack-frame-bounds");
  assertRuntimeSafetyClass(body, "jam-cue-malformed-input", "cue-stack-deserialization");
  assertRuntimeSafetyClass(body, "p2p-jam-empty-buffer", "rub-backref-bounds");
  assertRuntimeSafetyClass(body, "height-bound-worker-panic", "jam-traversal-bounds");
  assertRuntimeSafetyClass(body, "noun-space-stale-epoch", "noun-space-provenance");

  assertIncludes(body.receiptContract.requiredFields, "nockvmCommit", "receipt NockVM commit");
  assertIncludes(body.receiptContract.requiredFields, "nockchainBuild", "receipt Nockchain build");
  assertIncludes(body.receiptContract.requiredFields, "runtimeSafetyIssue", "receipt issue class");
  assertIncludes(body.receiptContract.requiredFields, "stackFrameCheck", "receipt stack-frame check");
  assertIncludes(body.receiptContract.requiredFields, "cueInputLength", "receipt cue input length");
  assertIncludes(body.receiptContract.requiredFields, "cueValidationError", "receipt cue validation error");
  assertIncludes(body.receiptContract.requiredFields, "pmaOffsetBoundsCheck", "receipt PMA offset check");
  assertIncludes(body.receiptContract.requiredFields, "nounSpaceEpoch", "receipt noun-space epoch");
  assertIncludes(body.receiptContract.requiredFields, "supportBundleTraceId", "receipt support bundle trace");
  assertIncludes(body.receiptContract.forbiddenFields, "rawJamPayload", "forbid raw jam payload");
  assertIncludes(body.receiptContract.forbiddenFields, "rawPmaSlab", "forbid raw PMA slab");
  assertIncludes(body.receiptContract.forbiddenFields, "rawCoreDump", "forbid raw core dump");
  assertIncludes(body.receiptContract.forbiddenFields, "rawStackMemory", "forbid raw stack memory");
  assertIncludes(body.receiptContract.forbiddenFields, "rawEventLog", "forbid raw event log");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "forbid wallet seed");

  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p nockvm", "NockVM check command");
  assertEqual(body.localVerification.status, "source-inspected", "local verification status");
  assertGreaterThan(body.operatorTriage.length, 3, "operator triage count");
  assertGreaterThan(body.nocksperimentalImplications.length, 2, "Nocksperimental implication count");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/runtime-safety", "page link");
  assertEqual(body.links.rustSource, "https://nocksperimental.com/api/nockchain/rust-source", "rust source link");
  assertEqual(body.links.pmaSourceTrace, "https://nocksperimental.com/api/nockchain/pma", "PMA link");
  assertEqual(body.links.prRadar, "https://nocksperimental.com/api/nockchain/pr-radar", "PR radar link");
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-runtime-safety",
    "/api/nockchain/runtime-safety",
    "Nockchain NockVM runtime safety trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainRuntimeSafety,
    "https://nocksperimental.com/api/nockchain/runtime-safety",
    "well-known runtime safety link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-runtime-safety", "runtime safety capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/runtime-safety"]?.get?.summary,
    "Nockchain NockVM runtime safety trace",
    "OpenAPI runtime safety path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(
    checkpointBody.counts.nockchainRuntimeSafetyAnchors,
    8,
    "checkpoint runtime safety anchor count"
  );
  assertEqual(
    checkpointBody.counts.nockchainRuntimeSafetyClasses,
    body.runtimeSafetyClasses.length,
    "checkpoint runtime safety class count"
  );
  assertStartsWith(
    checkpointBody.roots.nockchainRuntimeSafety,
    "sha256:",
    "checkpoint runtime safety root"
  );
  assertEqual(
    checkpointBody.checks.nockchainRuntimeSafetyAvailable,
    true,
    "checkpoint runtime safety check"
  );
  assertIncludes(
    checkpointBody.nockchainRuntimeSafety.sourceAnchors,
    "nockstack-frame-bounds",
    "checkpoint frame anchor"
  );
  assertIncludes(
    checkpointBody.nockchainRuntimeSafety.runtimeSafetyClassIds,
    "jam-cue-malformed-input",
    "checkpoint jam/cue class"
  );
  assertIncludes(
    checkpointBody.nockchainRuntimeSafety.receiptFields,
    "runtimeSafetyIssue",
    "checkpoint runtime receipt field"
  );
  assertIncludes(
    checkpointBody.nockchainRuntimeSafety.forbiddenFields,
    "rawStackMemory",
    "checkpoint runtime forbidden stack memory"
  );
  assertEqual(
    checkpointBody.links.nockchainRuntimeSafety,
    "https://nocksperimental.com/api/nockchain/runtime-safety",
    "checkpoint runtime safety link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-runtime-safety-api"],
    "node scripts/test-nockchain-runtime-safety-api.mjs",
    "package runtime safety API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-runtime-safety-api",
    "full test includes runtime safety API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/runtime-safety", "Cloudflare smoke includes runtime safety API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Runtime Safety Trace", "README documents runtime safety trace");
  assertIncludes(readme, "/api/nockchain/runtime-safety", "README documents runtime safety API");
}

function assertSourceAnchor(body, id, file, symbol) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing source anchor: ${id}`);
  }

  assertEqual(anchor.file, file, `${id} file`);
  assertIncludes(anchor.symbols, symbol, `${id} symbol`);
  assertGreaterThan(anchor.sourceUrls.length, 0, `${id} source URL`);
  assertGreaterThan(anchor.receiptFields.length, 0, `${id} receipt fields`);
}

function assertRuntimeSafetyClass(body, id, sourceAnchorId) {
  const safetyClass = body.runtimeSafetyClasses.find((candidate) => candidate.id === id);

  if (!safetyClass) {
    throw new Error(`Missing runtime safety class: ${id}`);
  }

  assertIncludes(safetyClass.sourceAnchorIds, sourceAnchorId, `${id} source anchor`);
  assertGreaterThan(safetyClass.receiptFields.length, 0, `${id} receipt fields`);
}

function assertEndpoint(registry, id, pathName, description) {
  const endpoint = registry.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathName}`, `${id} URL`);
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
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

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertGreaterThan(actual, expectedMinimum, label) {
  if (!(actual > expectedMinimum)) {
    throw new Error(`${label}: expected more than ${expectedMinimum}, received ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
