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
  const scriptPath = "scripts/check-nockchain-docs-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-docs-drift"],
    "node scripts/check-nockchain-docs-drift.mjs",
    "package docs drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-docs-drift-check"],
    "node scripts/test-nockchain-docs-drift-check.mjs",
    "package docs drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-docs-drift-check",
    "full test includes docs drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/knowledge-spine/route.ts");
  const response = await GET();
  const spine = await response.json();
  const fixturePath = writeFixture(spine);

  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", fixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.snapshot.localDocumentCount, 8, "matching local doc count");
  assertEqual(passingBody.snapshot.githubDocumentCount, 8, "matching GitHub doc count");
  assertEqual(passingBody.checks.documentPathsMatch, true, "matching document paths");
  assertEqual(passingBody.checks.documentHashesMatch, true, "matching document hashes");
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/START_HERE.md",
    "drift check documents raw START_HERE source"
  );

  const mutatedFixturePath = writeFixture(spine, {
    mutatePath: "PROTOCOL.md",
    mutateSha256: "0000000000000000000000000000000000000000000000000000000000000000"
  });
  const mutated = spawnSync(process.execPath, [scriptPath, "--fixture", mutatedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(mutated.status, 1, "mutated fixture exit status");
  const mutatedBody = JSON.parse(mutated.stdout);
  assertEqual(mutatedBody.status, "drift", "mutated fixture status");
  assertIncludes(
    mutatedBody.drift.documentHashDrift.map((entry) => entry.path),
    "PROTOCOL.md",
    "drift detects PROTOCOL hash change"
  );

  const missingFixturePath = writeFixture(spine, { omitPath: "DECISIONS/README.md" });
  const missing = spawnSync(process.execPath, [scriptPath, "--fixture", missingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(missing.status, 1, "missing fixture exit status");
  const missingBody = JSON.parse(missing.stdout);
  assertEqual(missingBody.status, "drift", "missing fixture status");
  assertIncludes(
    missingBody.drift.extraLocalDocuments,
    "DECISIONS/README.md",
    "drift detects extra local document"
  );

  assertEqual(
    spine.driftCheck.command,
    "npm run check:nockchain-docs-drift -- --json",
    "knowledge spine docs drift command"
  );
  assertIncludes(spine.driftCheck.compareFields, "sha256", "knowledge spine docs drift hash field");
  assertIncludes(spine.driftCheck.documentPaths, "START_HERE.md", "knowledge spine docs drift path list");

  const apiTest = readText("scripts/test-nockchain-knowledge-spine-api.mjs");
  assertIncludes(apiTest, "driftCheck", "knowledge spine API test covers drift check");

  const pageTest = readText("scripts/test-nockchain-knowledge-spine-page.mjs");
  assertIncludes(pageTest, "Drift Check", "knowledge spine page test covers drift check");

  const readme = readText("README.md");
  assertIncludes(readme, "check:nockchain-docs-drift", "README documents docs drift command");
}

function writeFixture(spine, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-docs-drift-"));
  const fixturePath = path.join(dir, "documents.json");
  const documents = spine.documentFingerprints
    .filter((doc) => doc.path !== options.omitPath)
    .map((doc) => ({
      path: doc.path,
      sha256:
        doc.path === options.mutatePath && options.mutateSha256
          ? options.mutateSha256
          : doc.sha256,
      bytes: 1,
      sourceUrl: `https://raw.githubusercontent.com/nockchain/nockchain/master/${doc.path}`
    }));

  writeFileSync(fixturePath, JSON.stringify({ documents }, null, 2));

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
