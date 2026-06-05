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
  const pagePath = "src/app/trust/token-compatibility/[reportId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const tokenListPage = readText("src/app/trust/token-compatibility/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "tokenCompatibilityReports", "token compatibility detail page uses report data");
  assertIncludes(page, "notFound", "token compatibility detail page 404s missing reports");
  assertIncludes(page, "Token Compatibility Detail", "token compatibility detail page title");
  assertIncludes(page, "Verification Actions", "token compatibility detail page renders actions");
  assertIncludes(page, 'against{" "}', "token compatibility detail page separates fixture copy");
  assertIncludes(page, "report.requirements", "token compatibility detail page renders requirements");
  assertIncludes(page, "report.wallets.map", "token compatibility detail page renders wallet checks");
  assertIncludes(page, "scoreLabel(report.score)", "token compatibility detail page renders score label");
  assertIncludes(
    page,
    'href={`/api/trust/token-compatibility/${report.id}`}',
    "token compatibility detail page links API"
  );
  assertIncludes(page, 'href={`/trust/badges/${report.badgeId}`}', "token compatibility detail page links badge detail");
  assertIncludes(page, 'href={`/reports/generated/${report.reportSlug}`}', "token compatibility detail page links generated report");
  assertIncludes(
    page,
    'href={`/api/reports/generated/${report.reportSlug}/evidence`}',
    "token compatibility detail page links report evidence"
  );
  assertIncludes(
    tokenListPage,
    'href={`/trust/token-compatibility/${report.id}`}',
    "token compatibility list links detail page"
  );
  assertIncludes(tokenListPage, "Open Detail", "token compatibility list exposes detail action");
  assertIncludes(
    packageJson.scripts.test,
    "test:token-compatibility-detail-page",
    "full test suite includes token compatibility detail page test"
  );
  assertIncludes(
    smokeScript,
    "/trust/token-compatibility/token-compat-mock-v0",
    "Cloudflare smoke checks token compatibility detail page"
  );
  assertIncludes(
    deploymentDocs,
    "/trust/token-compatibility/token-compat-mock-v0",
    "deployment docs mention token compatibility detail page"
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
