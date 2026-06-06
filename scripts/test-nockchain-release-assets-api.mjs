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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/release-assets/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "release assets status");
  assertEqual(body.version, "v0", "release assets version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/release-assets",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "release commit short sha");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "release tag"
  );
  assertEqual(body.release.targetCommitish, "master", "release target branch");
  assertEqual(body.release.assetCount, 16, "release asset count");
  assertEqual(body.release.commitMatchesTag, true, "release tag commit match");
  assertEqual(body.release.manifestPresent, true, "release manifest present");
  assertEqual(body.manifest.version, "1", "manifest version");
  assertEqual(body.manifest.date, "2026-06-06", "manifest date");
  assertEqual(
    body.manifest.commit,
    "33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "manifest commit"
  );
  assertEqual(body.manifest.commitShort, "33ba97b", "manifest short commit");
  assertEqual(body.manifest.targetCount, 15, "manifest target count");
  assertEqual(body.manifest.hashes.hashBlake3Count, 15, "manifest BLAKE3 hash count");
  assertEqual(body.manifest.hashes.hashSha1Count, 15, "manifest SHA1 hash count");
  assertEqual(body.manifest.coverage.hashedAssetCount, 15, "hashed asset count");
  assertEqual(body.manifest.coverage.unhashedAssetCount, 1, "unhashed asset count");
  assertIncludes(
    body.manifest.coverage.assetsWithoutManifestHashes,
    "nockchain-manifest.toml",
    "manifest asset is un-hashed by itself"
  );
  assertIncludes(body.release.platformTriples, "aarch64-apple-darwin", "mac arm64 platform");
  assertIncludes(body.release.platformTriples, "aarch64-unknown-linux-gnu", "linux arm64 platform");
  assertIncludes(body.release.platformTriples, "x86_64-unknown-linux-gnu", "linux x64 platform");
  assertEqual(
    body.driftCheck.command,
    "npm run check:nockchain-release-assets-drift -- --json",
    "release asset drift check command"
  );
  assertEqual(
    body.driftCheck.testCommand,
    "npm run test:nockchain-release-assets-drift-check",
    "release asset drift check test command"
  );
  assertIncludes(body.driftCheck.compareFields, "updatedAt", "release asset drift updatedAt field");
  assertIncludes(body.driftCheck.sourceUrls, "https://github.com/nockchain/nockchain/releases/latest", "release asset drift GitHub page");
  assertIncludes(
    body.driftCheck.sourceArchivePolicy,
    "generated source archives",
    "release asset drift source archive policy"
  );

  assertToolGroup(body, "nockchain", 3);
  assertToolGroup(body, "nockchain-wallet", 3);
  assertToolGroup(body, "nockup", 3);
  assertToolGroup(body, "hoon", 3);
  assertToolGroup(body, "hoonc", 3);
  assertToolGroup(body, "manifest", 1);

  assertAsset(body, "nockchain-x86_64-unknown-linux-gnu.tar.gz", {
    tool: "nockchain",
    platform: "x86_64-unknown-linux-gnu",
    size: 52807818,
    kind: "binary-tarball",
    hashBlake3: "46ef027463b3bccfa1d3ddc7de4a80d5884a6452e3a2119aac264353b20ff5cb",
    hashSha1: "5e5126ec561c1bfd0677ce8eff79d93bdceb3ee9"
  });
  assertAsset(body, "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz", {
    tool: "nockchain-wallet",
    platform: "aarch64-unknown-linux-gnu",
    size: 31816862,
    kind: "binary-tarball",
    hashBlake3: "e57a287abc5adf1a227e3737134c6e87398d1163d567d5a7d61529241142bedc",
    hashSha1: "059b7a54d64d161930c5803a1e046c28245ccda4"
  });
  assertAsset(body, "nockup-x86_64-unknown-linux-gnu.tar.gz", {
    tool: "nockup",
    platform: "x86_64-unknown-linux-gnu",
    size: 11382286,
    kind: "binary-tarball",
    hashBlake3: "7ff15ecdf36ac4d06818a4a73d0b59afda4c1b56f10a71155f5d0399cea45940",
    hashSha1: "d7e2fcf6199f2948f62c3d6ba87a854afa843091"
  });
  assertAsset(body, "nockchain-manifest.toml", {
    tool: "manifest",
    platform: "all",
    size: 6686,
    kind: "release-manifest",
    hashBlake3: null,
    hashSha1: null
  });
  assertManifestTarget(body, "hoon", "x86_64-unknown-linux-gnu", {
    assetName: "hoon-x86_64-unknown-linux-gnu.tar.gz",
    hashBlake3: "d9b0a8e3f1542166de5fb5f8de70383a588e1f273a2fd41329d7a8c546c061b9",
    hashSha1: "c1cea5a0b572b4a407a9db86cd68f47a0df39e4c"
  });

  assertIncludes(body.provenance.requiredReceiptFields, "nockchainReleaseAsset", "asset receipt field");
  assertIncludes(body.provenance.requiredReceiptFields, "releaseManifestUrl", "manifest receipt field");
  assertIncludes(body.provenance.requiredReceiptFields, "releaseAssetHashBlake3", "BLAKE3 receipt field");
  assertIncludes(body.provenance.requiredReceiptFields, "releaseAssetHashSha1", "SHA1 receipt field");
  assertIncludes(
    body.provenance.operatorChecklist,
    "Record the exact release asset name and URL before using a downloaded binary for fakenet, wallet, or Nockup evidence.",
    "asset provenance checklist"
  );
  assertIncludes(
    body.provenance.doNotStore,
    "downloaded release tarballs",
    "do not store downloaded tarballs"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-release-assets",
    "/api/nockchain/release-assets",
    "Nockchain release asset manifest"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainReleaseAssets,
    "https://nocksperimental.com/api/nockchain/release-assets",
    "well-known release assets link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-release-asset-manifest", "release assets capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/release-assets"]?.get?.summary,
    "Nockchain release asset manifest",
    "OpenAPI release assets path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainReleaseAssets, 16, "checkpoint release asset count");
  assertEqual(checkpointBody.counts.nockchainReleaseManifestTargets, 15, "checkpoint manifest target count");
  assertStartsWith(checkpointBody.roots.nockchainReleaseAssets, "sha256:", "checkpoint release assets root");
  assertEqual(checkpointBody.checks.nockchainReleaseAssetsAvailable, true, "checkpoint release assets guard");
  assertEqual(
    checkpointBody.checks.nockchainReleaseManifestHashesAvailable,
    true,
    "checkpoint release manifest hash guard"
  );
  assertEqual(
    checkpointBody.links.nockchainReleaseAssets,
    "https://nocksperimental.com/api/nockchain/release-assets",
    "checkpoint release assets link"
  );

  const pagePath = "src/app/nockchain/releases/page.tsx";
  assertFile(pagePath);
  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainReleaseAssets", "release page uses manifest");
  assertIncludes(page, "Nockchain Release Assets", "release page title");
  assertIncludes(page, "Drift Check", "release page renders drift check");
  assertIncludes(
    page,
    "npm run check:nockchain-release-assets-drift -- --json",
    "release page renders drift check command"
  );
  assertIncludes(
    page,
    "https://api.github.com/repos/nockchain/nockchain/releases/latest",
    "release page renders latest release API source"
  );
  assertIncludes(page, "nockchain-manifest.toml", "release page renders manifest asset");
  assertIncludes(page, "nockchain-wallet-aarch64-unknown-linux-gnu.tar.gz", "release page renders wallet asset");
  assertIncludes(page, "hash_blake3", "release page renders BLAKE3 label");
  assertIncludes(page, "manifest.coverage.hashedAssetCount", "release page renders hash coverage");
  assertIncludes(page, 'href="/api/nockchain/release-assets"', "release page links API");
  assertIncludes(page, 'href="/nockchain"', "release page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/releases"', "Nockchain page links releases page");
  assertEqual(
    packageJson.scripts["test:nockchain-release-assets"],
    "node scripts/test-nockchain-release-assets-api.mjs",
    "package release assets test script"
  );
  assertEqual(
    packageJson.scripts["check:nockchain-release-assets-drift"],
    "node scripts/check-nockchain-release-assets-drift.mjs",
    "package release assets drift script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-release-assets", "full test includes release assets");
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-release-assets-drift-check",
    "full test includes release assets drift check"
  );
  assertIncludes(smokeScript, "/api/nockchain/release-assets", "Cloudflare smoke includes release assets API");
  assertIncludes(smokeScript, "/nockchain/releases", "Cloudflare smoke includes release assets page");
  assertIncludes(readme, "Nockchain Release Asset Manifest", "README documents release assets");
  assertIncludes(readme, "BLAKE3 and SHA1", "README documents manifest hashes");
  assertIncludes(readme, "/api/nockchain/release-assets", "README documents release assets endpoint");
  assertIncludes(readme, "/nockchain/releases", "README documents release assets page");
}

function assertToolGroup(body, tool, count) {
  const group = body.assetGroups.find((candidate) => candidate.tool === tool);

  if (!group) {
    throw new Error(`Missing asset group: ${tool}`);
  }

  assertEqual(group.count, count, `${tool} asset count`);
}

function assertAsset(body, name, expected) {
  const asset = body.assets.find((candidate) => candidate.name === name);

  if (!asset) {
    throw new Error(`Missing release asset: ${name}`);
  }

  assertEqual(asset.tool, expected.tool, `${name} tool`);
  assertEqual(asset.platform, expected.platform, `${name} platform`);
  assertEqual(asset.size, expected.size, `${name} size`);
  assertEqual(asset.kind, expected.kind, `${name} kind`);
  assertEqual(asset.hashBlake3, expected.hashBlake3, `${name} BLAKE3 hash`);
  assertEqual(asset.hashSha1, expected.hashSha1, `${name} SHA1 hash`);
  assertStartsWith(asset.downloadUrl, "https://github.com/nockchain/nockchain/releases/download/", `${name} download URL`);
}

function assertManifestTarget(body, tool, platform, expected) {
  const target = body.manifest.targets.find(
    (candidate) => candidate.tool === tool && candidate.platform === platform
  );

  if (!target) {
    throw new Error(`Missing manifest target: ${tool} ${platform}`);
  }

  assertEqual(target.assetName, expected.assetName, `${tool} ${platform} asset name`);
  assertEqual(target.hashBlake3, expected.hashBlake3, `${tool} ${platform} BLAKE3 hash`);
  assertEqual(target.hashSha1, expected.hashSha1, `${tool} ${platform} SHA1 hash`);
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

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
