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
  const { POST } = loadTypeScriptModule("src/app/api/nockchain/nockup/submit/route.ts");
  const payload = createNockupPayload();

  const response = await POST(
    new Request("https://nocksperimental.com/api/nockchain/nockup/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
  const receipt = await response.json();

  assertEqual(response.status, 200, "submit status");
  assertEqual(receipt.version, "v0", "receipt version");
  assertEqual(receipt.service, "nocksperimental", "receipt service");
  assertEqual(receipt.subject, "nocksperimental.com", "receipt subject");
  assertEqual(receipt.canonicalUrl, "https://nocksperimental.com/api/nockchain/nockup/submit", "receipt canonical URL");
  assertEqual(receipt.accepted, true, "receipt accepted");
  assertEqual(receipt.verified, true, "receipt verified");
  assertStartsWith(receipt.receiptId, "nockup_validation_", "receipt id prefix");
  assertEqual(receipt.summary.project, "counter-nockapp", "project summary");
  assertEqual(receipt.summary.template, "basic", "template summary");
  assertEqual(receipt.summary.commandCount, 3, "command count");
  assertEqual(receipt.summary.artifactCount, 2, "artifact count");
  assertEqual(receipt.summary.artifactsHashed, true, "artifact hash summary");
  assertEqual(receipt.checks.projectProvided, true, "project provided check");
  assertEqual(receipt.checks.templateProvided, true, "template provided check");
  assertEqual(receipt.checks.scaffoldCommandPassed, true, "scaffold command check");
  assertEqual(receipt.checks.buildCommandPassed, true, "build command check");
  assertEqual(receipt.checks.runCommandPassed, true, "run command check");
  assertEqual(receipt.checks.artifactHashesProvided, true, "artifact hashes check");
  assertEqual(receipt.checks.installPathRecorded, true, "install path check");
  assertEqual(receipt.checks.noSecretFields, true, "secret-field check");
  assertEqual(receipt.nockchain.repository.fullName, "nockchain/nockchain", "receipt Nockchain repository");
  assertEqual(receipt.nockchain.commit.shortSha, "33ba97b1e206", "receipt Nockchain commit");
  assertEqual(
    receipt.nockchain.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "receipt Nockchain release"
  );
  assertEqual(receipt.nockchain.protocol.next.codename, "Nous", "receipt Nockchain protocol track");
  assertEqual(receipt.nockchain.context.network, "local-fakenet", "receipt Nockchain network context");
  assertEqual(receipt.nockchain.context.endpoint, "http://127.0.0.1:5555", "receipt Nockchain endpoint context");
  assertEqual(receipt.nockchain.context.walletAddress, "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ", "receipt wallet context");
  assertEqual(receipt.nockchain.context.project, "counter-nockapp", "receipt project context");
  assertIncludes(receipt.nockchain.docs.canonicalSources, "PROTOCOL.md", "receipt Nockchain protocol source");
  assertEqual(receipt.nockup.crate, "nockup", "Nockup crate name");
  assertEqual(receipt.nockup.primaryCheck, "cargo check -p nockup", "Nockup cargo check");
  assertIncludes(receipt.nockup.watchThemes, "#125 fix(nockup): harden templates and run UX", "Nockup hardening watch theme");
  assertIncludes(receipt.nockup.watchThemes, "#122 feat(nockup): install_path support and nested symlink fixes", "Nockup install_path watch theme");
  assertEqual(receipt.storage.persisted, true, "receipt persisted");
  assertEqual(receipt.storage.backend, "memory", "receipt persistence backend");
  assertEqual(receipt.storage.binding, "NOCKS_NOCKUP_RECEIPTS", "receipt storage binding");
  assertIncludes(receipt.links.receipt, `/api/nockchain/nockup/receipts/${receipt.receiptId}`, "receipt detail link");
  assertEqual(
    receipt.links.receipts,
    "https://nocksperimental.com/api/nockchain/nockup/receipts",
    "receipt index link"
  );
  assertEqual(receipt.links.rustAtlas, "https://nocksperimental.com/api/nockchain/rust-atlas", "rust atlas link");
  assertEqual(receipt.links.zorp, "https://nocksperimental.com/api/nockchain/zorp", "Zorp link");

  const { GET: listReceipts } = loadTypeScriptModule("src/app/api/nockchain/nockup/receipts/route.ts");
  const receiptListResponse = await listReceipts();
  const receiptList = await receiptListResponse.json();
  const indexedReceipt = receiptList.receipts.find((candidate) => candidate.receiptId === receipt.receiptId);

  assertEqual(receiptListResponse.status, 200, "receipt list status");
  assertEqual(receiptList.version, "v0", "receipt list version");
  assertEqual(receiptList.storage.binding, "NOCKS_NOCKUP_RECEIPTS", "receipt list binding");
  assertEqual(Boolean(indexedReceipt), true, "submitted receipt appears in receipt index");
  assertEqual(indexedReceipt.summary.project, "counter-nockapp", "indexed receipt project");

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/nockchain/nockup/receipts/[receiptId]/route.ts");
  const detailResponse = await getReceipt(
    new Request(`https://nocksperimental.com/api/nockchain/nockup/receipts/${receipt.receiptId}`),
    { params: { receiptId: receipt.receiptId } }
  );
  const detail = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "receipt detail status");
  assertEqual(detail.receiptId, receipt.receiptId, "receipt detail id");
  assertEqual(detail.nockup.crate, "nockup", "receipt detail Nockup crate");
  assertEqual(detail.nockchain.commit.shortSha, "33ba97b1e206", "receipt detail Nockchain commit");

  const badResponse = await POST(
    new Request("https://nocksperimental.com/api/nockchain/nockup/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        project: {
          name: "leaky-nockup",
          template: "basic",
          seedPhrase: "do not store this"
        },
        commands: [
          {
            id: "nockup-build",
            command: "nockup build leaky-nockup",
            status: "pass",
            exitCode: 0
          }
        ]
      })
    })
  );
  const badReceipt = await badResponse.json();

  assertEqual(badResponse.status, 400, "bad submission status");
  assertEqual(badReceipt.accepted, false, "bad submission rejected");
  assertEqual(badReceipt.checks.noSecretFields, false, "bad submission secret check");
  assertIncludes(badReceipt.errors.join("\n"), "Nockup evidence contains secret-like fields.", "bad submission error");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "nockup-validation-submit", "/api/nockchain/nockup/submit", "Submit Nockup scaffold validation evidence");
  assertEndpoint(registryBody, "nockup-validation-receipts", "/api/nockchain/nockup/receipts", "List persisted Nockup validation receipts");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockupValidationSubmit,
    "https://nocksperimental.com/api/nockchain/nockup/submit",
    "well-known Nockup submit link"
  );
  assertEqual(
    wellKnownBody.links.nockupValidationReceipts,
    "https://nocksperimental.com/api/nockchain/nockup/receipts",
    "well-known Nockup receipts link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockup-validation-receipts", "well-known Nockup capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/nockup/submit"]?.post?.summary,
    "Submit Nockup scaffold validation evidence",
    "OpenAPI Nockup validation submit POST path"
  );
  assertEqual(
    openApiBody.paths["/api/nockchain/nockup/receipts"]?.get?.summary,
    "List persisted Nockup validation receipts",
    "OpenAPI Nockup validation receipts GET path"
  );
  assertEqual(
    openApiBody.paths["/api/nockchain/nockup/receipts/{receiptId}"]?.get?.summary,
    "Read persisted Nockup validation receipt",
    "OpenAPI Nockup validation receipt detail GET path"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockup-validation"],
    "node scripts/test-nockup-validation-api.mjs",
    "package Nockup validation test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockup-validation", "full test includes Nockup validation test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/nockup/submit", "Cloudflare smoke includes Nockup submit API");
  assertIncludes(smokeSource, "/api/nockchain/nockup/receipts", "Cloudflare smoke includes Nockup receipts API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockup Validation Receipts", "README documents Nockup validation receipts");
  assertIncludes(readme, "/api/nockchain/nockup/submit", "README documents Nockup submit endpoint");

  const wrangler = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");
  assertIncludes(wrangler, "NOCKS_NOCKUP_RECEIPTS", "Wrangler Nockup KV binding");
}

function createNockupPayload() {
  return {
    project: {
      name: "counter-nockapp",
      repo: "kgbrah/counter-nockapp",
      template: "basic",
      installPath: "apps/counter",
      nockupVersion: "upstream-master",
      commit: "33ba97b1e206dd89b15c61b72b7802caf2136c18"
    },
    commands: [
      {
        id: "nockup-new",
        command: "nockup new counter-nockapp --template basic --install-path apps/counter",
        status: "pass",
        exitCode: 0,
        startedAt: "2026-06-05T20:00:00.000Z",
        completedAt: "2026-06-05T20:00:03.000Z",
        outputHash: "sha256:nockup-new-output"
      },
      {
        id: "nockup-build",
        command: "nockup build counter-nockapp",
        status: "pass",
        exitCode: 0,
        completedAt: "2026-06-05T20:00:10.000Z",
        outputHash: "sha256:nockup-build-output"
      },
      {
        id: "nockup-run",
        command: "nockup run counter-nockapp",
        status: "pass",
        exitCode: 0,
        completedAt: "2026-06-05T20:00:20.000Z",
        outputHash: "sha256:nockup-run-output"
      }
    ],
    artifacts: [
      {
        path: "apps/counter/out.jam",
        kind: "jam",
        hash: "sha256:counter-out-jam",
        size: 1234,
        producedBy: "nockup-build"
      },
      {
        path: "apps/counter/nockup.toml",
        kind: "manifest",
        hash: "sha256:nockup-manifest",
        producedBy: "nockup-new"
      }
    ],
    fakenet: {
      endpoint: "http://127.0.0.1:5555",
      networkId: "local-fakenet",
      walletAddress: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
      accepted: true
    }
  };
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

    if (specifier === "@opennextjs/cloudflare") {
      return {
        getCloudflareContext: async () => {
          throw new Error("Cloudflare context is unavailable in tests");
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

function assertStartsWith(actual, prefix, label) {
  if (typeof actual !== "string" || !actual.startsWith(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(prefix)}`);
  }
}
