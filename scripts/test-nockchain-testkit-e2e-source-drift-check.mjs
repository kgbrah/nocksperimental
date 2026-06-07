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
  const scriptPath = "scripts/check-nockchain-testkit-e2e-source-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:nockchain-testkit-e2e-source-drift"],
    "node scripts/check-nockchain-testkit-e2e-source-drift.mjs",
    "package testkit/E2E source drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-testkit-e2e-source-drift-check"],
    "node scripts/test-nockchain-testkit-e2e-source-drift-check.mjs",
    "package testkit/E2E source drift test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-testkit-e2e-source-drift-check",
    "full test includes testkit/E2E source drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/testkit-e2e/route.ts");
  const response = await GET();
  const trace = await response.json();
  assertEqual(
    trace.sourceDriftCheck.command,
    "npm run check:nockchain-testkit-e2e-source-drift -- --json",
    "testkit/E2E source trace exposes drift command"
  );
  assertIncludes(
    trace.sourceDriftCheck.compareFields,
    "sourceSha256",
    "testkit/E2E source drift compares hashes"
  );
  assertIncludes(
    trace.sourceDriftCheck.targetSurfaces,
    "localFakenetEvidence",
    "testkit/E2E source drift targets state-jam registry"
  );

  const passingFixturePath = writeFixture(trace);
  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", passingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching testkit/E2E source fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching testkit/E2E source fixture status");
  assertEqual(
    passingBody.snapshot.sourceAnchorCount,
    trace.sourceAnchors.length,
    "testkit/E2E source anchor count"
  );
  assertEqual(passingBody.checks.upstreamCommitMatchesPinned, true, "matching commit check");
  assertEqual(passingBody.checks.sourceAnchorIdsMatch, true, "matching anchor IDs");
  assertEqual(passingBody.checks.sourceFileHashesMatch, true, "matching source hashes");
  assertEqual(passingBody.checks.requiredSymbolsPresent, true, "matching source symbols");
  assertIncludes(
    passingBody.impact.targetSurfaces,
    "nockchainTestkitE2eTrace",
    "testkit/E2E source drift impact targets testkit/E2E source trace"
  );
  assertIncludes(
    passingBody.impact.forbiddenFields,
    "rawPmaSlab",
    "testkit/E2E source drift impact forbids raw PMA slabs"
  );
  assertIncludes(
    passingBody.impact.verificationCommands,
    "npm run test:nockchain-testkit-e2e-source-drift-check",
    "testkit/E2E source drift impact includes drift test"
  );

  const changedFixturePath = writeFixture(trace, {
    mutatePath: "crates/nockchain-testkit/src/scenario.rs",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    bytes: 999,
    omitSymbol: "Scenario::load_from_path"
  });
  const changed = spawnSync(process.execPath, [scriptPath, "--fixture", changedFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(changed.status, 1, "changed PMA fixture exit status");
  const changedBody = JSON.parse(changed.stdout);
  assertEqual(changedBody.status, "drift", "changed PMA fixture status");
  assertIncludes(
    changedBody.drift.sourceHashDrift.map((entry) => entry.path),
    "crates/nockchain-testkit/src/scenario.rs",
    "testkit/E2E source drift detects changed pma.rs"
  );
  assertIncludes(
    changedBody.drift.missingRequiredSymbols.map((entry) => entry.symbol),
    "Scenario::load_from_path",
    "testkit/E2E source drift detects missing PMA symbol"
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
    "testkit/E2E source drift reports commit drift"
  );

  const upstreamDriftScript = readText("scripts/check-nockchain-upstream-drift.mjs");
  assertIncludes(upstreamDriftScript, "testkit-e2e-source", "aggregate includes testkit/E2E source check");
  assertIncludes(
    upstreamDriftScript,
    "check:nockchain-testkit-e2e-source-drift",
    "aggregate runs testkit/E2E source drift check"
  );

  const watch = await loadTypeScriptModule("src/app/api/nockchain/watch/route.ts").GET();
  const watchBody = await watch.json();
  assertIncludes(
    watchBody.monitor.aggregateDriftCheck.checks.map((check) => check.id),
    "testkit-e2e-source",
    "watch aggregate includes testkit/E2E source"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertIncludes(
    checkpointBody.nockchainWatch.aggregateDriftCheck.checkIds,
    "testkit-e2e-source",
    "checkpoint aggregate drift includes testkit/E2E source"
  );

  const readme = readText("README.md");
  assertIncludes(
    readme,
    "check:nockchain-testkit-e2e-source-drift",
    "README documents testkit/E2E source drift command"
  );
}

function writeFixture(trace, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-testkit-e2e-source-drift-"));
  const fixturePath = path.join(dir, "testkit-e2e-source.json");
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
