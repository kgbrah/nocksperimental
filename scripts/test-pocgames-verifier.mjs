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

  // 7) Forfeit Roulette — fair round verifies, pocket in range, tamper + lies caught,
  //    color partition is the standard wheel (18 red / 18 black / 1 green).
  for (const bet of ["red", "black"]) {
    const rr = poc.playFairRouletteRound({ nonce: 11, bet });
    const rrV = poc.verifyRouletteRound(rr);
    assert(rrV.verified, `fair roulette round (bet=${bet}) verifies from public data`);
    assert(rr.pocket >= 0 && rr.pocket <= 36, "roulette pocket lands in [0,36]");
    assert(!poc.verifyRouletteRound({ ...rr, serverSeed: poc.randomSeedHex() }).verified,
      "a swapped roulette serverSeed fails the hashlock");
    assert(!poc.verifyRouletteRound({ ...rr, pocket: (rr.pocket + 1) % 37 }).verified,
      "a falsified roulette pocket is rejected");
  }
  {
    let reds = 0, blacks = 0, greens = 0;
    for (let p = 0; p <= 36; p += 1) {
      const c = poc.rouletteColorOf(p);
      if (c === "red") reds += 1;
      else if (c === "black") blacks += 1;
      else greens += 1;
    }
    assertEqual(reds, 18, "18 red pockets");
    assertEqual(blacks, 18, "18 black pockets");
    assertEqual(greens, 1, "exactly one green zero");
    // pockets are uniform over the deterministic stream: every pocket appears.
    const seen = new Set();
    for (let n = 0; n < 2000; n += 1) {
      seen.add(poc.roulettePocketFrom({
        serverSeed: poc.deterministicSeed("rs", n),
        clientSeed: poc.deterministicSeed("rc", n),
        nonce: n
      }).pocket);
    }
    assertEqual(seen.size, 37, "all 37 pockets reachable over a 2000-round deterministic stream");
  }

  // 8) Forfeit Slots — fair round verifies, reels in range, disclosed odds hold over
  //    a deterministic stream, tampered reels rejected.
  {
    const sr = poc.playFairSlotsRound({ nonce: 13 });
    const srV = poc.verifySlotsRound(sr);
    assert(srV.verified, "fair slots round verifies from public data");
    assert(sr.reels.length === 3 && sr.reels.every((r) => r >= 0 && r < 8), "three reels in [0,8)");
    assert(!poc.verifySlotsRound({ ...sr, serverSeed: poc.randomSeedHex() }).verified,
      "a swapped slots serverSeed fails the hashlock");
    assert(!poc.verifySlotsRound({ ...sr, reels: [sr.reels[0], sr.reels[1], (sr.reels[2] + 1) % 8] }).verified,
      "a falsified reel is rejected");
    let wins = 0;
    const N_SLOTS = 4000;
    for (let n = 0; n < N_SLOTS; n += 1) {
      const reels = poc.slotsReelsFrom({
        serverSeed: poc.deterministicSeed("ss", n),
        clientSeed: poc.deterministicSeed("sc", n),
        nonce: n
      }).reels;
      if (poc.slotsTierOf(reels) !== "miss") wins += 1;
    }
    const rate = wins / N_SLOTS;
    // true P = 176/512 = 0.34375; allow generous sampling tolerance.
    assert(rate > 0.31 && rate < 0.38, `slots pair-or-better rate ≈ 34.375% (got ${(rate * 100).toFixed(1)}%)`);
  }

  // 9) Forfeit High Card — fair round verifies, cards distinct + in range, the
  //    suit-break total order always yields a winner, tamper rejected.
  {
    const hc = poc.playFairHighcardRound({ nonce: 17 });
    const hcV = poc.verifyHighcardRound(hc);
    assert(hcV.verified, "fair highcard round verifies from public data");
    assert(hc.playerCard !== hc.houseCard, "highcard cards are distinct");
    assert(hc.playerCard >= 0 && hc.playerCard < 52 && hc.houseCard >= 0 && hc.houseCard < 52,
      "highcard cards in [0,52)");
    assert(!poc.verifyHighcardRound({ ...hc, serverSeed: poc.randomSeedHex() }).verified,
      "a swapped highcard serverSeed fails the hashlock");
    assert(!poc.verifyHighcardRound({ ...hc, houseCard: (hc.houseCard + 1) % 52 }).verified,
      "a falsified house card is rejected");
    // total order: for any two distinct cards exactly one beats the other.
    for (let a = 0; a < 52; a += 1) {
      for (let b = 0; b < 52; b += 1) {
        if (a === b) continue;
        assert(poc.cardBeats(a, b) !== poc.cardBeats(b, a), `card order is total (${a} vs ${b})`);
      }
    }
    // near-even game over a deterministic stream (suit-break tilts only rank ties).
    let playerWins = 0;
    const N_HC = 3000;
    for (let n = 0; n < N_HC; n += 1) {
      const d = poc.highcardDrawFrom({
        serverSeed: poc.deterministicSeed("hs", n),
        clientSeed: poc.deterministicSeed("hc", n),
        nonce: n
      });
      if (poc.cardBeats(d.playerCard, d.houseCard)) playerWins += 1;
    }
    const hcRate = playerWins / N_HC;
    assert(hcRate > 0.46 && hcRate < 0.54, `highcard is near even money (player rate ${(hcRate * 100).toFixed(1)}%)`);
  }

  // 10) Forfeit Limbo — fair round verifies, multiplier ≥ 1.00, win rate matches the
  //     disclosed 49.5% at the 2.00× target, tamper rejected.
  {
    const lr = poc.playFairLimboRound({ nonce: 19 });
    const lrV = poc.verifyLimboRound(lr);
    assert(lrV.verified, "fair limbo round verifies from public data");
    assert(lr.multiplierX100 >= 100, "limbo multiplier is at least 1.00×");
    assert(!poc.verifyLimboRound({ ...lr, serverSeed: poc.randomSeedHex() }).verified,
      "a swapped limbo serverSeed fails the hashlock");
    assert(!poc.verifyLimboRound({ ...lr, multiplierX100: lr.multiplierX100 + 1 }).verified,
      "a falsified limbo multiplier is rejected");
    let wins = 0;
    const N_LIMBO = 4000;
    for (let n = 0; n < N_LIMBO; n += 1) {
      if (poc.limboMultiplierFrom({
        serverSeed: poc.deterministicSeed("ls", n),
        clientSeed: poc.deterministicSeed("lc", n),
        nonce: n
      }).multiplierX100 >= poc.LIMBO_TARGET_X100) wins += 1;
    }
    const lRate = wins / N_LIMBO;
    assert(lRate > 0.465 && lRate < 0.525, `limbo win rate ≈ 49.5% at 2.00× (got ${(lRate * 100).toFixed(1)}%)`);
  }

  // 11) The catalog wires every game to its badge + launch-evidence ids.
  assertEqual(poc.pocGames.length, 6, "six POC games in the catalog");
  for (const id of ["forfeit-flip", "forfeit-dice", "forfeit-roulette", "forfeit-slots", "forfeit-highcard", "forfeit-limbo"]) {
    const short = id.replace("forfeit-", "");
    assertEqual(poc.pocGameById(id).badgeId, `badge-${id}-verified`, `${short} badge id`);
    assertEqual(poc.pocGameById(id).caseId, `case-${id}-launch-001`, `${short} case id`);
  }
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
