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
const compareFields = ["resolver", "members", "manifestSha256", "workspaceMemberHash"];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const atlas = loadTypeScriptModule("src/lib/nockchain-rust-atlas.ts").createNockchainRustAtlas();
  const githubSnapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubManifest();
  const report = createDriftReport(atlas, githubSnapshot);

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

async function fetchGithubManifest() {
  const response = await fetch(rawCargoManifestUrl, {
    headers: {
      accept: "text/plain",
      "user-agent": "nocksperimental-cargo-workspace-drift-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub raw Cargo.toml returned ${response.status}`);
  }

  const cargoToml = await response.text();
  const parsed = parseCargoWorkspace(cargoToml);

  return {
    manifest: {
      path: "Cargo.toml",
      rawUrl: rawCargoManifestUrl,
      sha256: createSha256(cargoToml),
      bytes: Buffer.byteLength(cargoToml, "utf8"),
      resolver: parsed.resolver,
      members: parsed.members
    }
  };
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!fixture.manifest || !Array.isArray(fixture.manifest.members)) {
    throw new Error("Fixture must contain a manifest with a members array");
  }

  return fixture;
}

function createDriftReport(atlas, githubSnapshot) {
  const local = normalizeLocalWorkspace(atlas);
  const github = normalizeGithubWorkspace(githubSnapshot.manifest);
  const memberDrift = compareMembers(local.members, github.members);
  const metadataDrift = compareWorkspaceMetadata(local, github);
  const localMemberHash = createWorkspaceMemberHash(local.members);
  const githubMemberHash = createWorkspaceMemberHash(github.members);
  const manifestHashDrift =
    local.sha256 === github.sha256
      ? null
      : {
          field: "sha256",
          local: local.sha256,
          github: github.sha256
        };
  const checks = {
    resolverMatches: local.resolver === github.resolver,
    workspaceMemberCountsMatch: local.members.length === github.members.length,
    workspaceMembersMatch:
      memberDrift.missingLocalMembers.length === 0 && memberDrift.extraLocalMembers.length === 0,
    workspaceMemberHashMatches: localMemberHash === githubMemberHash,
    manifestHashMatches: manifestHashDrift === null
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: [rawCargoManifestUrl, cargoManifestHtmlUrl],
    interpretation:
      "Compares Nocksperimental's pinned Nockchain Rust workspace manifest, resolver, member set, and manifest hash against upstream Cargo.toml on GitHub master.",
    snapshot: {
      localManifestSha256: local.sha256,
      githubManifestSha256: github.sha256,
      localWorkspaceMemberHash: localMemberHash,
      githubWorkspaceMemberHash: githubMemberHash,
      localWorkspaceMemberCount: local.members.length,
      githubWorkspaceMemberCount: github.members.length,
      localResolver: local.resolver,
      githubResolver: github.resolver,
      manifestPath: local.path,
      compareFields
    },
    checks,
    drift: {
      workspaceMetadataDrift: metadataDrift,
      missingLocalMembers: memberDrift.missingLocalMembers,
      extraLocalMembers: memberDrift.extraLocalMembers,
      manifestHashDrift
    },
    nextActions: [
      "Refresh src/lib/nockchain-rust-atlas.ts before using crate roles, cargo gates, or workspace member counts as receipt authority.",
      "Review changed Cargo.toml dependencies and workspace members before promoting Rust implementation assumptions into fakenet, wallet, bridge, Nockup, or VESL evidence.",
      "Run Rust atlas, cargo surface, knowledge spine, registry checkpoint, and OpenAPI tests after updating pinned workspace metadata."
    ]
  };
}

function normalizeLocalWorkspace(atlas) {
  return {
    path: atlas.workspace.manifest.path,
    sha256: atlas.workspace.manifest.sha256,
    bytes: atlas.workspace.manifest.bytes,
    resolver: atlas.workspace.resolver,
    members: [...atlas.workspace.coverage.trackedWorkspaceMembers]
  };
}

function normalizeGithubWorkspace(manifest) {
  if (
    typeof manifest.path !== "string" ||
    typeof manifest.sha256 !== "string" ||
    typeof manifest.resolver !== "string" ||
    !Array.isArray(manifest.members)
  ) {
    throw new Error("Manifest must include path, sha256, resolver, and members");
  }

  return {
    path: manifest.path,
    sha256: manifest.sha256,
    bytes: manifest.bytes ?? null,
    resolver: manifest.resolver,
    members: manifest.members.map(String)
  };
}

function compareWorkspaceMetadata(local, github) {
  const drift = [];

  for (const field of ["resolver"]) {
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

function compareMembers(localMembers, githubMembers) {
  const localSet = new Set(localMembers);
  const githubSet = new Set(githubMembers);
  const missingLocalMembers = githubMembers.filter((member) => !localSet.has(member)).sort();
  const extraLocalMembers = localMembers.filter((member) => !githubSet.has(member)).sort();

  return { missingLocalMembers, extraLocalMembers };
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

  if (!inWorkspace) {
    throw new Error("Cargo.toml is missing a [workspace] table");
  }

  return tableLines.join("\n");
}

function createWorkspaceMemberHash(members) {
  return `sha256:${createHash("sha256").update(JSON.stringify([...members].sort())).digest("hex")}`;
}

function createSha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function printTextReport(report) {
  console.log(`Nockchain Cargo workspace drift: ${report.status}`);
  console.log(`Local members: ${report.snapshot.localWorkspaceMemberCount}`);
  console.log(`GitHub members: ${report.snapshot.githubWorkspaceMemberCount}`);
  console.log(`Local manifest: ${report.snapshot.localManifestSha256}`);
  console.log(`GitHub manifest: ${report.snapshot.githubManifestSha256}`);

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
