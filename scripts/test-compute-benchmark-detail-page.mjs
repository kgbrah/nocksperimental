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
  const pagePath = "src/app/trust/compute-benchmarks/[profileId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const computeListPage = readText("src/app/trust/compute-benchmarks/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "computeBenchmarkProfiles", "compute benchmark detail page uses profile data");
  assertIncludes(page, "notFound", "compute benchmark detail page 404s missing profiles");
  assertIncludes(page, "Compute Benchmark Detail", "compute benchmark detail page title");
  assertIncludes(page, "Verification Actions", "compute benchmark detail page renders actions");
  assertIncludes(page, "profile.sla.uptime", "compute benchmark detail page renders uptime");
  assertIncludes(page, "profile.sla.failureRate", "compute benchmark detail page renders failure rate");
  assertIncludes(page, "profile.sla.sampleSize", "compute benchmark detail page renders sample size");
  assertIncludes(page, "profile.jobClasses.map", "compute benchmark detail page renders job classes");
  assertIncludes(page, "scoreLabel(profile.score)", "compute benchmark detail page renders score label");
  assertIncludes(
    page,
    'href={`/api/trust/compute-benchmarks/${profile.id}`}',
    "compute benchmark detail page links API"
  );
  assertIncludes(page, 'href={`/trust/badges/${profile.badgeId}`}', "compute benchmark detail page links badge detail");
  assertIncludes(
    page,
    'href={`/reports/generated/${profile.benchmarkReportSlug}`}',
    "compute benchmark detail page links generated report"
  );
  assertIncludes(
    page,
    'href={`/api/reports/generated/${profile.benchmarkReportSlug}/evidence`}',
    "compute benchmark detail page links report evidence"
  );
  assertIncludes(
    computeListPage,
    'href={`/trust/compute-benchmarks/${profile.id}`}',
    "compute benchmark list links detail page"
  );
  assertIncludes(computeListPage, "Open Detail", "compute benchmark list exposes detail action");
  assertIncludes(
    packageJson.scripts.test,
    "test:compute-benchmark-detail-page",
    "full test suite includes compute benchmark detail page test"
  );
  assertIncludes(
    packageJson.scripts["lab:compute"],
    "fixtures/compute-benchmark-alpha.lab.json",
    "package exposes direct compute benchmark lab command"
  );
  assertIncludes(
    smokeScript,
    "/trust/compute-benchmarks/compute-profile-alpha-v0",
    "Cloudflare smoke checks compute benchmark detail page"
  );
  assertIncludes(
    deploymentDocs,
    "/trust/compute-benchmarks/compute-profile-alpha-v0",
    "deployment docs mention compute benchmark detail page"
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
