#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const {
    scoreHistories,
    scoreHistoryForSignal,
    scoreHistoryRegistry,
    scoreHistorySummaries,
    scoreHistorySummariesForKind,
    scoreHistorySummaryForSignal
  } = loadTypeScriptModule("src/lib/trust-score-history.ts");

  assertEqual(scoreHistoryRegistry.storage.backend, "static-json", "score history storage backend");
  assertEqual(
    scoreHistoryRegistry.storage.source,
    "src/data/trust-score-history.json",
    "score history storage source"
  );
  assertEqual(scoreHistories.length, 3, "score history count");
  assertEqual(scoreHistorySummaries.length, 3, "score history summary count");

  const solverHistory = scoreHistoryForSignal("solver-score", "solver-score-solver-a-v0");
  assertEqual(solverHistory.id, "history-solver-score-solver-a-v0", "solver history id");
  assertEqual(solverHistory.points.length, 4, "solver history points");
  assertEqual(solverHistory.points[0].score, 88, "solver first score");
  assertEqual(solverHistory.points[3].score, 94, "solver latest score");
  assertEqual(solverHistory.sourceReports[0], "intent-settlement", "solver source report");

  const solverSummary = scoreHistorySummaryForSignal("solver-score", "solver-score-solver-a-v0");
  assertEqual(solverSummary.latestScore, 94, "solver latest summary score");
  assertEqual(solverSummary.previousScore, 92, "solver previous summary score");
  assertEqual(solverSummary.delta, 2, "solver score delta");
  assertEqual(solverSummary.trend, "up", "solver trend");
  assertEqual(solverSummary.pointCount, 4, "solver point count");
  assertEqual(solverSummary.sampleWindowDays, 30, "solver sample window");
  assertEqual(solverSummary.sparkline, "88,90,92,94", "solver sparkline");

  const tokenSummary = scoreHistorySummaryForSignal("token-compatibility", "token-compat-mock-v0");
  assertEqual(tokenSummary.latestScore, 96, "token latest score");
  assertEqual(tokenSummary.previousScore, 93, "token previous score");
  assertEqual(tokenSummary.delta, 3, "token delta");
  assertEqual(tokenSummary.trend, "up", "token trend");

  const computeSummary = scoreHistorySummaryForSignal("compute-benchmark", "compute-profile-alpha-v0");
  assertEqual(computeSummary.latestScore, 91, "compute latest score");
  assertEqual(computeSummary.previousScore, 89, "compute previous score");
  assertEqual(computeSummary.trend, "up", "compute trend");

  assertEqual(scoreHistorySummariesForKind("solver-score").length, 1, "solver summary kind count");
  assertEqual(scoreHistoryForSignal("solver-score", "missing-signal"), undefined, "missing score history");
  assertEqual(
    scoreHistorySummaryForSignal("token-compatibility", "missing-signal"),
    undefined,
    "missing score summary"
  );
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
