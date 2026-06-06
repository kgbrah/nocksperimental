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
  const scriptPath = "scripts/check-nockchain-release-assets-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-release-assets-drift"],
    "node scripts/check-nockchain-release-assets-drift.mjs",
    "package release asset drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-release-assets-drift-check"],
    "node scripts/test-nockchain-release-assets-drift-check.mjs",
    "package release asset drift check test"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-release-assets-drift-check",
    "full test includes release asset drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/release-assets/route.ts");
  const response = await GET();
  const releaseAssets = await response.json();
  const fixturePath = writeFixture(releaseAssets);

  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", fixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.snapshot.localAssetCount, 16, "matching fixture local asset count");
  assertEqual(passingBody.snapshot.githubAssetCount, 16, "matching fixture GitHub asset count");
  assertEqual(passingBody.snapshot.githubHtmlAssetCountLabel, "18 including generated source archives", "HTML asset count note");
  assertEqual(passingBody.checks.releaseMetadataMatches, true, "matching fixture release metadata");
  assertEqual(passingBody.checks.assetNamesMatch, true, "matching fixture asset names");
  assertEqual(passingBody.checks.assetMetadataMatches, true, "matching fixture asset metadata");
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/releases/latest",
    "drift check documents GitHub latest release API source"
  );

  const mutatedFixturePath = writeFixture(releaseAssets, {
    mutateAsset: "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz",
    mutateUpdatedAt: "2026-06-06T06:06:06Z"
  });
  const mutated = spawnSync(process.execPath, [scriptPath, "--fixture", mutatedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(mutated.status, 1, "mutated fixture exit status");
  const mutatedBody = JSON.parse(mutated.stdout);
  assertEqual(mutatedBody.status, "drift", "mutated fixture status");
  assertIncludes(
    mutatedBody.drift.assetMetadataDrift.map((entry) => `${entry.asset}:${entry.field}`),
    "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz:updatedAt",
    "drift detects release asset updatedAt change"
  );

  const missingFixturePath = writeFixture(releaseAssets, {
    omitAsset: "nockup-x86_64-unknown-linux-gnu.tar.gz"
  });
  const missing = spawnSync(process.execPath, [scriptPath, "--fixture", missingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(missing.status, 1, "missing fixture exit status");
  const missingBody = JSON.parse(missing.stdout);
  assertEqual(missingBody.status, "drift", "missing fixture status");
  assertIncludes(
    missingBody.drift.extraLocalAssets,
    "nockup-x86_64-unknown-linux-gnu.tar.gz",
    "drift detects extra local release asset"
  );

  assertEqual(
    releaseAssets.driftCheck.command,
    "npm run check:nockchain-release-assets-drift -- --json",
    "release assets drift command"
  );
  assertIncludes(releaseAssets.driftCheck.compareFields, "updatedAt", "release assets compare updatedAt");
  assertIncludes(releaseAssets.driftCheck.sourceUrls, "https://github.com/nockchain/nockchain/releases/latest", "release assets GitHub source");

  const apiTest = readText("scripts/test-nockchain-release-assets-api.mjs");
  assertIncludes(apiTest, "driftCheck", "release assets API test covers drift check");

  const pageTestSource = apiTest;
  assertIncludes(pageTestSource, "Drift Check", "release assets page test covers drift check");

  const readme = readText("README.md");
  assertIncludes(readme, "check:nockchain-release-assets-drift", "README documents release asset drift check");
}

function writeFixture(releaseAssets, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-release-assets-drift-"));
  const fixturePath = path.join(dir, "github-release.json");
  const assets = releaseAssets.assets
    .filter((asset) => asset.name !== options.omitAsset)
    .map((asset) => {
      const updatedAt =
        asset.name === options.mutateAsset && options.mutateUpdatedAt
          ? options.mutateUpdatedAt
          : asset.updatedAt;

      return {
        name: asset.name,
        size: asset.size,
        updated_at: updatedAt,
        browser_download_url: asset.downloadUrl
      };
    });

  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        tag_name: releaseAssets.release.tag,
        name: releaseAssets.release.name,
        html_url: releaseAssets.release.url,
        published_at: releaseAssets.release.publishedAt,
        target_commitish: releaseAssets.release.targetCommitish,
        assets
      },
      null,
      2
    )
  );

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
