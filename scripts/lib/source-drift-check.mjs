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
  "requiredSymbols"
];

// COR-H: boundary-aware symbol matcher. A required symbol is "present" only when
// it appears delimited by non-identifier characters (or string boundaries), so a
// short token like "mine" does not substring-match "mining"/"determine". We use
// non-identifier-char lookarounds rather than \b: \b would break legitimate
// dashed/sigil tokens like "--mine" or "%mine-result" (the dash is itself a
// non-word char, so \b would require a word boundary mid-token and report false
// drift). The bare last segment of a qualified name (Type::method) is matched the
// same way, since that is the actual token present in Rust/Hoon source. Source
// paths legitimately use substring matching.
const IDENTIFIER_CHARS = "A-Za-z0-9_";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function symbolBoundedInSource(symbol, source) {
  if (!symbol) {
    return false;
  }

  const pattern = new RegExp(`(^|[^${IDENTIFIER_CHARS}])${escapeRegExp(symbol)}([^${IDENTIFIER_CHARS}]|$)`);

  return pattern.test(source);
}

export function presentSymbolsFor(requiredSymbols, source, sourcePath) {
  return requiredSymbols.filter((symbol) => {
    // Tolerate qualified names (Type::method): also match the bare last segment,
    // which is the actual token present in Rust/Hoon source.
    const bare = symbol.includes("::") ? symbol.split("::").pop() : symbol;

    return (
      symbolBoundedInSource(symbol, source) ||
      symbolBoundedInSource(bare, source) ||
      sourcePath.includes(symbol)
    );
  });
}

export async function runSourceDriftCheck(config) {
  const options = parseArgs(process.argv.slice(2));
  const trace = loadTypeScriptModule(config.tracePath)[config.traceFactory]();
  const snapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchSourceSnapshotSet(trace, config);
  const report = createDriftReport(trace, snapshot, config);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report, config);
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

async function fetchSourceSnapshotSet(trace, config) {
  const paths = sourcePaths(trace);
  const symbolsByPath = requiredSymbolsByPath(trace);
  const commitResponse = await fetch(`https://api.github.com/repos/${repository}/commits/${defaultRef}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": config.userAgent
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
          fetchSourceSnapshot(sourcePath, trace.upstream.commit.sha, symbolsByPath.get(sourcePath) ?? [], config)
        )
      )
    },
    github: {
      commitSha: githubCommitSha,
      sources: await Promise.all(
        paths.map((sourcePath) =>
          fetchSourceSnapshot(sourcePath, defaultRef, symbolsByPath.get(sourcePath) ?? [], config)
        )
      )
    }
  };
}

async function fetchSourceSnapshot(sourcePath, ref, requiredSymbols, config) {
  const rawUrl = rawSourceUrl(sourcePath, ref);
  const response = await fetch(rawUrl, {
    headers: {
      accept: "text/plain",
      "user-agent": config.userAgent
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
    presentSymbols: presentSymbolsFor(requiredSymbols, source, sourcePath)
  };
}

function createDriftReport(trace, snapshot, config) {
  // SSOT guard: the engine owns the compareFields contract and emits it into every
  // report (see `snapshot.compareFields` below). Each engine-processed trace also
  // declares the same list as documentation; assert the two hand-maintained copies
  // are identical so they cannot silently diverge. Fails loud during the drift check
  // (and its test) rather than shipping a trace that misdocuments what is compared.
  const declaredCompareFields = trace.sourceDriftCheck?.compareFields;
  if (declaredCompareFields && !arraysEqual(declaredCompareFields, compareFields)) {
    throw new Error(
      `source-drift compareFields contract drift: trace declares ${JSON.stringify(
        declaredCompareFields
      )} but the engine compares ${JSON.stringify(
        compareFields
      )} — keep the trace's sourceDriftCheck.compareFields in sync with scripts/lib/source-drift-check.mjs`
    );
  }

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
    const githubSource = githubByPath.get(anchor.file);
    const presentSymbols = githubSource?.presentSymbols ?? [];

    return anchorSymbols(anchor)
      .filter((symbol) => !presentSymbols.includes(symbol))
      .map((symbol) => ({
        anchorId: anchor.id,
        path: anchor.file,
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
    requiredSymbolsPresent: missingRequiredSymbols.length === 0
  };
  const changedFields = [
    checks.upstreamCommitMatchesPinned ? null : "upstreamCommit",
    checks.sourceAnchorIdsMatch ? null : "sourceAnchorId",
    checks.sourceFileHashesMatch ? null : "sourceSha256",
    checks.requiredSymbolsPresent ? null : "requiredSymbols"
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
      ...trace.sourceAnchors.flatMap((anchor) => anchor.sourceUrls ?? [])
    ]),
    interpretation: config.interpretation,
    snapshot: {
      pinnedCommitSha: trace.upstream.commit.sha,
      githubCommitSha: github.commitSha,
      sourceAnchorCount: trace.sourceAnchors.length,
      sourceFileCount: pinnedSources.length,
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
    impact: createImpact(trace, config),
    nextActions: config.nextActions
  };
}

function createImpact(trace, config) {
  const targetSurfaces = trace.sourceDriftCheck?.targetSurfaces ?? config.impact.defaultTargetSurfaces;

  return {
    impactedRepos: ["nockchain/nockchain"],
    sourceAuthorities: config.impact.sourceAuthorities,
    reviewClassIds: config.impact.reviewClassIds,
    sourceRouteIds: config.impact.sourceRouteIds,
    targetSurfaces,
    receiptFields: unique(trace.sourceAnchors.flatMap((anchor) => anchor.receiptFields ?? [])),
    forbiddenFields: trace.receiptContract?.forbiddenFields ?? [],
    verificationCommands: config.impact.verificationCommands
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
  return unique(trace.sourceAnchors.map((anchor) => anchor.file));
}

// Some traces declare a single `symbol` (+ lineHint) instead of a `symbols`
// array; tolerate both so the shared engine covers either anchor shape.
function anchorSymbols(anchor) {
  if (Array.isArray(anchor.symbols)) {
    return anchor.symbols;
  }
  return anchor.symbol ? [anchor.symbol] : [];
}

function requiredSymbolsByPath(trace) {
  const symbolsByPath = new Map();

  for (const anchor of trace.sourceAnchors) {
    const symbols = symbolsByPath.get(anchor.file) ?? [];
    symbolsByPath.set(anchor.file, unique([...symbols, ...anchorSymbols(anchor)]));
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

function printTextReport(report, config) {
  console.log(`${config.textTitle}: ${report.status}`);
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
