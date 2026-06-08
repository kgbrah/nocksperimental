#!/usr/bin/env node

// Structure checks for the /pocgames demo GUIs: the hub page, the per-game play page,
// the two "use client" game components, the in-browser verifier import, the homepage nav
// link, and the test-suite wiring. (Outcome correctness lives in test-pocgames-verifier.mjs.)

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const hub = readText("src/app/pocgames/page.tsx");
  const gamePage = readText("src/app/pocgames/[gameId]/page.tsx");
  const flipComponent = readText("src/components/forfeit-flip-game.tsx");
  const diceComponent = readText("src/components/forfeit-dice-game.tsx");
  const lib = readText("src/lib/pocgames.ts");
  const homePage = readText("src/app/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));

  // Hub page.
  assertIncludes(hub, "POC Games", "hub page has title");
  assertIncludes(hub, "pocGames", "hub page maps the game catalog");
  assertIncludes(hub, "resolvedBadgeForId", "hub page resolves the earned badges");
  assertIncludes(hub, "/pocgames/", "hub page links per-game play pages");
  assertIncludes(hub, "no real NOCK", "hub page discloses demo-only / no real NOCK");

  // Per-game play page.
  assertIncludes(gamePage, "pocGameById", "play page resolves the game by id");
  assertIncludes(gamePage, "notFound", "play page 404s an unknown game id");
  assertIncludes(gamePage, "ForfeitFlipGame", "play page renders the flip game component");
  assertIncludes(gamePage, "ForfeitDiceGame", "play page renders the dice game component");
  assertIncludes(gamePage, "launchEvidenceCaseForId", "play page links the launch-evidence case");
  assertIncludes(gamePage, "badge.svg", "play page embeds the launch-evidence badge svg");
  assertIncludes(gamePage, "Settlement residual", "play page discloses the settlement residual");

  // Client components run the in-browser verifier.
  assertIncludes(flipComponent, '"use client"', "flip game is a client component");
  assertIncludes(diceComponent, '"use client"', "dice game is a client component");
  assertIncludes(flipComponent, "verifyFlipRound", "flip game recomputes/verifies in-browser");
  assertIncludes(diceComponent, "verifyDiceRound", "dice game recomputes/verifies in-browser");
  assertIncludes(diceComponent, "chiSquareOverRolls", "dice game runs the chi-square distribution proof");
  assertIncludes(flipComponent, '@/lib/pocgames', "flip game imports the shared verifier");
  assertIncludes(diceComponent, '@/lib/pocgames', "dice game imports the shared verifier");

  // Verifier lib wires the badged games to their committed ids.
  assertIncludes(lib, "badge-forfeit-flip-verified", "lib references the flip badge id");
  assertIncludes(lib, "badge-forfeit-dice-verified", "lib references the dice badge id");
  assertIncludes(lib, "case-forfeit-flip-launch-001", "lib references the flip launch case");
  assertIncludes(lib, "case-forfeit-dice-launch-001", "lib references the dice launch case");

  // Homepage navigation.
  assertIncludes(homePage, 'href="/pocgames"', "homepage links the POC games page");

  // Cloudflare smoke coverage for the new public pages.
  const smoke = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smoke, "/pocgames", "smoke check covers the POC games pages");

  // Test-suite wiring.
  assertIncludes(packageJson.scripts.test, "test:pocgames-page", "full suite runs the pocgames page test");
  assertIncludes(packageJson.scripts.test, "test:pocgames-verifier", "full suite runs the pocgames verifier test");
  assertEqual(
    packageJson.scripts["test:pocgames-page"],
    "node scripts/test-pocgames-page.mjs",
    "pocgames page test script"
  );
  assertEqual(
    packageJson.scripts["test:pocgames-verifier"],
    "node scripts/test-pocgames-verifier.mjs",
    "pocgames verifier test script"
  );

  console.log("test-pocgames-page: all assertions passed");
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected output to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
