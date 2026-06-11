// Generate fairness lab fixtures for the new POC games from the REAL pocgames.ts
// outcome functions, so every commit truly hashes to its seed and every shown
// outcome is the recomputed one — the commit-binds-seed + fairness invariants
// then pass honestly. Mirrors the existing forfeit-roulette-fairness.lab.json.
//
//   node scripts/gen-pocgame-fixtures.mjs            # writes the 3 missing fixtures
//
// Honest tier: mode "mock-fakenet" -> the lab attests the MODEL, not a deployed
// kernel; issue-badge mints a model-attested cert (never app-report).

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadPoc() {
  const p = path.join(process.cwd(), "src/lib/pocgames.ts");
  const out = ts.transpileModule(readFileSync(p, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: p,
  }).outputText;
  const mod = { exports: {} };
  new Function("exports", "require", "module", "__filename", "__dirname", out)(
    mod.exports, require, mod, p, path.dirname(p)
  );
  return mod.exports;
}

const poc = loadPoc();
const HOUSE = "aa".repeat(32); // 32-byte seeds, same convention as the roulette fixture
const PLAYER = "bb".repeat(32);

function base(slug, name, extraNotes, peekExtra, invariantsExtra) {
  const nonce = 4;
  return {
    $schema: "../schemas/nockapp-lab-fixture.schema.json",
    id: `${slug}-fairness-v0`,
    app: { name: `${name} (fairness)`, slug, version: "0.0.1", kernel: slug },
    environment: {
      mode: "mock-fakenet",
      grpcEndpoint: "n/a",
      fakenetCommand: "model",
      notes: [
        `Positive proof of the ${slug} fairness invariants over a resolved round.`,
        "Peek surface is commitment-only (no seed); revealed seeds hash to their commitments; nonce strictly increases.",
        ...extraNotes,
        "Honest limit: this proves the MODEL and that the invariants are well-formed, not the compiled Hoon. Real-VM poke/peek awaits generic-cause nockapp-run.",
      ],
    },
    actors: [{ name: "referee", pkh: `${slug}-referee` }],
    initialState: {
      peekSurface: {
        nonce,
        commitHouse: poc.commit(HOUSE),
        commitPlayer: poc.commit(PLAYER),
        ...peekExtra,
      },
      reveals: [
        { label: "house", seed: HOUSE, commit: poc.commit(HOUSE) },
        { label: "player", seed: PLAYER, commit: poc.commit(PLAYER) },
      ],
      nonceSequence: [0, 1, 2, 3, 4],
    },
    steps: [
      { id: "peek-commit-surface", type: "peek", title: "Peek the commitment-only surface", target: "/round", expect: { path: "peekSurface.nonce", equals: nonce } },
    ],
    invariants: [
      { id: "commit-only-peek", title: "Peek surface never exposes an unrevealed seed", severity: "critical", kind: "custom-function", fn: "peek-reveals-no-secret", path: "peekSurface" },
      { id: "seeds-hashlock", title: "Revealed seeds hash to their commitments (provable fairness)", severity: "critical", kind: "custom-function", fn: "commit-binds-seed", path: "reveals" },
      { id: "nonce-monotonic", title: "Nonce strictly increases (replay safety)", severity: "high", kind: "monotonic-strict", path: "nonceSequence" },
      ...invariantsExtra,
    ],
  };
}

const nonce = 4;

// --- slots: 3 reels, pair-or-better wins ---
const sr = poc.slotsReelsFrom({ serverSeed: HOUSE, clientSeed: PLAYER, nonce });
const slots = base(
  "forfeit-slots",
  "Forfeit Slots",
  ["Three independent reels (8 symbols each), recomputable from public reveals; player wins on a pair or better (176/512 = 34.375%)."],
  { reels: sr.reels, tier: poc.slotsTierOf(sr.reels), outcome: poc.slotsTierOf(sr.reels) !== "miss" },
  []
);

// --- highcard: two distinct cards, higher rank wins ---
const hc = poc.highcardDrawFrom({ serverSeed: HOUSE, clientSeed: PLAYER, nonce });
const highcard = base(
  "forfeit-highcard",
  "Forfeit High Card",
  ["Two distinct cards drawn from a 52-card deck, recomputable from public reveals; higher rank wins, suit (♣<♦<♥<♠) breaks rank ties."],
  { playerCard: hc.playerCard, houseCard: hc.houseCard, houseDrawIndex: hc.houseDrawIndex, outcome: poc.cardBeats(hc.playerCard, hc.houseCard) },
  []
);

// --- limbo: crash multiplier vs the 2.00x target ---
const lm = poc.limboMultiplierFrom({ serverSeed: HOUSE, clientSeed: PLAYER, nonce });
const limbo = base(
  "forfeit-limbo",
  "Forfeit Limbo",
  ["Crash multiplier max(1.00, 0.99·2^24/(u+1)) from a recomputable uniform draw; player wins iff it reaches the fixed 2.00x target (49.5%)."],
  { multiplierX100: lm.multiplierX100, target: poc.LIMBO_TARGET_X100, outcome: lm.multiplierX100 >= poc.LIMBO_TARGET_X100 },
  // multiplierX100 is a scalar, so a real numeric-range strengthens the cert.
  [{ id: "multiplier-floor", title: "Multiplier never drops below 1.00x (x100 >= 100)", severity: "high", kind: "numeric-range", path: "peekSurface.multiplierX100", min: 100, max: 1675200 }]
);

for (const fx of [slots, highcard, limbo]) {
  const out = path.join(process.cwd(), "fixtures", `${fx.app.slug}-fairness.lab.json`);
  writeFileSync(out, JSON.stringify(fx, null, 2) + "\n");
  console.log(`wrote ${out}`);
}
