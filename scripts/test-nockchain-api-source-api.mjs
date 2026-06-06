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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/api-source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "Nockchain API source status");
  assertEqual(body.version, "v0", "Nockchain API source version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/api-source",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(body.upstream.crates.includes("nockchain-api"), true, "upstream crate list");

  assertGreaterThan(body.sourceAnchors.length, 10, "source anchor count");
  assertSourceAnchor(body, "api-readme-contract", "crates/nockchain-api/README.md", "NockchainService");
  assertSourceAnchor(body, "api-binary-bootstrap", "crates/nockchain-api/src/main.rs", "NockchainAPIConfig::EnablePublicServer");
  assertSourceAnchor(body, "public-grpc-cli-flag", "crates/nockchain/src/config.rs", "bind_public_grpc_addr");
  assertSourceAnchor(body, "api-config-driver-toggle", "crates/nockchain/src/lib.rs", "grpc_server_driver");
  assertSourceAnchor(body, "public-grpc-driver", "crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs", "PublicNockchainEffect");
  assertSourceAnchor(body, "public-service-startup", "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", "NockchainBlockServiceServer");
  assertSourceAnchor(body, "block-explorer-refresh", "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", "start_block_explorer_refresh");
  assertSourceAnchor(body, "transaction-accepted-server", "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", "transaction_accepted");
  assertSourceAnchor(body, "block-explorer-get-blocks", "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", "get_blocks");
  assertSourceAnchor(body, "block-explorer-transaction-details", "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", "get_transaction_details");
  assertSourceAnchor(body, "public-api-proto", "crates/nockapp-grpc-proto/proto/nockchain/public/v2/nockchain.proto", "NockchainMetricsService");
  assertSourceAnchor(body, "public-api-metrics", "crates/nockapp-grpc/src/services/public_nockchain/v2/metrics.rs", "nockchain_public_grpc.block_explorer.seed_ready");
  assertSourceAnchor(body, "wallet-public-tx-accepted", "crates/nockchain-wallet/src/main.rs", "run_transaction_accepted");

  assertCapability(body, "public-server-enablement", "api-binary-bootstrap");
  assertCapability(body, "public-endpoint-security-posture", "api-readme-contract");
  assertCapability(body, "wallet-public-client", "wallet-public-tx-accepted");
  assertCapability(body, "tx-accepted-not-inclusion", "transaction-accepted-server");
  assertCapability(body, "block-explorer-cache", "block-explorer-refresh");
  assertCapability(body, "metrics-and-health", "public-api-metrics");
  assertCapability(body, "browser-grpc-web-guardrails", "public-service-startup");

  assertIncludes(body.receiptContract.requiredFields, "apiEndpoint", "receipt endpoint");
  assertIncludes(body.receiptContract.requiredFields, "apiEndpointMode", "receipt endpoint mode");
  assertIncludes(body.receiptContract.requiredFields, "grpcService", "receipt gRPC service");
  assertIncludes(body.receiptContract.requiredFields, "txId", "receipt tx id");
  assertIncludes(body.receiptContract.requiredFields, "acceptedByNode", "receipt accepted by node");
  assertIncludes(body.receiptContract.requiredFields, "includedBlock", "receipt included block");
  assertIncludes(body.receiptContract.requiredFields, "cacheWarmupState", "receipt cache warmup");
  assertIncludes(body.receiptContract.requiredFields, "heaviestChainFreshness", "receipt chain freshness");
  assertIncludes(body.receiptContract.requiredFields, "accessControlPosture", "receipt access control");
  assertIncludes(body.receiptContract.forbiddenFields, "rawTransactionJam", "forbid raw transaction jam");
  assertIncludes(body.receiptContract.forbiddenFields, "rawNounSlab", "forbid raw noun slab");
  assertIncludes(body.receiptContract.forbiddenFields, "walletSeedPhrase", "forbid wallet seed phrase");

  assertIncludes(body.endpointModes.map((mode) => mode.id), "private-grpc", "private endpoint mode");
  assertIncludes(body.endpointModes.map((mode) => mode.id), "public-grpc", "public endpoint mode");
  assertIncludes(body.endpointModes.map((mode) => mode.id), "hosted-http-manifest", "hosted endpoint mode");
  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p nockchain-api", "API cargo check");
  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p nockapp-grpc", "gRPC cargo check");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-api-source-trace",
    "/api/nockchain/api-source",
    "Nockchain public API source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainApiSourceTrace,
    "https://nocksperimental.com/api/nockchain/api-source",
    "well-known API source link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-api-source-trace", "API source capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/api-source"]?.get?.summary,
    "Nockchain public API source trace",
    "OpenAPI API source path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainApiSourceAnchors, 10, "checkpoint API anchor count");
  assertEqual(
    checkpointBody.counts.nockchainApiSourceCapabilities,
    body.apiCapabilities.length,
    "checkpoint API capability count"
  );
  assertStartsWith(checkpointBody.roots.nockchainApiSourceTrace, "sha256:", "checkpoint API root");
  assertEqual(checkpointBody.checks.nockchainApiSourceTraceAvailable, true, "checkpoint API source check");
  assertIncludes(
    checkpointBody.nockchainApiSourceTrace.sourceAnchors,
    "transaction-accepted-server",
    "checkpoint transaction accepted anchor"
  );
  assertIncludes(
    checkpointBody.nockchainApiSourceTrace.apiCapabilityIds,
    "tx-accepted-not-inclusion",
    "checkpoint tx accepted capability"
  );
  assertEqual(
    checkpointBody.links.nockchainApiSourceTrace,
    "https://nocksperimental.com/api/nockchain/api-source",
    "checkpoint API source link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-api-source-api"],
    "node scripts/test-nockchain-api-source-api.mjs",
    "package API source API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-api-source-api",
    "full test includes API source API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/api-source", "Cloudflare smoke includes API source API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Public API Source Trace", "README documents API source trace");
  assertIncludes(readme, "/api/nockchain/api-source", "README documents API source route");
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

function assertCapability(body, id, sourceAnchorId) {
  const capability = body.apiCapabilities.find((candidate) => candidate.id === id);

  if (!capability) {
    throw new Error(`Missing API capability: ${id}`);
  }

  assertIncludes(capability.sourceAnchorIds, sourceAnchorId, `${id} source anchor`);
  assertGreaterThan(capability.receiptFields.length, 0, `${id} receipt fields`);
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

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(actual, expected, label) {
  if (!actual?.startsWith(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`);
  }
}

function assertGreaterThan(actual, expected, label) {
  if (!(actual > expected)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function loadTypeScriptModule(filePath) {
  const modulePath = path.join(process.cwd(), filePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${filePath}`);
  }

  const compiledModule = { exports: {} };
  moduleCache.set(modulePath, compiledModule);

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      baseUrl: process.cwd(),
      paths: {
        "@/*": ["src/*"]
      }
    },
    fileName: modulePath
  }).outputText;

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiledModule.exports, createModuleRequire(), compiledModule, modulePath, path.dirname(modulePath));

  return compiledModule.exports;
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
  const tsPath = `${aliasPath}.ts`;
  const jsonPath = `${aliasPath}.json`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}
