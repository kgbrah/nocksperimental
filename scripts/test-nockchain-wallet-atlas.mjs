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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/wallet/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "wallet atlas status");
  assertEqual(body.version, "v0", "wallet atlas version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/wallet", "canonical URL");
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );
  assertIncludes(body.upstream.docs, "crates/nockchain-wallet/README.md", "wallet README source");
  assertIncludes(body.upstream.docs, "crates/nockchain-api/README.md", "API README source");

  assertCommand(body, "show-balance", "nockchain-wallet show-balance", "aggregate wallet balance");
  assertCommand(body, "list-notes", "nockchain-wallet list-notes", "sync-heavy");
  assertCommand(body, "list-notes-by-address", "nockchain-wallet list-notes-by-address <base58-address>", "specified public key");
  assertCommand(body, "watch-address", "nockchain-wallet watch address <base58-pkh-or-pubkey>", "watch-only");
  assertCommand(body, "export-keys", "nockchain-wallet export-keys", "key backup");
  assertCommand(body, "tx-accepted", "nockchain-wallet --client public tx-accepted <base58-tx-id>", "public API only");

  assertEndpointMode(body, "public", "https://nockchain-api.zorp.io", "--client public");
  assertEndpointMode(body, "private", "127.0.0.1:5555", "--client private");
  assertIncludes(body.endpointModes.find((mode) => mode.id === "public")?.riskNotes ?? [], "default public endpoint is remote", "public endpoint risk");
  assertIncludes(body.endpointModes.find((mode) => mode.id === "private")?.riskNotes ?? [], "requires a local running nockchain instance", "private endpoint risk");

  assertEqual(body.localFakenetProfile.walletAddress, "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ", "local wallet address");
  assertEqual(body.localFakenetProfile.endpoint, "127.0.0.1:5555", "local fakenet endpoint");
  assertIncludes(body.localFakenetProfile.commands, "fakenock --balance", "local fakenock balance command");
  assertIncludes(
    body.localFakenetProfile.upstreamEquivalentCommands,
    "nockchain-wallet --client private show-balance",
    "private show-balance equivalent"
  );
  assertIncludes(
    body.localFakenetProfile.upstreamEquivalentCommands,
    "nockchain-wallet --client private list-notes-by-address 532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    "private address notes equivalent"
  );

  assertIncludes(body.balanceEvidenceContract.requiredFields, "walletAddress", "balance contract wallet");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "endpointMode", "balance contract endpoint mode");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "outputHash", "balance contract hash");
  assertIncludes(body.balanceEvidenceContract.requiredFields, "nockchainBuild", "balance contract build");
  assertIncludes(body.safety.doNotStore, "seed phrases", "seed safety");
  assertIncludes(body.safety.doNotStore, "private keys", "private key safety");
  assertIncludes(body.safety.doNotStore, "keys.export", "exported key safety");
  assertIncludes(body.safety.publicApiWarnings, "no authentication", "public API warning");
  assertIncludes(body.safety.publicApiWarnings, "no rate limiting", "rate-limit warning");

  assertScenario(body, "balance-unknown", "endpoint and sync context");
  assertScenario(body, "watch-only-missing", "watch-only identifier");
  assertScenario(body, "private-grpc-unreachable", "127.0.0.1:5555");
  assertScenario(body, "public-api-exposure-risk", "no authentication");
  assertScenario(body, "tx-accepted-public-only", "private API cannot be queried");

  assertEqual(body.links.localFakenetCommands, "https://nocksperimental.com/api/fakenet/commands", "commands link");
  assertEqual(body.links.operationsAtlas, "https://nocksperimental.com/api/nockchain/operations", "operations link");
  assertEqual(body.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "nockchain-wallet-atlas", "/api/nockchain/wallet", "Nockchain wallet/API atlas");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainWalletAtlas,
    "https://nocksperimental.com/api/nockchain/wallet",
    "well-known wallet link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-wallet-api-atlas", "wallet capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/wallet"]?.get?.summary,
    "Nockchain wallet/API atlas",
    "OpenAPI wallet path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainWalletCommands, 5, "checkpoint wallet command count");
  assertStartsWith(checkpointBody.roots.nockchainWalletAtlas, "sha256:", "checkpoint wallet root");
  assertEqual(checkpointBody.checks.nockchainWalletAtlasAvailable, true, "checkpoint wallet guard");
  assertEqual(
    checkpointBody.links.nockchainWalletAtlas,
    "https://nocksperimental.com/api/nockchain/wallet",
    "checkpoint wallet link"
  );

  const page = readText("src/app/nockchain/wallet/page.tsx");
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  assertIncludes(page, "createNockchainWalletAtlas", "wallet page uses atlas");
  assertIncludes(page, "Nockchain Wallet", "wallet page title");
  assertIncludes(page, "show-balance", "wallet page renders show balance");
  assertIncludes(page, "list-notes-by-address", "wallet page renders address notes");
  assertIncludes(page, "watch-only", "wallet page renders watch-only");
  assertIncludes(page, "public API exposure", "wallet page renders public risk");
  assertIncludes(page, "seed phrases", "wallet page renders secret safety");
  assertIncludes(page, 'href="/api/nockchain/wallet"', "wallet page links API");
  assertIncludes(page, 'href="/nockchain"', "wallet page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/wallet"', "Nockchain page links wallet page");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-wallet-atlas"],
    "node scripts/test-nockchain-wallet-atlas.mjs",
    "package wallet test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-wallet-atlas", "full test includes wallet atlas");

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/wallet", "Cloudflare smoke includes wallet API");
  assertIncludes(smokeSource, "/nockchain/wallet", "Cloudflare smoke includes wallet page");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain Wallet/API Atlas", "README documents wallet atlas");
  assertIncludes(readme, "/api/nockchain/wallet", "README documents wallet endpoint");
  assertIncludes(readme, "/nockchain/wallet", "README documents wallet page");
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

function assertCommand(body, id, expectedCommand, expectedText) {
  const command = body.walletCommands.find((candidate) => candidate.id === id);

  if (!command) {
    throw new Error(`Missing wallet command: ${id}`);
  }

  assertEqual(command.command, expectedCommand, `${id} command`);
  assertIncludes(
    [command.description, command.evidenceUse, command.risk].filter(Boolean).join("\n"),
    expectedText,
    `${id} expected text`
  );
}

function assertEndpointMode(body, id, expectedEndpoint, expectedFlag) {
  const mode = body.endpointModes.find((candidate) => candidate.id === id);

  if (!mode) {
    throw new Error(`Missing endpoint mode: ${id}`);
  }

  assertEqual(mode.endpoint, expectedEndpoint, `${id} endpoint`);
  assertIncludes(mode.commandPattern, expectedFlag, `${id} flag`);
}

function assertScenario(body, id, expectedText) {
  const scenario = body.triageScenarios.find((candidate) => candidate.id === id);

  if (!scenario) {
    throw new Error(`Missing wallet scenario: ${id}`);
  }

  assertIncludes(
    [scenario.title, scenario.symptom, scenario.interpretation, ...(scenario.checks ?? [])].join("\n"),
    expectedText,
    `${id} expected text`
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
