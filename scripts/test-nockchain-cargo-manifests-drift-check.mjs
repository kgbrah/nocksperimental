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
  const scriptPath = "scripts/check-nockchain-cargo-manifests-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-cargo-manifests-drift"],
    "node scripts/check-nockchain-cargo-manifests-drift.mjs",
    "package cargo manifest drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-cargo-manifests-drift-check"],
    "node scripts/test-nockchain-cargo-manifests-drift-check.mjs",
    "package cargo manifest drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-cargo-manifests-drift-check",
    "full test includes cargo manifest drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/cargo-surface/route.ts");
  const response = await GET();
  const surface = await response.json();

  assertEqual(surface.workspace.manifestSnapshots.length, 36, "manifest snapshot count");
  assertStartsWith(surface.workspace.manifestCatalogHash, "sha256:", "manifest catalog hash");
  assertEqual(
    surface.workspace.manifestDriftCheck.command,
    "npm run check:nockchain-cargo-manifests-drift -- --json",
    "cargo surface manifest drift command"
  );
  assertIncludes(
    surface.workspace.manifestDriftCheck.compareFields,
    "manifestCatalogHash",
    "manifest drift compares aggregate hash"
  );
  assertManifest(
    surface,
    "crates/nockchain-wallet/Cargo.toml",
    "2792027e73adef88737cedbe3ffbe093d64f070580151d3823406051346fc32b",
    1035
  );
  assertManifest(
    surface,
    "crates/nockchain-libp2p-io/Cargo.toml",
    "6bd30a9547e2cb55f45d3d0cadd32236ffd9b377026b46e67ad8100060095982",
    1737
  );
  assertIncludes(surface.evidenceContract.requiredFields, "manifestSha256", "contract records manifest hash");

  const passingFixturePath = writeFixture(surface);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(passingBody.snapshot.localManifestCount, 36, "matching local manifest count");
  assertEqual(passingBody.snapshot.githubManifestCount, 36, "matching GitHub manifest count");
  assertEqual(passingBody.checks.manifestPathsMatch, true, "matching manifest paths");
  assertEqual(passingBody.checks.manifestHashesMatch, true, "matching manifest hashes");
  assertEqual(passingBody.checks.manifestCatalogHashMatches, true, "matching manifest catalog hash");
  assertIncludes(
    passingBody.sourceUrls,
    "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-wallet/Cargo.toml",
    "drift check documents wallet manifest source"
  );

  const changedFixturePath = writeFixture(surface, {
    mutatePath: "crates/nockchain-wallet/Cargo.toml",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(changed.status, 1, "changed manifest fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed manifest fixture status");
  assertIncludes(
    changedBody.drift.manifestHashDrift.map((entry) => entry.path),
    "crates/nockchain-wallet/Cargo.toml",
    "drift detects wallet manifest hash change"
  );
  assertIncludes(
    changedBody.drift.manifestHashDrift.map((entry) => entry.field),
    "bytes",
    "drift detects byte count change"
  );

  const missingFixturePath = writeFixture(surface, { omitPath: "crates/nockchain-bridge-sequencer/Cargo.toml" });
  const missing = spawnSync(process.execPath, [scriptPath, "--fixture", missingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(missing.status, 1, "missing manifest fixture exit status");
  const missingBody = JSON.parse(missing.stdout);
  assertIncludes(
    missingBody.drift.extraLocalManifests,
    "crates/nockchain-bridge-sequencer/Cargo.toml",
    "drift detects local manifest absent upstream"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "cargo-manifests", "aggregate includes cargo manifests check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-cargo-manifests-drift",
    "aggregate runs cargo manifests check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "cargo-manifests",
    "watch aggregate includes cargo manifests"
  );

  const cargoPage = readText("src/app/nockchain/cargo-surface/page.tsx");
  assertIncludes(cargoPage, "Manifest Drift Check", "cargo surface page renders manifest drift check");
  assertIncludes(
    cargoPage,
    "npm run check:nockchain-cargo-manifests-drift -- --json",
    "cargo surface page renders manifest drift command"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-cargo-manifests-drift",
    "README documents cargo manifest drift command"
  );
}

function writeFixture(surface, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-cargo-manifests-drift-"));
  const fixturePath = path.join(dir, "cargo-manifests.json");
  const manifests = surface.workspace.manifestSnapshots
    .filter((manifest) => manifest.path !== options.omitPath)
    .map((manifest) =>
      manifest.path === options.mutatePath
        ? {
            ...manifest,
            sha256: options.sha256 ?? manifest.sha256,
            bytes: options.bytes ?? manifest.bytes
          }
        : manifest
    );
  const fixture = {
    manifestRoot: {
      path: "Cargo.toml",
      rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
      sha256: "a31885eb2d77adfb4d8583a52a62b8f05289087af1c4b10af616b6376b0773f0",
      bytes: 9781,
      resolver: "2",
      members: manifests.map((manifest) => manifest.path.replace(/\/Cargo\.toml$/, ""))
    },
    manifests
  };

  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  return fixturePath;
}

function assertManifest(surface, manifestPath, sha256, bytes) {
  const manifest = surface.workspace.manifestSnapshots.find((candidate) => candidate.path === manifestPath);

  if (!manifest) {
    throw new Error(`Missing manifest snapshot: ${manifestPath}`);
  }

  assertEqual(manifest.sha256, sha256, `${manifestPath} sha256`);
  assertEqual(manifest.bytes, bytes, `${manifestPath} bytes`);
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
