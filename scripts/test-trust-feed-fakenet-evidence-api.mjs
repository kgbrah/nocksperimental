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
  const { GET } = loadTypeScriptModule("src/app/api/trust/feed/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "feed status code");
  assertEqual(body.counts.localFakenetEvidence, 1, "local fakenet evidence event count");
  assertEqual(body.eventCount, body.events.length, "event count matches events");
  assertHasEventType(body, "local-fakenet-evidence");

  const fakenetEvent = body.events.find((event) => event.type === "local-fakenet-evidence");

  assertEqual(fakenetEvent.id.startsWith("local-fakenet-evidence-"), true, "fakenet event id");
  assertEqual(fakenetEvent.subjectId.startsWith("local_fakenet_evidence_"), true, "fakenet subject id");
  assertIncludes(fakenetEvent.summary, "Local fakenet evidence", "fakenet event summary");
  assertIncludes(fakenetEvent.summary, "blocked", "fakenet event status summary");
  assertEqual(fakenetEvent.url, "https://nocksperimental.com/api/fakenet/evidence", "fakenet event URL");
  assertStartsWith(fakenetEvent.evidence.rootHash, "sha256:", "fakenet event root hash");
  assertEqual(fakenetEvent.evidence.verificationStatus, "blocked", "fakenet event verification status");
  assertEqual(fakenetEvent.evidence.reportCount, 2, "fakenet event report count");
  assertEqual(fakenetEvent.evidence.endpoint, "127.0.0.1:5555", "fakenet event endpoint");
  assertEqual(
    fakenetEvent.evidence.walletAddress,
    "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
    "fakenet event wallet"
  );
  assertSortedDescending(body.events.map((event) => event.recordedAt), "feed event ordering");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:trust-feed-fakenet-evidence-api"],
    "node scripts/test-trust-feed-fakenet-evidence-api.mjs",
    "package trust feed fakenet test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:trust-feed-fakenet-evidence-api",
    "full test includes trust feed fakenet test"
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

function assertHasEventType(body, type) {
  if (!body.events.some((event) => event.type === type)) {
    throw new Error(`expected trust feed to include ${type}`);
  }
}

function assertSortedDescending(values, label) {
  const sorted = [...values].sort((left, right) => right.localeCompare(left));

  assertEqual(values.join("|"), sorted.join("|"), label);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}
