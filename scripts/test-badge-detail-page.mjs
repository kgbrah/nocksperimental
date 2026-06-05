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
  const pagePath = "src/app/trust/badges/[badgeId]/page.tsx";

  assertFile(pagePath);

  const page = readText(pagePath);
  const badgesPage = readText("src/app/trust/badges/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");

  assertIncludes(page, "createBadgeVerificationBundle", "badge detail page uses verification bundle");
  assertIncludes(page, "createBadgeEmbedBundle", "badge detail page uses embed bundle");
  assertIncludes(page, "notFound", "badge detail page 404s missing badges");
  assertIncludes(page, "Badge Detail", "badge detail page title");
  assertIncludes(page, "Verification Actions", "badge detail page renders verification actions");
  assertIncludes(page, "const verificationHref", "badge detail page builds prefilled verifier URL");
  assertIncludes(page, "encodeURIComponent(bundle.badgeId)", "badge detail page encodes badge id");
  assertIncludes(page, "encodeURIComponent(bundle.issuance.payloadDigest)", "badge detail page encodes issuance digest");
  assertIncludes(page, "encodeURIComponent(bundle.issuance.signature)", "badge detail page encodes issuance signature");
  assertIncludes(page, "encodeURIComponent(bundle.issuance.issuerKeyId)", "badge detail page encodes issuer key");
  assertIncludes(page, "bundle.evidence.reportHash", "badge detail page renders report hash");
  assertIncludes(page, "bundle.evidence.snapshotRoot", "badge detail page renders snapshot root");
  assertIncludes(page, "embedBundle?.embed.htmlSnippet", "badge detail page renders HTML embed snippet");
  assertIncludes(page, "embedBundle?.embed.markdownSnippet", "badge detail page renders Markdown embed snippet");
  assertIncludes(page, "bundle.revocation", "badge detail page renders revocation state");
  assertIncludes(page, 'href={`/api/trust/badges/${badgeId}`}', "badge detail page links badge API");
  assertIncludes(page, 'href={`/api/trust/badges/${badgeId}/verification`}', "badge detail page links verification API");
  assertIncludes(page, 'href={`/api/trust/badges/${badgeId}/embed`}', "badge detail page links embed API");
  assertIncludes(page, "href={verificationHref}", "badge detail page links prefilled verifier");
  assertIncludes(badgesPage, 'href={`/trust/badges/${badge.id}`}', "badge list links detail page");
  assertIncludes(badgesPage, "Open Detail", "badge list exposes detail action");
  assertIncludes(
    packageJson.scripts.test,
    "test:badge-detail-page",
    "full test suite includes badge detail page test"
  );
  assertIncludes(smokeScript, "/trust/badges/badge-payment-flow-verified", "Cloudflare smoke checks badge detail page");
  assertIncludes(deploymentDocs, "/trust/badges/badge-payment-flow-verified", "deployment docs mention badge detail page");
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
