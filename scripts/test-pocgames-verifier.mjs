#!/usr/bin/env node

// Correctness gate for the in-browser POC-games forensic verifier (src/lib/pocgames.ts).
// The /pocgames client components rely on this code to recompute outcomes from public
// data, so the synchronous SHA-256 and the fairness constructions must be provably correct:
// checked against known SHA-256 test vectors, against the committed fixture commitments,
// and against the fairness/uniformity properties the badges attest to.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const poc = loadTypeScriptModule("src/lib/pocgames.ts");

  // 1) SHA-256 against canonical NIST/RFC test vectors.
  assertEqual(
    poc.hashHex(),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "sha256('') vector"
  );
  assertEqual(
    poc.hashHex(Buffer.from("abc").toString("hex")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "sha256('abc') vector"
  );
  assertEqual(
    poc.hashHex(Buffer.from("The quick brown fox jumps over the lazy dog").toString("hex")),
    "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    "sha256(fox) vector"
  );
  // A multi-block message (> 64 bytes) exercises the padding/length path.
  assertEqual(
    poc.hashHex(Buffer.from("a".repeat(100)).toString("hex")),
    "2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e",
    "sha256(100x'a') vector"
  );

  // 2) commit() reproduces the committed fixture commitments (lib agrees with lab data).
  const flipFixture = JSON.parse(readText("fixtures/forfeit-flip-fairness.lab.json"));
  const houseReveal = flipFixture.initialState.reveals.find((entry) => entry.label === "house");
  const playerReveal = flipFixture.initialState.reveals.find((entry) => entry.label === "player");
  assertEqual(
    poc.commit(houseReveal.seed),
    houseReveal.commit,
    "commit(house seed) matches fixture commitHouse"
  );
  assertEqual(
    poc.commit(playerReveal.seed),
    playerReveal.commit,
    "commit(player seed) matches fixture commitPlayer"
  );
  assertEqual(
    houseReveal.commit,
    flipFixture.initialState.peekSurface.commitHouse,
    "fixture house reveal binds the peek-surface commitment"
  );

  // 3) Forfeit Flip — a fair round verifies, tamper is caught.
  const flip = poc.playFairFlipRound({ nonce: 7 });
  const flipV = poc.verifyFlipRound(flip);
  assert(flipV.verified, "fair flip round verifies from public data");
  assert(
    flipV.checks.houseCommitBindsSeed && flipV.checks.playerCommitBindsSeed,
    "both flip commitments bind their seeds"
  );
  const flipTampered = poc.verifyFlipRound({ ...flip, serverSeed: poc.randomSeedHex() });
  assert(!flipTampered.verified, "a swapped flip serverSeed fails the hashlock");
  const flipLied = poc.verifyFlipRound({
    ...flip,
    declaredWinner: flip.declaredWinner === "house" ? "player" : "house"
  });
  assert(!flipLied.verified, "a falsified flip winner is rejected by recomputation");

  // 4) Forfeit Dice — fair round verifies, roll in range, faked roll caught.
  const dice = poc.playFairDiceRound({ nonce: 42 });
  const diceV = poc.verifyDiceRound(dice);
  assert(diceV.verified, "fair dice round verifies from public data");
  assert(dice.roll >= 0 && dice.roll <= 9999, "dice roll lands in the [0,9999] band");
  const diceFaked = poc.verifyDiceRound({ ...dice, roll: (dice.roll + 1) % 10000 });
  assert(!diceFaked.verified, "a falsified dice roll is rejected (recomputed mismatch)");

  // 5) Distribution proof: a deterministic honest stream is uniform; a biased stream fails.
  const N = 5000;
  const rolls = [];
  for (let n = 0; n < N; n += 1) {
    rolls.push(
      poc.diceRollFrom({
        serverSeed: poc.deterministicSeed("s", n),
        clientSeed: poc.deterministicSeed("c", n),
        nonce: n
      }).roll
    );
  }
  const cs = poc.chiSquareOverRolls(rolls);
  assert(cs.uniform, `honest roll distribution is uniform (chi2=${cs.chi2.toFixed(2)} < ${cs.criticalValue})`);
  const biased = poc.chiSquareOverRolls(rolls.map((roll) => roll % 2000));
  assert(!biased.uniform, "a biased (non-uniform) stream FAILS the uniformity test");

  // 6) Even money at the fixed line (house edge 0%).
  const winRate = rolls.filter((roll) => roll >= 5000).length / N;
  assert(winRate > 0.47 && winRate < 0.53, `dice is even money at the line (player win rate ${(winRate * 100).toFixed(1)}%)`);

  // 7) The catalog wires both badged games to their committed badge + launch-evidence ids.
  assertEqual(poc.pocGames.length, 2, "two POC games in the catalog");
  assertEqual(poc.pocGameById("forfeit-flip").badgeId, "badge-forfeit-flip-verified", "flip badge id");
  assertEqual(poc.pocGameById("forfeit-dice").badgeId, "badge-forfeit-dice-verified", "dice badge id");
  assertEqual(poc.pocGameById("forfeit-flip").caseId, "case-forfeit-flip-launch-001", "flip case id");
  assertEqual(poc.pocGameById("forfeit-dice").caseId, "case-forfeit-dice-launch-001", "dice case id");
  assertEqual(poc.pocGameById("nope"), undefined, "unknown game id is undefined");

  console.log("test-pocgames-verifier: all assertions passed");
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);
  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
  }
  const output = ts.transpileModule(readFileSync(modulePath, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;
  const compiled = { exports: {} };
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, require, compiled, modulePath, path.dirname(modulePath));
  return compiled.exports;
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`assertion failed: ${label}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
