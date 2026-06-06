#!/usr/bin/env node

import { createHash } from "node:crypto";
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
  const scriptPath = "scripts/check-nockchain-mining-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-mining-source-drift"],
    "node scripts/check-nockchain-mining-source-drift.mjs",
    "package mining source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-mining-source-drift-check"],
    "node scripts/test-nockchain-mining-source-drift-check.mjs",
    "package mining source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-mining-source-drift-check",
    "full test includes mining source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/mining-source/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-mining-source-drift -- --json",
    "mining source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "mining source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "nockchainSyncGossipTrace",
    "mining source drift targets sync/gossip trace"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching mining source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching mining source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "mining source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainMiningSourceTrace",
    "mining source drift impact targets mining source trace"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawMinerJam",
    "mining source drift impact forbids raw miner jams"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-mining-source-drift-check",
    "mining source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockchain/src/mining.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "MiningWire"
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(changed.status, 1, "changed mining fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed mining fixture status");
  assertIncludes(
    changedBody.drift.sourceHashDrift.map((entry) => entry.path),
    "crates/nockchain/src/mining.rs",
    "mining source drift detects changed mining.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "MiningWire",
    "mining source drift detects missing mining symbol"
  );

  const advancedFixturePath = writeFixture(trace, {
    githubCommitSha: "ffffffffffffffffffffffffffffffffffffffff"
  });
  const advanced = spawnSync(process.execPath, [scriptPath, "--fixture", advancedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assertEqual(advanced.status, 1, "advanced commit fixture exit status");
  const advancedBody = JSON.parse(advanced.stdout);
  assertEqual(advancedBody.checks.upstreamCommitMatchesPinned, false, "advanced commit check");
  assertIncludes(
    advancedBody.drift.changedFields,
    "upstreamCommit",
    "mining source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "mining-source", "aggregate includes mining source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-mining-source-drift",
    "aggregate runs mining source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "mining-source",
    "watch aggregate includes mining source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "mining-source",
    "checkpoint aggregate drift includes mining source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-mining-source-drift",
    "README documents mining source drift command"
  );
}

function writeFixture(trace, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-mining-source-drift-"));
  const fixturePath = path.join(dir, "mining-source.json");
  const pinnedSources = createSourceSnapshots(trace, trace.upstream.commit.sha);
  const githubSources = pinnedSources.map((source) => {
    const githubSource = {
      ...source,
      rawUrl: `https://raw.githubusercontent.com/nockchain/nockchain/master/${source.path}`
    };

    if (source.path !== options.mutatePath) {
      return githubSource;
    }

    return {
      ...githubSource,
      sha256: options.sha256 ?? source.sha256,
      bytes: options.bytes ?? source.bytes,
      presentSymbols: source.presentSymbols.filter((symbol) => symbol !== options.omitSymbol)
    };
  });

  const fixture = {
    pinned: {
      commitSha: trace.upstream.commit.sha,
      sources: pinnedSources
    },
    github: {
      commitSha: options.githubCommitSha ?? trace.upstream.commit.sha,
      sources: githubSources
    }
  };

  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  return fixturePath;
}

function createSourceSnapshots(trace, ref) {
  const symbolsByPath = new Map();

  for (const anchor of trace.sourceAnchors) {
    const symbols = symbolsByPath.get(anchor.file) ?? new Set();
    anchor.symbols.forEach((symbol) => symbols.add(symbol));
    symbolsByPath.set(anchor.file, symbols);
  }

  return Array.from(symbolsByPath.entries()).map(([sourcePath, symbols]) => {
    const content = `${ref}:${sourcePath}:${Array.from(symbols).join(",")}`;

    return {
      path: sourcePath,
      rawUrl: `https://raw.githubusercontent.com/nockchain/nockchain/${ref}/${sourcePath}`,
      sha256: createHash("sha256").update(content).digest("hex"),
      bytes: Buffer.byteLength(content, "utf8"),
      presentSymbols: Array.from(symbols)
    };
  });
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
