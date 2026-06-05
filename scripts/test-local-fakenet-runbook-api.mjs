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
  const { GET } = loadTypeScriptModule("src/app/api/fakenet/runbook.sh/route.ts");
  const response = await GET();
  const body = await response.text();

  assertEqual(response.status, 200, "runbook response status");
  assertEqual(
    response.headers.get("content-type"),
    "text/x-shellscript; charset=utf-8",
    "runbook content type"
  );
  assertEqual(
    response.headers.get("content-disposition"),
    'attachment; filename="nocksperimental-fakenet-runbook.sh"',
    "runbook content disposition"
  );
  assertIncludes(body, "#!/usr/bin/env bash", "runbook shebang");
  assertIncludes(body, "set -euo pipefail", "runbook strict shell mode");
  assertIncludes(body, 'bash -lc "$*"', "runbook executes composed commands");
  assertIncludes(body, "FAKENET_ENDPOINT=\"127.0.0.1:5555\"", "runbook endpoint");
  assertIncludes(
    body,
    "FAKENET_WALLET=\"532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ\"",
    "runbook wallet"
  );
  assertIncludes(body, "fakenock --start", "runbook start command");
  assertIncludes(body, "fakenock --balance", "runbook balance command");
  assertIncludes(body, "npm run lab:local", "runbook health report command");
  assertIncludes(body, "npm run lab:local:balance", "runbook balance report command");
  assertIncludes(body, "npm run lab:local:chain", "runbook chain report command");
  assertIncludes(body, "npm run lab:local:peek", "runbook peek report command");
  assertIncludes(body, "npm run lab:local:poke", "runbook poke report command");
  assertIncludes(body, "curl http://127.0.0.1:3000/api/fakenet", "runbook readiness API command");
  assertIncludes(body, ".nocklab/local-fakenet-health.report.json", "runbook report output");

  const commandKit = await loadTypeScriptModule("src/app/api/fakenet/commands/route.ts").GET();
  const commandKitBody = await commandKit.json();

  assertEqual(
    commandKitBody.runbookUrl,
    "https://nocksperimental.com/api/fakenet/runbook.sh",
    "command kit runbook URL"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(registryBody, "local-fakenet-runbook", "/api/fakenet/runbook.sh", "Local fakenet shell runbook");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/fakenet/runbook.sh"]?.get?.summary,
    "Local fakenet shell runbook",
    "OpenAPI fakenet runbook path"
  );

  const fakenetPageSource = readFileSync(path.join(process.cwd(), "src/app/fakenet/page.tsx"), "utf8");
  assertIncludes(fakenetPageSource, 'href="/api/fakenet/runbook.sh"', "fakenet page runbook link");
  assertIncludes(fakenetPageSource, "commandKit.runbookUrl", "fakenet page runbook data");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:local-fakenet-runbook-api"],
    "node scripts/test-local-fakenet-runbook-api.mjs",
    "package runbook test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:local-fakenet-runbook-api", "full test includes runbook test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/fakenet/runbook.sh", "Cloudflare smoke includes fakenet runbook API");

  const deploymentDocs = readFileSync(path.join(process.cwd(), "docs/deployment.md"), "utf8");
  assertIncludes(deploymentDocs, "/api/fakenet/runbook.sh", "deployment docs include fakenet runbook API");
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
  if (!collection.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
