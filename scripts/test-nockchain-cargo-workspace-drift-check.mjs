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
  const scriptPath = "scripts/check-nockchain-cargo-workspace-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-cargo-workspace-drift"],
    "node scripts/check-nockchain-cargo-workspace-drift.mjs",
    "package cargo workspace drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-cargo-workspace-drift-check"],
    "node scripts/test-nockchain-cargo-workspace-drift-check.mjs",
    "package cargo workspace drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-cargo-workspace-drift-check",
    "full test includes cargo workspace drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/rust-atlas/route.ts");
  const response = await GET();
  const atlas = await response.json();
  const fixturePath = writeFixture(atlas);

  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", fixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.snapshot.localWorkspaceMemberCount, 36, "matching local member count");
  assertEqual(passingBody.snapshot.githubWorkspaceMemberCount, 36, "matching GitHub member count");
  assertEqual(passingBody.checks.resolverMatches, true, "matching resolver");
  assertEqual(passingBody.checks.workspaceMembersMatch, true, "matching members");
  assertEqual(passingBody.checks.manifestHashMatches, true, "matching manifest hash");
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
    "drift check documents raw Cargo source"
  );

  const missingFixturePath = writeFixture(atlas, { omitMember: "crates/nockchain-bridge-sequencer" });
  const missing = spawnSync(process.execPath, [scriptPath, "--fixture", missingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(missing.status, 1, "missing fixture exit status");
  const missingBody = JSON.parse(missing.stdout);
  assertEqual(missingBody.status, "drift", "missing fixture status");
  assertIncludes(
    missingBody.drift.extraLocalMembers,
    "crates/nockchain-bridge-sequencer",
    "drift detects local member missing from GitHub fixture"
  );

  const resolverFixturePath = writeFixture(atlas, { resolver: "3" });
  const resolver = spawnSync(process.execPath, [scriptPath, "--fixture", resolverFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(resolver.status, 1, "resolver fixture exit status");
  const resolverBody = JSON.parse(resolver.stdout);
  assertEqual(resolverBody.status, "drift", "resolver fixture status");
  assertIncludes(
    resolverBody.drift.workspaceMetadataDrift.map((entry) => entry.field),
    "resolver",
    "drift detects resolver change"
  );

  const hashFixturePath = writeFixture(atlas, {
    sha256: "0000000000000000000000000000000000000000000000000000000000000000"
  });
  const hash = spawnSync(process.execPath, [scriptPath, "--fixture", hashFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(hash.status, 1, "hash fixture exit status");
  const hashBody = JSON.parse(hash.stdout);
  assertEqual(hashBody.status, "drift", "hash fixture status");
  assertEqual(hashBody.drift.manifestHashDrift.field, "sha256", "drift detects manifest hash change");

  assertEqual(atlas.workspace.manifest.path, "Cargo.toml", "rust atlas manifest path");
  assertEqual(
    atlas.workspace.manifest.sha256,
    "a31885eb2d77adfb4d8583a52a62b8f05289087af1c4b10af616b6376b0773f0",
    "rust atlas Cargo manifest hash"
  );
  assertEqual(atlas.workspace.manifest.bytes, 9781, "rust atlas Cargo manifest bytes");
  assertStartsWith(atlas.workspace.workspaceMemberHash, "sha256:", "rust atlas workspace member hash");
  assertEqual(
    atlas.workspace.driftCheck.command,
    "npm run check:nockchain-cargo-workspace-drift -- --json",
    "rust atlas cargo workspace drift command"
  );
  assertIncludes(atlas.workspace.driftCheck.compareFields, "members", "rust atlas drift compares members");

  const apiTest = readText("scripts/test-nockchain-rust-atlas-api.mjs");
  assertIncludes(apiTest, "driftCheck", "rust atlas API test covers drift check");

  const pageTest = readText("scripts/test-nockchain-rust-page.mjs");
  assertIncludes(pageTest, "Workspace Drift Check", "rust atlas page test covers drift check");

  const readme = readText("README.md");
  assertIncludes(readme, "check:nockchain-cargo-workspace-drift", "README documents cargo workspace drift command");
}

function writeFixture(atlas, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-cargo-workspace-drift-"));
  const fixturePath = path.join(dir, "cargo-workspace.json");
  const members = atlas.workspace.coverage.trackedWorkspaceMembers.filter(
    (member) => member !== options.omitMember
  );
  const manifest = {
    path: "Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
    sha256: options.sha256 ?? atlas.workspace.manifest.sha256,
    bytes: atlas.workspace.manifest.bytes,
    resolver: options.resolver ?? atlas.workspace.resolver,
    members
  };

  writeFileSync(fixturePath, JSON.stringify({ manifest }, null, 2));

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

function assertStartsWith(actual, expected, label) {
  if (!actual?.startsWith?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`);
  }
}
