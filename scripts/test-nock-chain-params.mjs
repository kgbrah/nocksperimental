#!/usr/bin/env node
// Drift gate for canonical Nockchain timing params (src/lib/nock-chain-params.ts).
// Post-Aletheia block time is 150 s, so the 100-block coinbase timelock is ~4.2 h,
// NOT the ~17 h it was under 600 s blocks. This pins the constants, the derivation,
// and keeps the roadmap-alignment doc consistent with the code.

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const REPO = process.cwd();
const { loadTS } = createTsLoader(REPO);
let pass = 0;
const ok = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ✓ " + m);
  pass += 1;
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

function main() {
  const P = loadTS("src/lib/nock-chain-params.ts");

  console.log("1. post-Aletheia constants");
  ok(P.NOCK_BLOCK_TIME_SECONDS === 150, "block time is 150 s (post-Aletheia), not the legacy 600 s");
  ok(P.NOCK_LEGACY_BLOCK_TIME_SECONDS === 600, "legacy cadence retained for stale-claim detection");
  ok(P.NOCK_COINBASE_TIMELOCK_BLOCKS === 100, "coinbase timelock is 100 blocks");
  ok(P.NOCK_CONFIRMATION_NORM_BLOCKS.min === 3 && P.NOCK_CONFIRMATION_NORM_BLOCKS.max === 6, "confirmation norm is 3–6 blocks");

  console.log("2. derivation: 100 blocks ≈ 4.2 h now (≈ 16.7 h under 600 s)");
  const hoursNow = P.blocksToApproxHours(100);
  ok(Math.abs(hoursNow - 4.1667) < 0.02, `100 blocks → ~4.17 h at 150 s (got ${hoursNow.toFixed(4)})`);
  ok(P.NOCK_COINBASE_TIMELOCK_APPROX_HOURS === hoursNow, "exported approx-hours matches the derivation");
  ok(P.coinbaseTimelockLabel() === "~4.2 h", `label rounds to ~4.2 h (got ${P.coinbaseTimelockLabel()})`);
  const hoursLegacy = P.blocksToApproxHours(100, P.NOCK_LEGACY_BLOCK_TIME_SECONDS);
  ok(hoursLegacy > 16 && hoursLegacy < 17, `the stale 600 s assumption is ~16.7 h (got ${hoursLegacy.toFixed(2)}) — proves the correction is real`);
  ok(P.blocksToSeconds(100) === 15000, "100 blocks → 15000 s");

  console.log("3. roadmap-alignment doc stays consistent with the code");
  const doc = readFileSync(path.join(REPO, "docs/research/nockchain-roadmap-alignment-2026.md"), "utf8");
  ok(/block time \*\*150 s\*\*/i.test(doc) || /150 ?s/.test(doc), "doc still states the 150 s block time");
  ok(/100 block|100-block/.test(doc), "doc still states the 100-block timelock");
  ok(/4\.2 ?h/.test(doc) && /17 ?h/.test(doc), "doc contrasts ~4.2 h (now) vs ~17 h (legacy)");

  console.log(`\ntest-nock-chain-params: all ${pass} assertions passed`);
}
