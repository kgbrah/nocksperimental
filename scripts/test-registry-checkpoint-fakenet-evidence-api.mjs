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

  assertEqual(response.status, 200, "checkpoint response status");
  assertGreaterThan(body.counts.localFakenetReports, 0, "local fakenet report count");
  assertStartsWith(body.roots.localFakenetEvidence, "sha256:", "local fakenet evidence root");
  assertEqual(body.checks.localFakenetEvidenceAvailable, true, "local fakenet evidence available");
  assertEqual(body.fakenetEvidence.status, "blocked", "local fakenet evidence status");
  assertEqual(body.fakenetEvidence.reportCount, body.counts.localFakenetReports, "fakenet report count mirror");
  assertEqual(body.fakenetEvidence.verifierReady, false, "local fakenet verifier readiness");
  assertEqual(body.fakenetEvidence.endpoint, "127.0.0.1:5555", "local fakenet endpoint");
  assertEqual(
    body.fakenetEvidence.walletAddress,
    "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    "local fakenet wallet"
  );
  assertEqual(body.links.fakenetEvidence, "https://nocksperimental.com/api/fakenet/evidence", "fakenet evidence link");
  assertEqual(
    body.links.fakenetEvidenceVerifier,
    "https://nocksperimental.com/api/fakenet/evidence/verify",
    "fakenet evidence verifier link"
  );

  const verifyIndex = await loadTypeScriptModule("src/app/api/verify/route.ts").GET();
  const verifyBody = await verifyIndex.json();

  assertStartsWith(
    verifyBody.samples.registryCheckpoint.roots.localFakenetEvidence,
    "sha256:",
    "verification sample includes fakenet evidence root"
  );
  assertGreaterThan(
    verifyBody.samples.registryCheckpoint.counts.localFakenetReports,
    0,
    "verification sample includes fakenet count"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:registry-checkpoint-fakenet-evidence-api"],
    "node scripts/test-registry-checkpoint-fakenet-evidence-api.mjs",
    "package checkpoint fakenet evidence test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:registry-checkpoint-fakenet-evidence-api",
    "full test includes checkpoint fakenet evidence test"
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

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
