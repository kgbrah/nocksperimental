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
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/commands/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "commands response status");
  assertEqual(body.version, "v0", "commands version");
  assertEqual(body.service, "nocksperimental", "commands service");
  assertEqual(body.subject, "nocksperimental.com", "commands subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/fakenet/commands", "commands canonical URL");
  assertEqual(body.endpoint, "127.0.0.1:5555", "commands endpoint");
  assertEqual(
    body.wallet.address,
    "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx",
    "commands wallet address"
  );
  assertIncludes(body.refreshSequence, "npm run lab:local", "refresh sequence health command");
  assertIncludes(body.refreshSequence, "npm run lab:local:balance", "refresh sequence balance command");
  assertIncludes(body.refreshSequence, "npm run lab:local:chain", "refresh sequence chain command");
  assertIncludes(body.refreshSequence, "npm run lab:local:peek", "refresh sequence peek command");
  assertIncludes(body.refreshSequence, "npm run lab:local:poke", "refresh sequence poke command");
  assertCommand(body, "start-fakenet", "fakenock --start");
  assertCommand(body, "refresh-readiness", "npm run lab:local && npm run lab:local:balance && npm run lab:local:chain");
  assertCommand(body, "check-balance", "fakenock --balance");
  assertCommand(body, "open-readiness-api", "curl http://127.0.0.1:3000/api/fakenet");
  assertEqual(body.reportOutputs[0].json, ".nocklab/local-fakenet-health.report.json", "first report output");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(registryBody, "local-fakenet-commands", "/api/fakenet/commands", "Local fakenet command kit");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/commands"]?.get?.summary,
    "Local fakenet command kit",
    "OpenAPI fakenet commands path"
  );

  const fakenetPageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(fakenetPageSource, 'href="/api/fakenet/commands"', "fakenet page command kit link");
  assertIncludes(fakenetPageSource, "createLocalFakenetCommandKit", "fakenet page command kit data");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-commands-api"],
    "node scripts/test-local-fakenet-commands-api.mjs",
    "package command kit test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:local-fakenet-commands-api", "full test includes command kit test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/commands", "Cloudflare smoke includes fakenet commands API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/commands", "deployment docs include fakenet commands API");
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

function assertCommand(body, id, command) {
  const commandEntry = body.commands.find((candidate) => candidate.id === id);

  if (!commandEntry) {
    throw new Error(`Missing command: ${id}`);
  }

  assertEqual(commandEntry.command, command, `${id} command`);
}

function assertIncludes(collection, expected, label) {
  if (!collection.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
