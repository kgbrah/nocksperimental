#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const rawCargoManifestUrl = "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml";
const cargoManifestHtmlUrl = "https://github.com/nockchain/nockchain/blob/master/Cargo.toml";
const cratesTreeUrl = "https://github.com/nockchain/nockchain/tree/master/crates";
const compareFields = ["manifestPaths", "manifestSha256", "manifestBytes", "manifestCatalogHash"];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const surface = loadTypeScriptModule("src/lib/nockchain-cargo-surface.ts").createNockchainCargoSurface();
  const githubSnapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubManifestCatalog();
  const report = createDriftReport(surface, githubSnapshot);

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

async function fetchGithubManifestCatalog() {
  const rootResponse = await fetch(rawCargoManifestUrl, {
    headers: {
      accept: "text/plain",
      "user-agent": "nocksperimental-cargo-manifests-drift-check"
    }
  });

  if (!rootResponse.ok) {
    throw new Error(`GitHub raw Cargo.toml returned ${rootResponse.status}`);
  }

  const rootCargoToml = await rootResponse.text();
  const workspace = parseCargoWorkspace(rootCargoToml);
  const manifestPaths = workspace.members.map((member) => `${member}/Cargo.toml`);
  const manifests = await Promise.all(manifestPaths.map(fetchCrateManifest));

  return {
    manifestRoot: {
      path: "Cargo.toml",
      rawUrl: rawCargoManifestUrl,
      sha256: createSha256(rootCargoToml),
      bytes: Buffer.byteLength(rootCargoToml, "utf8"),
      resolver: workspace.resolver,
      members: workspace.members
    },
    manifests
  };
}

async function fetchCrateManifest(manifestPath) {
  const rawUrl = `https://raw.githubusercontent.com/nockchain/nockchain/master/${manifestPath}`;
  const response = await fetch(rawUrl, {
    headers: {
      accept: "text/plain",
      "user-agent": "nocksperimental-cargo-manifests-drift-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub raw ${manifestPath} returned ${response.status}`);
  }

  const cargoToml = await response.text();

  return {
    path: manifestPath,
    rawUrl,
    sha256: createSha256(cargoToml),
    bytes: Buffer.byteLength(cargoToml, "utf8")
  };
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!Array.isArray(fixture.manifests)) {
    throw new Error("Fixture must contain a manifests array");
  }

  return fixture;
}

function createDriftReport(surface, githubSnapshot) {
  const local = normalizeLocalCatalog(surface);
  const github = normalizeGithubCatalog(githubSnapshot);
  const manifestDrift = compareManifestCatalog(local.manifests, github.manifests);
  const localCatalogHash = createManifestCatalogHash(local.manifests);
  const githubCatalogHash = createManifestCatalogHash(github.manifests);
  const rootMemberPaths = github.manifestRoot
    ? github.manifestRoot.members.map((member) => `${member}/Cargo.toml`)
    : github.manifests.map((manifest) => manifest.path);
  const rootPathDrift = comparePaths(local.paths, rootMemberPaths);
  const checks = {
    manifestCountsMatch: local.manifests.length === github.manifests.length,
    manifestPathsMatch:
      manifestDrift.missingLocalManifests.length === 0 &&
      manifestDrift.extraLocalManifests.length === 0,
    manifestHashesMatch: manifestDrift.manifestHashDrift.length === 0,
    manifestCatalogHashMatches: localCatalogHash === githubCatalogHash,
    rootWorkspaceMemberPathsMatch:
      rootPathDrift.missingLocalPaths.length === 0 && rootPathDrift.extraLocalPaths.length === 0
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: [
      rawCargoManifestUrl,
      cargoManifestHtmlUrl,
      cratesTreeUrl,
      ...local.manifests.map((manifest) => manifest.rawUrl)
    ],
    interpretation:
      "Compares Nocksperimental's pinned Nockchain crate Cargo.toml manifest catalog against upstream GitHub master, including manifest path set, byte counts, individual SHA-256 hashes, and aggregate manifest catalog hash.",
    snapshot: {
      localManifestCount: local.manifests.length,
      githubManifestCount: github.manifests.length,
      localManifestCatalogHash: localCatalogHash,
      githubManifestCatalogHash: githubCatalogHash,
      localLatestManifestPath: local.manifests.at(-1)?.path ?? null,
      githubLatestManifestPath: github.manifests.at(-1)?.path ?? null,
      rootManifestSha256: github.manifestRoot?.sha256 ?? null,
      rootResolver: github.manifestRoot?.resolver ?? null,
      compareFields
    },
    checks,
    drift: {
      missingLocalManifests: manifestDrift.missingLocalManifests,
      extraLocalManifests: manifestDrift.extraLocalManifests,
      manifestHashDrift: manifestDrift.manifestHashDrift,
      rootWorkspacePathDrift: rootPathDrift
    },
    nextActions: [
      "Refresh src/lib/nockchain-cargo-surface.ts manifest snapshots before using crate dependency, target, feature, or source-focus metadata as receipt authority.",
      "Review changed crate Cargo.toml files against the Rust atlas groups before updating fakenet, wallet, bridge, NockApp, Nockup, or VESL evidence contracts.",
      "Run the Cargo surface, Rust atlas, watch, upstream drift, registry checkpoint, and OpenAPI tests after updating pinned crate manifest metadata."
    ]
  };
}

function normalizeLocalCatalog(surface) {
  return {
    paths: [...surface.workspace.manifestPaths],
    manifests: surface.workspace.manifestSnapshots.map(normalizeManifest)
  };
}

function normalizeGithubCatalog(snapshot) {
  const manifestRoot = snapshot.manifestRoot
    ? {
        path: String(snapshot.manifestRoot.path),
        rawUrl: String(snapshot.manifestRoot.rawUrl ?? rawCargoManifestUrl),
        sha256: String(snapshot.manifestRoot.sha256),
        bytes: Number(snapshot.manifestRoot.bytes ?? 0),
        resolver: String(snapshot.manifestRoot.resolver ?? ""),
        members: Array.isArray(snapshot.manifestRoot.members)
          ? snapshot.manifestRoot.members.map(String)
          : snapshot.manifests.map((manifest) => String(manifest.path).replace(/\/Cargo\.toml$/, ""))
      }
    : null;

  return {
    manifestRoot,
    manifests: snapshot.manifests.map(normalizeManifest)
  };
}

function normalizeManifest(manifest) {
  if (typeof manifest.path !== "string" || typeof manifest.sha256 !== "string") {
    throw new Error("Each manifest must include path and sha256");
  }

  return {
    path: manifest.path,
    rawUrl:
      typeof manifest.rawUrl === "string" && manifest.rawUrl
        ? manifest.rawUrl
        : `https://raw.githubusercontent.com/nockchain/nockchain/master/${manifest.path}`,
    sha256: manifest.sha256,
    bytes: Number(manifest.bytes ?? 0)
  };
}

function compareManifestCatalog(localManifests, githubManifests) {
  const pathDrift = comparePaths(
    localManifests.map((manifest) => manifest.path),
    githubManifests.map((manifest) => manifest.path)
  );
  const localByPath = new Map(localManifests.map((manifest) => [manifest.path, manifest]));
  const manifestHashDrift = githubManifests
    .filter((githubManifest) => localByPath.has(githubManifest.path))
    .flatMap((githubManifest) => {
      const localManifest = localByPath.get(githubManifest.path);
      const drift = [];

      if (localManifest.sha256 !== githubManifest.sha256) {
        drift.push({
          path: githubManifest.path,
          field: "sha256",
          local: localManifest.sha256,
          github: githubManifest.sha256
        });
      }

      if (localManifest.bytes !== githubManifest.bytes) {
        drift.push({
          path: githubManifest.path,
          field: "bytes",
          local: localManifest.bytes,
          github: githubManifest.bytes
        });
      }

      return drift;
    });

  return {
    missingLocalManifests: pathDrift.missingLocalPaths,
    extraLocalManifests: pathDrift.extraLocalPaths,
    manifestHashDrift
  };
}

function comparePaths(localPaths, githubPaths) {
  const localSet = new Set(localPaths);
  const githubSet = new Set(githubPaths);

  return {
    missingLocalPaths: githubPaths.filter((manifestPath) => !localSet.has(manifestPath)).sort(),
    extraLocalPaths: localPaths.filter((manifestPath) => !githubSet.has(manifestPath)).sort()
  };
}

function createManifestCatalogHash(manifests) {
  const normalized = manifests
    .map((manifest) => ({
      path: manifest.path,
      sha256: manifest.sha256,
      bytes: manifest.bytes
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return `sha256:${createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}

function parseCargoWorkspace(cargoToml) {
  const workspaceTable = extractWorkspaceTable(cargoToml);
  const membersMatch = workspaceTable.match(/members\s*=\s*\[([\s\S]*?)\]/m);
  const resolverMatch = workspaceTable.match(/resolver\s*=\s*"([^"]+)"/m);

  if (!membersMatch) {
    throw new Error("Cargo.toml [workspace] table is missing members");
  }

  if (!resolverMatch) {
    throw new Error("Cargo.toml [workspace] table is missing resolver");
  }

  return {
    resolver: resolverMatch[1],
    members: Array.from(membersMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1])
  };
}

function extractWorkspaceTable(cargoToml) {
  const lines = cargoToml.split(/\r?\n/);
  const tableLines = [];
  let inWorkspace = false;

  for (const line of lines) {
    if (line.trim() === "[workspace]") {
      inWorkspace = true;
      continue;
    }

    if (inWorkspace && /^\s*\[/.test(line)) {
      break;
    }

    if (inWorkspace) {
      tableLines.push(line);
    }
  }

  if (tableLines.length === 0) {
    throw new Error("Cargo.toml is missing a [workspace] table");
  }

  return tableLines.join("\n");
}

function createSha256(text) {
  return createHash("sha256").update(text).digest("hex");
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

function printTextReport(report) {
  console.log(`Nockchain crate manifest drift: ${report.status}`);
  console.log(
    `Manifest catalog: ${report.snapshot.localManifestCount}/${report.snapshot.githubManifestCount} pinned`
  );

  if (report.status === "in-sync") {
    return;
  }

  console.log(JSON.stringify(report.drift, null, 2));
}
