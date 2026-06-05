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
  const pagePath = "src/app/trust/feed/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const trustPage = readText("src/app/trust/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "createTrustEventFeed", "trust feed page uses event feed data");
  assertIncludes(page, "Trust Feed", "trust feed page title");
  assertIncludes(page, "feed.eventCount", "trust feed page renders event count");
  assertIncludes(page, "feed.counts.localFakenetEvidence", "trust feed page renders fakenet evidence count");
  assertIncludes(page, "feed.events.map", "trust feed page renders event list");
  assertIncludes(page, "local-fakenet-evidence", "trust feed page identifies fakenet evidence event");
  assertIncludes(page, "Local fakenet evidence", "trust feed page labels fakenet evidence");
  assertIncludes(page, 'href="/api/trust/feed"', "trust feed page links JSON API");
  assertIncludes(page, "toSameOriginHref", "trust feed page keeps event links same-origin");
  assertIncludes(page, "event.evidence.rootHash", "trust feed page renders event root hash");
  assertIncludes(page, "event.evidence.signature", "trust feed page renders event signature");
  assertIncludes(trustPage, 'href: "/trust/feed"', "trust overview links trust feed page");
  assertIncludes(trustPage, "createTrustEventFeed", "trust overview uses event feed data");
  assertIncludes(
    packageJson.scripts.test,
    "test:trust-feed-page",
    "full test suite includes trust feed page test"
  );
  assertIncludes(smokeScript, "/trust/feed", "Cloudflare smoke checks trust feed page");
  assertIncludes(deploymentDocs, "/trust/feed", "deployment docs mention trust feed page");
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
