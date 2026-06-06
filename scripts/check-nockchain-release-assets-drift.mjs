#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const latestReleaseApiUrl = "https://api.github.com/repos/nockchain/nockchain/releases/latest";
const latestReleaseHtmlUrl = "https://github.com/nockchain/nockchain/releases/latest";
const compareAssetFields = ["size", "updatedAt", "downloadUrl"];
const compareReleaseFields = ["tag", "publishedAt", "targetCommitish"];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localRelease = loadTypeScriptModule(
    "src/lib/nockchain-release-assets.ts"
  ).createNockchainReleaseAssets();
  const githubRelease = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubRelease();
  const report = createDriftReport(localRelease, githubRelease);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report);
  }

  if (report.status !== "in-sync") {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    fixturePath: "",
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--fixture") {
      const fixturePath = args[index + 1];

      if (!fixturePath) {
        throw new Error("--fixture requires a path");
      }

      options.fixturePath = fixturePath;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function fetchGithubRelease() {
  const response = await fetch(latestReleaseApiUrl, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "nocksperimental-release-assets-drift-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub latest release API returned ${response.status}`);
  }

  return response.json();
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!Array.isArray(fixture.assets)) {
    throw new Error("Fixture must contain an assets array");
  }

  return fixture;
}

function createDriftReport(localRelease, githubRelease) {
  const localAssets = localRelease.assets.map(normalizeLocalAsset).sort(compareAssetNames);
  const githubAssets = githubRelease.assets.map(normalizeGithubAsset).sort(compareAssetNames);
  const releaseDrift = compareReleaseMetadata(localRelease, githubRelease);
  const assetDrift = compareAssets(localAssets, githubAssets);
  const checks = {
    releaseMetadataMatches: releaseDrift.length === 0,
    assetCountsMatch: localAssets.length === githubAssets.length,
    assetNamesMatch:
      assetDrift.missingLocalAssets.length === 0 && assetDrift.extraLocalAssets.length === 0,
    assetMetadataMatches: assetDrift.assetMetadataDrift.length === 0,
    manifestAssetPresent: githubAssets.some((asset) => asset.name === "nockchain-manifest.toml")
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: [latestReleaseApiUrl, latestReleaseHtmlUrl],
    interpretation:
      "Compares Nocksperimental's pinned uploaded release assets against GitHub's latest release API; GitHub's HTML asset count also includes generated source archives.",
    snapshot: {
      localReleaseTag: localRelease.release.tag,
      githubReleaseTag: githubRelease.tag_name,
      localAssetCount: localAssets.length,
      githubAssetCount: githubAssets.length,
      githubHtmlAssetCountLabel: "18 including generated source archives",
      localLatestAssetUpdatedAt: localAssets.map((asset) => asset.updatedAt).sort().at(-1),
      githubLatestAssetUpdatedAt: githubAssets.map((asset) => asset.updatedAt).sort().at(-1),
      manifestAsset: localRelease.release.manifestAsset?.name ?? null,
      manifestPresent: localRelease.release.manifestPresent
    },
    checks,
    drift: {
      releaseMetadataDrift: releaseDrift,
      missingLocalAssets: assetDrift.missingLocalAssets,
      extraLocalAssets: assetDrift.extraLocalAssets,
      assetMetadataDrift: assetDrift.assetMetadataDrift
    },
    nextActions: [
      "Refresh src/lib/nockchain-release-assets.ts before using release assets in fakenet, wallet, Nockup, or receipt evidence.",
      "Treat uploaded release assets as build provenance; do not store downloaded tarballs or unpacked binaries in git.",
      "Record the release tag, asset name, URL, size, platform, and manifest hashes in any receipt that cites a downloaded binary."
    ]
  };
}

function compareReleaseMetadata(localRelease, githubRelease) {
  const local = {
    tag: localRelease.release.tag,
    publishedAt: localRelease.release.publishedAt,
    targetCommitish: localRelease.release.targetCommitish
  };
  const github = {
    tag: githubRelease.tag_name,
    publishedAt: githubRelease.published_at,
    targetCommitish: githubRelease.target_commitish
  };
  const drift = [];

  for (const field of compareReleaseFields) {
    if (local[field] !== github[field]) {
      drift.push({
        field,
        local: local[field],
        github: github[field]
      });
    }
  }

  return drift;
}

function compareAssets(localAssets, githubAssets) {
  const localByName = new Map(localAssets.map((asset) => [asset.name, asset]));
  const githubByName = new Map(githubAssets.map((asset) => [asset.name, asset]));
  const missingLocalAssets = githubAssets
    .filter((asset) => !localByName.has(asset.name))
    .map((asset) => asset.name)
    .sort();
  const extraLocalAssets = localAssets
    .filter((asset) => !githubByName.has(asset.name))
    .map((asset) => asset.name)
    .sort();
  const assetMetadataDrift = [];

  for (const [name, localAsset] of localByName) {
    const githubAsset = githubByName.get(name);

    if (!githubAsset) {
      continue;
    }

    for (const field of compareAssetFields) {
      if (localAsset[field] !== githubAsset[field]) {
        assetMetadataDrift.push({
          asset: name,
          field,
          local: localAsset[field],
          github: githubAsset[field]
        });
      }
    }
  }

  return { missingLocalAssets, extraLocalAssets, assetMetadataDrift };
}

function normalizeLocalAsset(asset) {
  return {
    name: asset.name,
    size: asset.size,
    updatedAt: asset.updatedAt,
    downloadUrl: asset.downloadUrl
  };
}

function normalizeGithubAsset(asset) {
  return {
    name: asset.name,
    size: asset.size,
    updatedAt: asset.updated_at,
    downloadUrl: asset.browser_download_url
  };
}

function compareAssetNames(left, right) {
  return left.name.localeCompare(right.name);
}

function printTextReport(report) {
  console.log(`Nockchain release asset drift: ${report.status}`);
  console.log(`Local release: ${report.snapshot.localReleaseTag}`);
  console.log(`GitHub release: ${report.snapshot.githubReleaseTag}`);
  console.log(`Local assets: ${report.snapshot.localAssetCount}`);
  console.log(`GitHub API assets: ${report.snapshot.githubAssetCount}`);

  if (report.status === "in-sync") {
    return;
  }

  console.log(JSON.stringify(report.drift, null, 2));
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
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
