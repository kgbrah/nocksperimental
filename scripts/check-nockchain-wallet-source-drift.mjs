#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

import { presentSymbolsFor } from "./lib/source-drift-check.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();
const repository = "nockchain/nockchain";
const defaultRef = "master";
const compareFields = [
  "upstreamCommit",
  "sourceAnchorId",
  "sourceSha256",
  "requiredSymbols",
  "openPrSignal"
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const atlas = loadTypeScriptModule("src/lib/nockchain-wallet-atlas.ts").createNockchainWalletAtlas();
  const sourceContract = atlas.walletTransactionSourceContract;
  const snapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchWalletSourceSnapshot(sourceContract);
  const report = createDriftReport(sourceContract, snapshot);

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
    pinned: normalizeSnapshot(fixture.pinned),
    github: normalizeSnapshot(fixture.github)
  };
}

async function fetchWalletSourceSnapshot(sourceContract) {
  const commitResponse = await fetch(`https://api.github.com/repos/${repository}/commits/${defaultRef}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "nocksperimental-wallet-source-drift-check"
    }
  });

  if (!commitResponse.ok) {
    throw new Error(`GitHub commit API returned ${commitResponse.status}`);
  }

  const commit = await commitResponse.json();
  const githubCommitSha = String(commit.sha ?? "");

  return {
    pinned: {
      commitSha: sourceContract.releaseCommit,
      openPrSignals: sourceContract.openPrSignals,
      sources: await Promise.all(
        sourceContract.sourceAnchors.map((anchor) =>
          fetchSourceSnapshot(anchor.path, sourceContract.releaseCommit, symbolsFromLineAnchors(anchor.lineAnchors))
        )
      )
    },
    github: {
      commitSha: githubCommitSha,
      openPrSignals: await fetchOpenPrSignals(sourceContract.openPrSignals),
      sources: await Promise.all(
        sourceContract.sourceAnchors.map((anchor) =>
          fetchSourceSnapshot(anchor.path, defaultRef, symbolsFromLineAnchors(anchor.lineAnchors))
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
      "user-agent": "nocksperimental-wallet-source-drift-check"
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
    // Shared COR-H boundary-aware matcher (same as the engine + the other 7
    // checkers): a short token like "mine" must not substring-match "mining".
    presentSymbols: presentSymbolsFor(requiredSymbols, source, sourcePath)
  };
}

async function fetchOpenPrSignals(openPrSignals) {
  return Promise.all(
    openPrSignals.map(async (signal) => {
      const match = signal.url.match(/\/pull\/(\d+)$/);

      if (!match) {
        return signal;
      }

      const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${match[1]}`, {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "nocksperimental-wallet-source-drift-check"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub PR API ${signal.url} returned ${response.status}`);
      }

      const pr = await response.json();

      return {
        ...signal,
        title: String(pr.title ?? signal.title),
        status: String(pr.state ?? signal.status),
        updatedAt: String(pr.updated_at ?? signal.updatedAt),
        headCommit: String(pr.head?.sha ?? signal.headCommit),
        baseCommit: String(pr.base?.sha ?? signal.baseCommit)
      };
    })
  );
}

function createDriftReport(sourceContract, snapshot) {
  // SSOT guard: this bespoke checker owns the compareFields contract and emits it
  // into the report; the source contract re-declares an identical copy as
  // documentation. Assert the two hand-maintained copies cannot silently diverge
  // (mirrors the shared engine's guard in scripts/lib/source-drift-check.mjs).
  const declaredCompareFields = sourceContract.sourceDriftCheck?.compareFields;
  if (declaredCompareFields && !arraysEqual(declaredCompareFields, compareFields)) {
    throw new Error(
      `wallet source-drift compareFields contract drift: contract declares ${JSON.stringify(
        declaredCompareFields
      )} but the checker compares ${JSON.stringify(
        compareFields
      )} — keep src/lib/nockchain-wallet-atlas.ts in sync with this checker`
    );
  }

  const pinned = normalizeSnapshot(snapshot.pinned);
  const github = normalizeSnapshot(snapshot.github);
  const trackedAnchorIds = sourceContract.sourceDriftCheck?.sourceAnchorIds ?? [];
  const requiredAnchorIds = sourceContract.sourceAnchors.map((anchor) => anchor.id);
  const pinnedSources = pinned.sources;
  const githubSources = github.sources;
  const pinnedByPath = new Map(pinnedSources.map((source) => [source.path, source]));
  const githubByPath = new Map(githubSources.map((source) => [source.path, source]));
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
  const missingRequiredSymbols = sourceContract.sourceAnchors.flatMap((anchor) => {
    const githubSource = githubByPath.get(anchor.path);
    const presentSymbols = githubSource?.presentSymbols ?? [];

    return symbolsFromLineAnchors(anchor.lineAnchors)
      .filter((symbol) => !presentSymbols.includes(symbol))
      .map((symbol) => ({
        anchorId: anchor.id,
        path: anchor.path,
        symbol
      }));
  });
  const openPrSignalDrift = compareOpenPrSignals(pinned.openPrSignals, github.openPrSignals);
  const checks = {
    upstreamCommitMatchesPinned: github.commitSha === sourceContract.releaseCommit,
    sourceAnchorIdsMatch: arraysEqual(requiredAnchorIds, trackedAnchorIds),
    sourceFileHashesMatch:
      sourceHashDrift.length === 0 &&
      missingGithubSources.length === 0 &&
      extraGithubSources.length === 0,
    requiredSymbolsPresent: missingRequiredSymbols.length === 0,
    openPrSignalMatches: openPrSignalDrift.length === 0
  };
  const changedFields = [
    checks.upstreamCommitMatchesPinned ? null : "upstreamCommit",
    checks.sourceAnchorIdsMatch ? null : "sourceAnchorId",
    checks.sourceFileHashesMatch ? null : "sourceSha256",
    checks.requiredSymbolsPresent ? null : "requiredSymbols",
    checks.openPrSignalMatches ? null : "openPrSignal"
  ].filter(Boolean);
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: unique([
      `https://api.github.com/repos/${repository}/commits/${defaultRef}`,
      `https://api.github.com/repos/${repository}/pulls/116`,
      ...pinnedSources.map((source) => source.rawUrl),
      ...githubSources.map((source) => source.rawUrl),
      ...sourceContract.sourceAnchors.map((anchor) => anchor.sourceUrl),
      ...sourceContract.openPrSignals.map((signal) => signal.url)
    ]),
    interpretation:
      "Compares Nocksperimental's commit-pinned Nockchain wallet transaction source contract against current upstream master, including wallet-tx-builder and nockchain-wallet source hashes, byte counts, required symbols, and the PR #116 memo/blob early-warning signal.",
    snapshot: {
      pinnedCommitSha: sourceContract.releaseCommit,
      githubCommitSha: github.commitSha,
      sourceAnchorCount: sourceContract.sourceAnchors.length,
      sourceFileCount: pinnedSources.length,
      openPrSignalIds: sourceContract.openPrSignals.map((signal) => signal.id),
      compareFields
    },
    checks,
    drift: {
      changedFields,
      missingGithubSources,
      extraGithubSources,
      sourceHashDrift,
      missingRequiredSymbols,
      openPrSignalDrift
    },
    impact: createImpact(sourceContract),
    nextActions: [
      "Refresh src/lib/nockchain-wallet-atlas.ts before using wallet transaction source anchors as current evidence.",
      "Review changed wallet-tx-builder and nockchain-wallet create-tx files before updating balance, transaction, fakenet, or Launch Evidence receipts.",
      "Run the wallet atlas, wallet source drift, aggregate upstream drift, registry checkpoint, lint, and build gates after updating pinned wallet source metadata."
    ]
  };
}

function createImpact(sourceContract) {
  return {
    impactedRepos: ["nockchain/nockchain"],
    sourceAuthorities: ["current-released-nockchain-rust", "open-pr-early-warning"],
    reviewClassIds: ["wallet-api", "rust-workspace", "pre-merge-review"],
    sourceRouteIds: [
      "nockchain-wallet-atlas",
      "nockchain-rust-source-guide",
      "nockchain-upstream-watch"
    ],
    targetSurfaces: [
      "nockchainWalletAtlas",
      "localFakenetEvidence",
      "launchEvidence",
      "registryCheckpoint"
    ],
    receiptFields: sourceContract.receiptFields,
    forbiddenFields: sourceContract.forbiddenFields,
    verificationCommands: [
      "npm run test:nockchain-wallet-atlas",
      "npm run test:nockchain-wallet-source-drift-check",
      "npm run test:nockchain-upstream-drift-check",
      "npm run test:registry-checkpoint-api"
    ]
  };
}

function compareOpenPrSignals(pinnedSignals, githubSignals) {
  const githubById = new Map(githubSignals.map((signal) => [signal.id, signal]));
  const drift = [];

  for (const pinned of pinnedSignals) {
    const github = githubById.get(pinned.id);

    if (!github) {
      drift.push({ id: pinned.id, field: "missingGithubSignal", pinned: pinned.id, github: null });
      continue;
    }

    for (const field of ["title", "status", "sourceAuthority", "url", "headCommit", "baseCommit"]) {
      if (String(pinned[field] ?? "") !== String(github[field] ?? "")) {
        drift.push({
          id: pinned.id,
          field,
          pinned: pinned[field] ?? null,
          github: github[field] ?? null
        });
      }
    }

    if (!arraysEqual(pinned.signals ?? [], github.signals ?? [])) {
      drift.push({
        id: pinned.id,
        field: "signals",
        pinned: pinned.signals ?? [],
        github: github.signals ?? []
      });
    }
  }

  return drift;
}

function normalizeSnapshot(snapshot) {
  return {
    commitSha: String(snapshot.commitSha ?? ""),
    sources: Array.isArray(snapshot.sources)
      ? snapshot.sources.map((source) => ({
          path: String(source.path ?? ""),
          rawUrl: String(source.rawUrl ?? ""),
          sha256: String(source.sha256 ?? ""),
          bytes: Number(source.bytes ?? 0),
          presentSymbols: Array.isArray(source.presentSymbols)
            ? source.presentSymbols.map((symbol) => String(symbol))
            : []
        }))
      : [],
    openPrSignals: Array.isArray(snapshot.openPrSignals)
      ? snapshot.openPrSignals.map((signal) => ({
          ...signal,
          id: String(signal?.id ?? ""),
          title: String(signal?.title ?? ""),
          status: String(signal?.status ?? ""),
          sourceAuthority: String(signal?.sourceAuthority ?? ""),
          url: String(signal?.url ?? ""),
          headCommit: String(signal?.headCommit ?? ""),
          baseCommit: String(signal?.baseCommit ?? ""),
          signals: Array.isArray(signal?.signals) ? signal.signals.map((item) => String(item)) : []
        }))
      : []
  };
}

function symbolsFromLineAnchors(lineAnchors) {
  const symbols = [];

  for (const line of lineAnchors) {
    for (const match of String(line).matchAll(/[A-Za-z_][A-Za-z0-9_]+/g)) {
      const symbol = match[0];

      if (/^(line|lines|and|or|test|decodes|normalizes|option|source|zero|amount|default|Bythos)$/.test(symbol)) {
        continue;
      }

      if (/^[A-Z][A-Za-z0-9_]+$/.test(symbol) || symbol.includes("_")) {
        symbols.push(symbol);
      }
    }
  }

  return Array.from(new Set(symbols));
}

function rawSourceUrl(sourcePath, ref) {
  return `https://raw.githubusercontent.com/${repository}/${ref}/${sourcePath}`;
}

function createSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function arraysEqual(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function printTextReport(report) {
  console.log(`Nockchain wallet source drift: ${report.status}`);
  console.log(
    `Sources: ${report.snapshot.sourceFileCount}; commit ${report.snapshot.pinnedCommitSha.slice(0, 12)} -> ${report.snapshot.githubCommitSha.slice(0, 12)}`
  );

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
