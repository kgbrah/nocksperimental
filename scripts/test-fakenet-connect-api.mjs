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
  const { GET, POST } = loadTypeScriptModule("src/app/api/fakenet/connect/route.ts");
  const walletAddress = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
  const localUrl = new URL("https://nocksperimental.com/api/fakenet/connect");
  localUrl.searchParams.set("endpoint", "127.0.0.1:5555");
  localUrl.searchParams.set("walletAddress", walletAddress);
  localUrl.searchParams.set("networkId", "local-devnet");

  const localResponse = await GET(new Request(localUrl));
  const localProfile = await localResponse.json();

  assertEqual(localResponse.status, 200, "local profile status");
  assertEqual(localProfile.version, "v0", "local profile version");
  assertEqual(localProfile.service, "nocksperimental", "local profile service");
  assertEqual(localProfile.subject, "nocksperimental.com", "local profile subject");
  assertEqual(localProfile.canonicalUrl, "https://nocksperimental.com/api/fakenet/connect", "canonical URL");
  assertEqual(localProfile.accepted, true, "local profile accepted");
  assertEqual(localProfile.mode, "local-runbook", "local profile mode");
  assertEqual(localProfile.connection.endpoint.input, "127.0.0.1:5555", "local endpoint input");
  assertEqual(localProfile.connection.endpoint.normalized, "grpc://127.0.0.1:5555", "local endpoint normalized");
  assertEqual(localProfile.connection.endpoint.visibility, "private", "local endpoint visibility");
  assertEqual(localProfile.connection.walletAddress, walletAddress, "local wallet address");
  assertEqual(localProfile.connection.networkId, "local-devnet", "local network id");
  assertEqual(localProfile.safety.canProbeFromHosted, false, "private endpoints are not hosted-probed");
  assertEqual(localProfile.safety.requiresClientSideRun, true, "private endpoints require client run");
  assertIncludes(localProfile.safety.notes.join("\n"), "private or loopback", "private endpoint safety note");
  assertEqual(localProfile.apiSafety.endpointMode, "private-grpc", "local API safety endpoint mode");
  assertEqual(
    localProfile.apiSafety.hostedProbePolicy,
    "blocked-private-or-loopback",
    "local hosted probe policy"
  );
  assertIncludes(
    localProfile.apiSafety.sourceDocs.map((source) => source.path),
    "crates/nockchain-api/README.md",
    "API safety includes nockchain-api README"
  );
  assertIncludes(
    localProfile.apiSafety.sourceDocs.map((source) => source.path),
    "crates/nockchain-wallet/README.md",
    "API safety includes wallet README"
  );
  assertIncludes(
    localProfile.apiSafety.requiredReceiptFields,
    "accessControl",
    "API safety receipt access-control field"
  );
  assertIncludes(
    localProfile.apiSafety.requiredReceiptFields,
    "probeLocation",
    "API safety receipt probe location field"
  );
  assertIncludes(
    localProfile.apiSafety.privateApi.operationalRequirements,
    "nockchain instance running locally",
    "private API local node requirement"
  );
  assertIncludes(
    localProfile.apiSafety.publicExposure.riskFlags,
    "no-auth-no-rate-limit-public-grpc",
    "public API risk flag"
  );
  assertTestFunction(localProfile, "health", "npm run lab:local");
  assertTestFunction(localProfile, "balance", "npm run lab:local:balance");
  assertTestFunction(localProfile, "chain", "npm run lab:local:chain");
  assertTestFunction(localProfile, "peek", "npm run lab:local:peek");
  assertTestFunction(localProfile, "poke", "npm run lab:local:poke");
  assertIncludes(localProfile.commands.env.NOCKS_FAKENET_ENDPOINT, "127.0.0.1:5555", "endpoint env");
  assertIncludes(localProfile.commands.env.NOCKS_FAKENET_WALLET, walletAddress, "wallet env");
  assertIncludes(localProfile.commands.runAll, "npm run lab:local:poke", "run all includes poke");
  assertIncludes(localProfile.links.profile, "/api/fakenet/connect?", "profile link");
  assertIncludes(localProfile.links.evidence, "/api/fakenet/evidence/verify?", "evidence link");

  const publicResponse = await POST(
    new Request("https://nocksperimental.com/api/fakenet/connect", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "https://fakenet.example.com",
        walletAddress,
        networkId: "public-devnet",
        label: "Public demo fakenet"
      })
    })
  );
  const publicProfile = await publicResponse.json();

  assertEqual(publicResponse.status, 200, "public profile status");
  assertEqual(publicProfile.accepted, true, "public profile accepted");
  assertEqual(publicProfile.mode, "hosted-http-candidate", "public profile mode");
  assertEqual(publicProfile.connection.endpoint.normalized, "https://fakenet.example.com/", "public normalized endpoint");
  assertEqual(publicProfile.connection.endpoint.visibility, "public", "public endpoint visibility");
  assertEqual(publicProfile.safety.canProbeFromHosted, true, "public HTTPS endpoints can be hosted-probed");
  assertIncludes(publicProfile.safety.notes.join("\n"), "HTTP(S)", "public endpoint safety note");
  assertEqual(
    publicProfile.apiSafety.endpointMode,
    "public-http-manifest",
    "public HTTPS API safety endpoint mode"
  );
  assertEqual(
    publicProfile.apiSafety.hostedProbePolicy,
    "allowed-public-http-only",
    "public HTTPS hosted probe policy"
  );
  assertIncludes(
    publicProfile.apiSafety.publicExposure.trustedControls,
    "mTLS proxy",
    "public API trusted mTLS control"
  );
  assertIncludes(
    publicProfile.apiSafety.observabilitySignals,
    "nockchain_public_grpc.* gnort metrics",
    "public API observability signal"
  );

  const publicGrpcResponse = await POST(
    new Request("https://nocksperimental.com/api/fakenet/connect", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "grpcs://public-node.example.com:5555",
        walletAddress,
        networkId: "public-grpc-devnet",
        label: "Public gRPC fakenet"
      })
    })
  );
  const publicGrpcProfile = await publicGrpcResponse.json();

  assertEqual(publicGrpcResponse.status, 200, "public gRPC profile status");
  assertEqual(publicGrpcProfile.mode, "remote-runbook", "public gRPC profile mode");
  assertEqual(
    publicGrpcProfile.apiSafety.endpointMode,
    "public-grpc-client-side",
    "public gRPC API safety endpoint mode"
  );
  assertEqual(
    publicGrpcProfile.apiSafety.hostedProbePolicy,
    "blocked-public-grpc-client-side",
    "public gRPC hosted probe policy"
  );

  const invalidResponse = await POST(
    new Request("https://nocksperimental.com/api/fakenet/connect", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "file:///etc/passwd",
        walletAddress
      })
    })
  );
  const invalidProfile = await invalidResponse.json();

  assertEqual(invalidResponse.status, 400, "invalid profile status");
  assertEqual(invalidProfile.accepted, false, "invalid profile rejected");
  assertIncludes(invalidProfile.errors.join("\n"), "Unsupported fakenet endpoint scheme", "invalid scheme error");

  // SEC-G: previously-public-classified loopback/private encodings must resolve to
  // visibility "private" so the hosted probe stays blocked.
  const privateEncodings = [
    { endpoint: "[::ffff:127.0.0.1]:5555", label: "IPv4-mapped IPv6 loopback" },
    { endpoint: "[fe80::1]:5555", label: "link-local IPv6" },
    { endpoint: "[::]:5555", label: "unspecified IPv6" },
    { endpoint: "grpc://2130706433:5555", label: "32-bit integer IPv4 loopback" },
    { endpoint: "grpc://0x7f000001:5555", label: "hex IPv4 loopback" },
    { endpoint: "grpc://127.1:5555", label: "short-form IPv4 loopback" }
  ];

  for (const { endpoint, label } of privateEncodings) {
    const response = await POST(
      new Request("https://nocksperimental.com/api/fakenet/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          endpoint,
          walletAddress,
          networkId: "local-devnet"
        })
      })
    );
    const profile = await response.json();

    assertEqual(
      profile.connection.endpoint.visibility,
      "private",
      `${label} (${endpoint}) classified as private`
    );
    assertEqual(
      profile.apiSafety.hostedProbePolicy,
      "blocked-private-or-loopback",
      `${label} (${endpoint}) hosted probe blocked`
    );
  }

  await assertMalformedBodyRejected(POST, "https://nocksperimental.com/api/fakenet/connect");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "bring-your-own-fakenet", "/api/fakenet/connect", "Bring your own fakenet connection profile");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(wellKnownBody.links.fakenetConnect, "https://nocksperimental.com/api/fakenet/connect", "well-known fakenet connect link");
  assertIncludes(wellKnownBody.capabilities, "bring-your-own-fakenet", "well-known BYO capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/fakenet/connect"]?.get?.summary,
    "Bring your own fakenet connection profile",
    "OpenAPI fakenet connect GET path"
  );
  assertEqual(
    openApiBody.paths["/api/fakenet/connect"]?.post?.summary,
    "Bring your own fakenet connection profile",
    "OpenAPI fakenet connect POST path"
  );

  const fakenetPageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(fakenetPageSource, "Bring Your Own Fakenet", "fakenet page has BYO section");
  assertIncludes(fakenetPageSource, "API Safety Contract", "fakenet page renders API safety contract");
  assertIncludes(fakenetPageSource, "hostedProbePolicy", "fakenet page renders hosted probe policy");
  assertIncludes(fakenetPageSource, "public gRPC service", "fakenet page renders public API risk language");
  assertIncludes(fakenetPageSource, "accessControl", "fakenet page renders API safety receipt field");
  assertIncludes(fakenetPageSource, "nockchain-api", "fakenet page references nockchain-api");
  assertIncludes(fakenetPageSource, 'action="/api/fakenet/connect"', "fakenet page posts to connect API");
  assertIncludes(fakenetPageSource, 'name="endpoint"', "fakenet page endpoint input");
  assertIncludes(fakenetPageSource, 'name="walletAddress"', "fakenet page wallet input");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:fakenet-connect"],
    "node scripts/test-fakenet-connect-api.mjs",
    "package fakenet connect test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:fakenet-connect", "full test includes fakenet connect");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/connect?endpoint=127.0.0.1%3A5555", "Cloudflare smoke includes fakenet connect API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/connect", "deployment docs include fakenet connect API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Bring your own fakenet", "README documents BYO fakenet");
  assertIncludes(readme, "API safety contract", "README documents BYO fakenet API safety contract");
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

function assertTestFunction(body, id, command) {
  const testFunction = body.testFunctions.find((candidate) => candidate.id === id);

  if (!testFunction) {
    throw new Error(`Missing test function: ${id}`);
  }

  assertEqual(testFunction.command, command, `${id} command`);
  assertIncludes(testFunction.runCommand, "NOCKS_FAKENET_ENDPOINT", `${id} run command endpoint env`);
  assertIncludes(testFunction.runCommand, "NOCKS_FAKENET_WALLET", `${id} run command wallet env`);
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

async function assertMalformedBodyRejected(POST, url) {
  for (const body of ["", "not json", "null"]) {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body
      })
    );

    assertEqual(response.status, 400, `malformed body (${JSON.stringify(body)}) is rejected with 400`);

    const payload = await response.json();
    assertEqual(typeof payload.error, "string", `malformed body (${JSON.stringify(body)}) returns an error message`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
