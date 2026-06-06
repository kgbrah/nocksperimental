#!/usr/bin/env node

// Deterministic, offline "drift" guard for invariant packs: every pack's
// upstreamBasis.commit must match the canonical Nockchain commit recorded in the
// research doc. Pack *logic* does not drift with upstream source the way Rust
// files do, so pinning + surfacing the basis (here and in /api/invariants)
// preserves the moat without a networked check.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const research = readText("docs/research/nockchain-rust-architecture.md");
  const match = research.match(/\b([0-9a-f]{40})\b/);

  if (!match) {
    throw new Error("Could not find a canonical 40-char commit in docs/research/nockchain-rust-architecture.md");
  }

  const canonicalCommit = match[1];
  assertEqual(canonicalCommit, "33ba97b1e206dd89b15c61b72b7802caf2136c18", "canonical research commit");

  const { invariantPacks } = loadTypeScriptModule("src/lib/invariant-packs.ts");

  for (const pack of invariantPacks) {
    if (!pack.upstreamBasis?.commit) {
      throw new Error(`pack ${pack.id} is missing upstreamBasis.commit`);
    }
    assertEqual(
      pack.upstreamBasis.commit,
      canonicalCommit,
      `pack ${pack.id} upstreamBasis matches canonical commit`
    );
    assertEqual(pack.upstreamBasis.repo, "nockchain/nockchain", `pack ${pack.id} upstreamBasis repo`);
  }

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:invariant-pack-basis"],
    "node scripts/test-invariant-pack-basis.mjs",
    "package invariant pack basis test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:invariant-pack-basis",
    "full test includes invariant pack basis test"
  );
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);
  if (moduleCache.has(modulePath)) return moduleCache.get(modulePath).exports;
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
  const moduleDir = path.dirname(modulePath);
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(moduleDir), compiled, modulePath, moduleDir);
  return compiled.exports;
}

function createModuleRequire(moduleDir) {
  return (specifier) => {
    if (specifier.startsWith("@/")) {
      const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;
      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") return require(aliasPath);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      if (existsSync(jsonPath)) return require(jsonPath);
      throw new Error(`Unsupported module alias: ${specifier}`);
    }
    if (specifier.startsWith(".")) {
      const resolved = path.resolve(moduleDir, specifier);
      const tsPath = `${resolved}.ts`;
      if (existsSync(resolved) && resolved.endsWith(".json")) return require(resolved);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      return require(resolved);
    }
    return require(specifier);
  };
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
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
