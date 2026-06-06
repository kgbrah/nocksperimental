#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pagePath = "src/app/nockchain/pr-radar/page.tsx";
  assertFile(pagePath);

  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const watchPage = readText("src/app/nockchain/watch/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createNockchainPrRadar", "PR radar page uses radar");
  assertIncludes(page, "Nockchain PR Radar", "PR radar page title");
  assertIncludes(page, "Open Pull Requests", "PR radar page renders open PRs");
  assertIncludes(page, "Open Issues", "PR radar page renders open issues");
  assertIncludes(page, "Risk Classes", "PR radar page renders risk classes");
  assertIncludes(page, "Review Contract", "PR radar page renders review contract");
  assertIncludes(page, "Drift Check", "PR radar page renders drift check");
  assertIncludes(
    page,
    "npm run check:nockchain-pr-radar-drift",
    "PR radar page renders drift command"
  );
  assertIncludes(
    page,
    "https://api.github.com/repos/nockchain/nockchain/pulls?state=open",
    "PR radar page renders GitHub PR API source"
  );
  assertIncludes(page, "PR #125", "PR radar page renders Nockup manifest PR");
  assertIncludes(page, "PR #113", "PR radar page renders PMA PR");
  assertIncludes(page, "PR #116", "PR radar page renders wallet PR");
  assertIncludes(page, "PR #119", "PR radar page renders NockApp export PR");
  assertIncludes(page, "PR #103", "PR radar page renders offline wallet PR");
  assertIncludes(page, "PR #100", "PR radar page renders PMA backlog PR");
  assertIncludes(page, "PR #94", "PR radar page renders JAM hardening PR");
  assertIncludes(page, "PR #83", "PR radar page renders gRPC PR");
  assertIncludes(page, "PR #79", "PR radar page renders peek v1 PR");
  assertIncludes(page, "Issue #121", "PR radar page renders runtime stack issue");
  assertIncludes(page, "nockup-fixture-manifest", "PR radar page renders Nockup risk class");
  assertIncludes(page, "pma-runtime-persistence", "PR radar page renders PMA risk class");
  assertIncludes(page, "wallet-transaction-metadata", "PR radar page renders wallet risk class");
  assertIncludes(page, "offline-wallet-signing", "PR radar page renders offline wallet risk class");
  assertIncludes(page, "nockapp-state-export", "PR radar page renders export state risk class");
  assertIncludes(page, "runtime-stack-frame-safety", "PR radar page renders issue risk class");
  assertIncludes(page, "jam-cue-hardening", "PR radar page renders JAM hardening risk class");
  assertIncludes(page, "grpc-message-size", "PR radar page renders gRPC risk class");
  assertIncludes(page, "rawStateJam", "PR radar page shows forbidden raw state");
  assertIncludes(page, "rawPmaSlab", "PR radar page shows forbidden raw PMA");
  assertIncludes(page, "walletSeedPhrase", "PR radar page shows forbidden wallet seed");
  assertIncludes(page, 'href="/api/nockchain/pr-radar"', "PR radar page links API");
  assertIncludes(page, 'href="/nockchain/watch"', "PR radar page links watch page");
  assertIncludes(page, 'href="/nockchain"', "PR radar page links parent");

  assertIncludes(nockchainPage, 'href="/nockchain/pr-radar"', "Nockchain page links PR radar");
  assertIncludes(watchPage, 'href="/nockchain/pr-radar"', "Watch page links PR radar");
  assertIncludes(smokeScript, "/nockchain/pr-radar", "Cloudflare smoke includes PR radar page");
  assertIncludes(readme, "/nockchain/pr-radar", "README documents PR radar page");
  assertIncludes(readme, "PMA snapshot/event-log work", "README documents PMA radar coverage");
  assertIncludes(readme, "1 open non-PR issue", "README documents current issue count");
  assertEqual(
    packageJson.scripts["test:nockchain-pr-radar-page"],
    "node scripts/test-nockchain-pr-radar-page.mjs",
    "package PR radar page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-pr-radar-page", "full test includes PR radar page");
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}
