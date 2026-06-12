#!/usr/bin/env node
// Gate for the Bythos word-count fee estimator (src/lib/nock-fee-estimator.ts),
// pinned to real create-tx planner traces from the live casino-fresh node:
// fee = max(256, seed_words·128 + witness_words·32). A drift in the rate or the
// witness discount breaks these known-answer cases.

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
  const F = loadTS("src/lib/nock-fee-estimator.ts");

  console.log("1. live create-tx planner KATs (r=128, witness r/4=32)");
  const KATS = [
    [13, 9356, 301056],
    [13, 9418, 303040],
    [13, 9480, 305024],
    [26, 9542, 308672],
  ];
  for (const [s, w, fee] of KATS) {
    ok(F.estimateFeeNicks(s, w) === fee, `seed ${s}, witness ${w} => ${fee} nicks`);
  }

  console.log("2. floor + detail");
  ok(F.estimateFeeNicks(1, 0) === 256, "a tiny tx is floored to 256 nicks");
  ok(F.estimateFeeNicks(0, 0) === 256, "empty is floored to 256");
  const d = F.estimateFee(13, 9356);
  ok(d.feeNicks === 301056 && d.rawNicks === 301056 && d.flooredToMin === false, "detail exposes raw charge + floor flag");
  ok(F.estimateFee(1, 0).flooredToMin === true, "flooredToMin true when below the floor");
  ok(F.NICKS_PER_SEED_WORD === 128 && F.NICKS_PER_WITNESS_WORD === 32, "constants: seed 128, witness 32 (4:1 discount)");

  console.log(`\ntest-nock-fee-estimator: all ${pass} assertions passed`);
}
