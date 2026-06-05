#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const pagePath = "src/app/trust/solver-scores/[scorecardId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const solverListPage = readText("src/app/trust/solver-scores/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "solverScorecards", "solver detail page uses scorecard data");
  assertIncludes(page, "notFound", "solver detail page 404s missing scorecards");
  assertIncludes(page, "Solver Score Detail", "solver detail page title");
  assertIncludes(page, "Verification Actions", "solver detail page renders actions");
  assertIncludes(page, "scorecard.metrics.fillRate", "solver detail page renders fill rate");
  assertIncludes(page, "scorecard.metrics.failureRate", "solver detail page renders failure rate");
  assertIncludes(page, "scorecard.metrics.medianSettlementMs", "solver detail page renders settlement latency");
  assertIncludes(page, "scorecard.metrics.proofLatencyMs", "solver detail page renders proof latency");
  assertIncludes(page, "scorecard.signals.map", "solver detail page renders signal list");
  assertIncludes(page, 'href={`/api/trust/solver-scores/${scorecard.id}`}', "solver detail page links scorecard API");
  assertIncludes(page, 'href={`/reports/generated/${scorecard.reportSlug}`}', "solver detail page links generated report");
  assertIncludes(page, "scoreLabel(scorecard.score)", "solver detail page renders score label");
  assertIncludes(solverListPage, 'href={`/trust/solver-scores/${scorecard.id}`}', "solver list links detail page");
  assertIncludes(solverListPage, "Open Detail", "solver list exposes detail action");
  assertIncludes(
    packageJson.scripts.test,
    "test:solver-score-detail-page",
    "full test suite includes solver detail page test"
  );
  assertIncludes(
    smokeScript,
    "/trust/solver-scores/solver-score-solver-a-v0",
    "Cloudflare smoke checks solver detail page"
  );
  assertIncludes(
    deploymentDocs,
    "/trust/solver-scores/solver-score-solver-a-v0",
    "deployment docs mention solver detail page"
  );
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
