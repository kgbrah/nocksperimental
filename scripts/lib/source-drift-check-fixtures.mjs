// Shared test harness for the *-source-drift-check.mjs scripts.
//
// Each source-drift-check test spawns its check-* script against a synthetic
// fixture (pinned vs github source snapshots) and loads the trace .ts via an
// in-process TypeScript transpile. That infrastructure was copy-pasted verbatim
// across the per-domain test scripts; it lives here once so the loader, the
// next/server stub, the fixture builder, and the assertion helpers cannot drift
// between domains. The per-domain scripts keep only their domain-specific
// assertions in main().

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

export function writeFixture(trace, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "nockchain-source-drift-"));
  const fixturePath = path.join(dir, "source.json");
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

export function createSourceSnapshots(trace, ref) {
  const symbolsByPath = new Map();

  for (const anchor of trace.sourceAnchors) {
    const symbols = symbolsByPath.get(anchor.file) ?? new Set();
    // Tolerate both anchor.symbols (array) and a single anchor.symbol, matching
    // the engine's anchorSymbols() so every domain's fixtures build identically.
    const anchorSyms = anchor.symbols ?? (anchor.symbol ? [anchor.symbol] : []);
    anchorSyms.forEach((symbol) => symbols.add(symbol));
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

export function loadTypeScriptModule(relativePath) {
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

export function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}
