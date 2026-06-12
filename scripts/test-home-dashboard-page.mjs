#!/usr/bin/env node

// Structure + regression guard for the homepage dashboard refactor (src/app/page.tsx).
// Verifies the new operational dashboard wiring AND re-checks every preserved invariant the
// sibling text-based tests rely on (nav hrefs, the 'Fixture-driven lab report' literal that
// verify-30-day.mjs asserts, the ModuleExplorer client child, no "use client" on the page,
// and the graceful-degradation fallback when .nocklab artifacts are missing).

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const page = readText("src/app/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));

  // Preserved nav hrefs (the sibling page tests read page.tsx as text for these).
  for (const href of [
    "/reports/sample",
    "/reports/generated",
    "/reports/history",
    "/workspaces",
    "/trust",
    "/registry",
    "/nockchain",
    "/verify",
    "/fakenet",
    "/pocgames",
    "/api/lab"
  ]) {
    assertIncludes(page, `href="${href}"`, `nav preserves href ${href}`);
  }
  // /pocgames must appear at least twice (hero nav + POC games section) — mirrors test-pocgames-page.
  assert(
    occurrences(page, 'href="/pocgames"') >= 2,
    'href="/pocgames" appears in both the nav and the POC games section'
  );

  // Preserved narrative literals (guards verify-30-day.mjs:90 + the lab:ci strip).
  assertIncludes(page, "Fixture-driven lab report", "preserves the report artifact heading");
  assertIncludes(page, "npm run lab:ci", "preserves the lab:ci strip");

  // Brand.
  assertIncludes(page, "Nocksperimental", "h1 brand");
  assertIncludes(page, "before real value moves through it", "tagline preserved");
  assertIncludes(page, "NockApp testing &amp; evidence lab", "brand pill preserved");

  // Dashboard accessor wiring (a dropped section is caught by the missing accessor string).
  for (const accessor of [
    "createLaunchEvidenceIndex",
    "resolvedBadges",
    "trustUpdateChainSummary",
    "createTrustEventFeed",
    "loadGeneratedLabReports",
    "invariantCatalog",
    "invariantPacks",
    "pocGames",
    "PINNED_UPSTREAM_COMMIT"
  ]) {
    assertIncludes(page, accessor, `dashboard wires ${accessor}`);
  }

  // Degrade-gracefully: the page branches on the missing-artifact status AND uses the committed
  // config fixture count as the always-available fallback — and does NOT use the live loader
  // total as the headline Fixtures value.
  assert(
    page.includes('status === "missing"') || page.includes("labMissing"),
    "page branches on loadGeneratedLabReports() missing status"
  );
  assertIncludes(page, "nocklabConfig.fixtures", "page uses the committed fixture list as fallback");
  assert(
    !page.includes("labReports.totals.reportCount"),
    "headline Fixtures value must not read the gitignored live loader total"
  );

  // Exploit-proof catalog is computed (not hard-coded).
  assertIncludes(page, 'startsWith("attack-")', "exploit-proof catalog is computed from attack- fixtures");

  // Forbidden imports / leaf-module guard.
  assert(!/from "@\/lib\/trust-freshness"/.test(page), "page must NOT import the trust-freshness leaf module");
  assert(!page.includes("createRegistryCheckpoint"), "page must NOT dump the registry checkpoint");

  // Client-component integrity: the page stays a sync server component embedding one client child.
  assert(!page.includes('"use client"'), "page.tsx must stay a server component (no use client)");
  assertIncludes(page, "<ModuleExplorer", "page embeds the ModuleExplorer client child");

  // Test-suite wiring.
  assertIncludes(packageJson.scripts.test, "test:home-dashboard-page", "full suite runs the dashboard page test");
  assertEqual(
    packageJson.scripts["test:home-dashboard-page"],
    "node scripts/test-home-dashboard-page.mjs",
    "dashboard page test script"
  );

  console.log("test-home-dashboard-page: all assertions passed");
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
}

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`assertion failed: ${label}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected page to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
