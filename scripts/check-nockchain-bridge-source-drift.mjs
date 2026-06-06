#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();
const repository = "nockchain/nockchain";
const defaultRef = "master";
const compareFields = [
  "upstreamCommit",
  "sourceAnchorId",
  "sourceSha256",
  "sourceBytes",
  "requiredSymbols",
  "externalScenarioContract"
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const trace = loadTypeScriptModule("src/lib/nockchain-bridge-source-trace.ts").createNockchainBridgeSourceTrace();
  const snapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchBridgeSourceSnapshot(trace);
  const report = createDriftReport(trace, snapshot);

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

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!fixture.pinned || !fixture.github) {
    throw new Error("Fixture must contain pinned and github snapshots");
  }

  return {
    pinned: normalizeSnapshot(fixture.pinned, "pinned"),
    github: normalizeSnapshot(fixture.github, "github")
  };
}

async function fetchBridgeSourceSnapshot(trace) {
  const paths = sourcePaths(trace);
  const symbolsByPath = requiredSymbolsByPath(trace);
  const commitResponse = await fetch(`https://api.github.com/repos/${repository}/commits/${defaultRef}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "nocksperimental-bridge-source-drift-check"
    }
  });

  if (!commitResponse.ok) {
    throw new Error(`GitHub commit API returned ${commitResponse.status}`);
  }

  const commit = await commitResponse.json();
  const githubCommitSha = String(commit.sha ?? "");

  return {
    pinned: {
      commitSha: trace.upstream.commit.sha,
      sources: await Promise.all(
        paths.map((sourcePath) =>
          fetchSourceSnapshot(sourcePath, trace.upstream.commit.sha, symbolsByPath.get(sourcePath) ?? [])
        )
      )
    },
    github: {
      commitSha: githubCommitSha,
      sources: await Promise.all(
        paths.map((sourcePath) =>
          fetchSourceSnapshot(sourcePath, defaultRef, symbolsByPath.get(sourcePath) ?? [])
        )
      )
    }
  };
}

async function fetchSourceSnapshot(sourcePath, ref, requiredSymbols) {
  const rawUrl = rawSourceUrl(sourcePath, ref);
  const response = await fetch(rawUrl, {
    headers: {
      accept: "text/plain",
      "user-agent": "nocksperimental-bridge-source-drift-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub raw ${sourcePath}@${ref} returned ${response.status}`);
  }

  const source = await response.text();

  return {
    path: sourcePath,
    rawUrl,
    sha256: createSha256(source),
    bytes: Buffer.byteLength(source, "utf8"),
    presentSymbols: requiredSymbols.filter(
      (symbol) => source.includes(symbol) || sourcePath.includes(symbol)
    )
  };
}

function createDriftReport(trace, snapshot) {
  const pinned = normalizeSnapshot(snapshot.pinned, "pinned");
  const github = normalizeSnapshot(snapshot.github, "github");
  const trackedAnchorIds = trace.sourceDriftCheck?.sourceAnchorIds ?? [];
  const requiredAnchorIds = trace.sourceAnchors.map((anchor) => anchor.id);
  const pinnedSources = pinned.sources;
  const githubSources = github.sources;
  const githubByPath = new Map(githubSources.map((source) => [source.path, source]));
  const pinnedByPath = new Map(pinnedSources.map((source) => [source.path, source]));
  const sourceHashDrift = [];
  const missingGithubSources = [];

  for (const pinnedSource of pinnedSources) {
    const githubSource = githubByPath.get(pinnedSource.path);

    if (!githubSource) {
      missingGithubSources.push(pinnedSource.path);
      continue;
    }

    if (pinnedSource.sha256 !== githubSource.sha256 || pinnedSource.bytes !== githubSource.bytes) {
      sourceHashDrift.push({
        path: pinnedSource.path,
        pinnedSha256: pinnedSource.sha256,
        githubSha256: githubSource.sha256,
        pinnedBytes: pinnedSource.bytes,
        githubBytes: githubSource.bytes
      });
    }
  }

  const extraGithubSources = githubSources
    .filter((source) => !pinnedByPath.has(source.path))
    .map((source) => source.path);
  const missingRequiredSymbols = trace.sourceAnchors.flatMap((anchor) => {
    const githubSource = githubByPath.get(anchor.upstreamFile);
    const presentSymbols = githubSource?.presentSymbols ?? [];

    return anchor.upstreamSymbols
      .filter((symbol) => !presentSymbols.includes(symbol))
      .map((symbol) => ({
        anchorId: anchor.id,
        path: anchor.upstreamFile,
        symbol
      }));
  });
  const checks = {
    upstreamCommitMatchesPinned: github.commitSha === trace.upstream.commit.sha,
    sourceAnchorIdsMatch: arraysEqual(requiredAnchorIds, trackedAnchorIds),
    sourceFileHashesMatch:
      sourceHashDrift.length === 0 &&
      missingGithubSources.length === 0 &&
      extraGithubSources.length === 0,
    requiredSymbolsPresent: missingRequiredSymbols.length === 0,
    externalScenarioContractCovered:
      trackedAnchorIds.includes("bridge-dev-scenario-readme") &&
      trackedAnchorIds.includes("bridge-dev-withdrawal-scenarios") &&
      trace.externalScenarioEvidenceContract.requiredEnv.includes("BRIDGE_DEV_RUN_E2E") &&
      trace.externalScenarioEvidenceContract.r2Env.includes("BRIDGE_R2_RUN_E2E") &&
      trace.externalScenarioEvidenceContract.forbiddenFields.includes("r2TestToken")
  };
  const changedFields = [
    checks.upstreamCommitMatchesPinned ? null : "upstreamCommit",
    checks.sourceAnchorIdsMatch ? null : "sourceAnchorId",
    checks.sourceFileHashesMatch ? null : "sourceSha256",
    checks.requiredSymbolsPresent ? null : "requiredSymbols",
    checks.externalScenarioContractCovered ? null : "externalScenarioContract"
  ].filter(Boolean);
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: unique([
      `https://api.github.com/repos/${repository}/commits/${defaultRef}`,
      ...pinnedSources.map((source) => source.rawUrl),
      ...githubSources.map((source) => source.rawUrl),
      ...trace.sourceAnchors.map((anchor) => anchor.upstreamUrl)
    ]),
    interpretation:
      "Compares Nocksperimental's commit-pinned Nockchain bridge source anchors against current upstream master, including bridge-dev external scenario fixtures, source hashes, byte counts, required symbols, and scenario secret-redaction boundaries.",
    snapshot: {
      pinnedCommitSha: trace.upstream.commit.sha,
      githubCommitSha: github.commitSha,
      sourceAnchorCount: trace.sourceAnchors.length,
      sourceFileCount: pinnedSources.length,
      bridgeDevAnchorIds: trackedAnchorIds.filter((id) => id.startsWith("bridge-dev")),
      compareFields
    },
    checks,
    drift: {
      changedFields,
      missingGithubSources,
      extraGithubSources,
      sourceHashDrift,
      missingRequiredSymbols
    },
    impact: createImpact(trace),
    nextActions: [
      "Refresh src/lib/nockchain-bridge-source-trace.ts before using bridge withdrawal or bridge-dev scenario source anchors as current evidence.",
      "Review changed bridge, sequencer, bridge-dev, and withdrawal scenario files against the Rust source guide before updating VESL or Launch Evidence bridge receipts.",
      "Run the bridge source API/page tests, aggregate upstream drift check, watch board test, registry checkpoint test, and build after updating pinned bridge source metadata."
    ]
  };
}

function createImpact(trace) {
  return {
    impactedRepos: ["nockchain/nockchain"],
    sourceAuthorities: [
      "canonical-nockchain-bridge-rust",
      "canonical-nockchain-bridge-docs",
      "bridge-dev-external-state-fixture"
    ],
    reviewClassIds: ["rust-workspace", "release-build"],
    sourceRouteIds: [
      "nockchain-bridge-source-trace",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    targetSurfaces: [
      "nockchainBridgeSourceTrace",
      "nockchainRustSourceGuide",
      "veslEvidenceBridge",
      "launchEvidence",
      "registryCheckpoint"
    ],
    receiptFields: unique([
      ...trace.receiptFieldMapping.receiptFields,
      ...trace.externalScenarioEvidenceContract.receiptSafeFields
    ]),
    forbiddenFields: unique([
      ...trace.sourceTraceContract.forbiddenFields,
      ...trace.externalScenarioEvidenceContract.forbiddenFields
    ]),
    verificationCommands: [
      "npm run test:nockchain-bridge-source-api",
      "npm run test:nockchain-bridge-source-page",
      "npm run test:nockchain-bridge-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  };
}

function normalizeSnapshot(snapshot, label) {
  if (!Array.isArray(snapshot.sources)) {
    throw new Error(`${label} snapshot must contain a sources array`);
  }

  return {
    commitSha: String(snapshot.commitSha ?? ""),
    sources: snapshot.sources.map((source) => {
      if (typeof source.path !== "string" || typeof source.sha256 !== "string") {
        throw new Error(`${label} source entries must include path and sha256`);
      }

      return {
        path: source.path,
        rawUrl:
          typeof source.rawUrl === "string" && source.rawUrl
            ? source.rawUrl
            : rawSourceUrl(source.path, label === "pinned" ? snapshot.commitSha : defaultRef),
        sha256: source.sha256,
        bytes: Number(source.bytes ?? 0),
        presentSymbols: Array.isArray(source.presentSymbols) ? source.presentSymbols.map(String) : []
      };
    })
  };
}

function sourcePaths(trace) {
  return unique(trace.sourceAnchors.map((anchor) => anchor.upstreamFile));
}

function requiredSymbolsByPath(trace) {
  const symbolsByPath = new Map();

  for (const anchor of trace.sourceAnchors) {
    const symbols = symbolsByPath.get(anchor.upstreamFile) ?? [];
    symbolsByPath.set(anchor.upstreamFile, unique([...symbols, ...anchor.upstreamSymbols]));
  }

  return symbolsByPath;
}

function rawSourceUrl(sourcePath, ref) {
  return `https://raw.githubusercontent.com/${repository}/${ref}/${sourcePath}`;
}

function createSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function printTextReport(report) {
  console.log(`Nockchain bridge source drift: ${report.status}`);
  console.log(
    `Anchors: ${report.snapshot.sourceAnchorCount}; files: ${report.snapshot.sourceFileCount}`
  );

  if (report.status !== "in-sync") {
    console.log(JSON.stringify(report.drift, null, 2));
  }
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
