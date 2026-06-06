#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scriptPath = "scripts/check-nockchain-pr-radar-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-pr-radar-drift"],
    "node scripts/check-nockchain-pr-radar-drift.mjs",
    "package drift check script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-pr-radar-drift-check",
    "full test includes PR radar drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/pr-radar/route.ts");
  const response = await GET();
  const radar = await response.json();
  const fixturePath = writeFixture(radar);

  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", fixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.snapshot.openPullRequestCount, 35, "matching fixture PR count");
  assertEqual(passingBody.snapshot.openIssueCount, 1, "matching fixture issue count");
  assertEqual(passingBody.checks.prNumbersMatch, true, "matching fixture PR numbers");
  assertEqual(passingBody.checks.issueNumbersMatch, true, "matching fixture issue numbers");
  assertEqual(passingBody.checks.metadataMatches, true, "matching fixture metadata");
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc",
    "drift check documents PR API source"
  );

  const driftFixturePath = writeFixture(radar, { omitPr: 125 });
  const drifting = spawnSync(
    process.execPath,
    [scriptPath, "--fixture", driftFixturePath, "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );

  assertEqual(drifting.status, 1, "drifting fixture exit status");
  const driftingBody = JSON.parse(drifting.stdout);
  assertEqual(driftingBody.status, "drift", "drifting fixture status");
  assertIncludes(driftingBody.drift.extraLocalPrNumbers, 125, "drift detects extra local PR");

  const radarApiTest = readText("scripts/test-nockchain-pr-radar-api.mjs");
  assertIncludes(
    radarApiTest,
    "check:nockchain-pr-radar-drift",
    "PR radar API test covers drift command"
  );

  const pageTest = readText("scripts/test-nockchain-pr-radar-page.mjs");
  assertIncludes(pageTest, "Drift Check", "PR radar page test covers drift check");
}

function writeFixture(radar, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-pr-radar-"));
  const fixturePath = path.join(dir, "github.json");
  const pulls = radar.pullRequests
    .filter((pullRequest) => pullRequest.number !== options.omitPr)
    .map((pullRequest) => ({
      number: pullRequest.number,
      title: pullRequest.title,
      draft: pullRequest.draft,
      updated_at: pullRequest.updatedAt,
      created_at: pullRequest.createdAt ?? pullRequest.updatedAt,
      html_url: pullRequest.url,
      head: { ref: `fixture-pr-${pullRequest.number}` },
      user: { login: pullRequest.author }
    }));
  const issues = radar.openIssues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    updated_at: issue.updatedAt,
    created_at: issue.updatedAt,
    html_url: issue.url,
    user: { login: issue.author }
  }));

  writeFileSync(fixturePath, JSON.stringify({ pulls, issues }, null, 2));

  return fixturePath;
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

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}
