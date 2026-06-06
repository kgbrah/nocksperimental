#!/usr/bin/env node

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
  const { currentUpstreamAnchor, computeBadgeFreshness } = loadTypeScriptModule(
    "src/lib/trust-badge-freshness.ts"
  );

  const current = currentUpstreamAnchor();
  assertEqual(
    current.commit,
    "33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "current upstream anchor commit"
  );
  assertNonEmpty(current.build, "current upstream anchor build");
  // Drift status is consumed from Pillar 1 and should be in-sync in the committed snapshot.
  assertEqual(current.driftStatus, "in-sync", "current drift status");

  assertEqual(
    computeBadgeFreshness({ commit: current.commit, build: current.build }),
    "fresh",
    "matching commit is fresh"
  );
  assertEqual(
    computeBadgeFreshness({ commit: "5d022ced5504e1f2a3b4c5d6e7f80910a1b2c3d4", build: "x" }),
    "stale",
    "different commit is stale"
  );
  assertEqual(computeBadgeFreshness(null), "unknown", "no anchor is unknown");
  assertEqual(computeBadgeFreshness({ build: "x" }), "unknown", "anchor without commit is unknown");

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:trust-badge-freshness"],
    "node scripts/test-trust-badge-freshness.mjs",
    "package freshness test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:trust-badge-freshness",
    "full test includes freshness test"
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
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));
  return compiled.exports;
}

function createModuleRequire() {
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

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}: expected non-empty string`);
  }
}
