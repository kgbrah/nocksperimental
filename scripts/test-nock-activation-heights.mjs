#!/usr/bin/env node
// Gate for the protocol activation-height registry (src/lib/nock-activation-heights.ts):
// supports upgrade-ahead discipline against silent height-gated cutovers.

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
  const A = loadTS("src/lib/nock-activation-heights.ts");

  console.log("1. registry facts");
  const v1 = A.NOCK_ACTIVATIONS.find((x) => x.id === "v1-fakenet");
  ok(v1 && v1.height === 39000 && v1.network === "fakenet", "v1 fakenet activation is height 39,000");
  ok(A.FAKENET_DIFFICULTY_EPOCH_STALL_HEIGHT === 2016, "fakenet difficulty-epoch stall pinned at 2,016");
  ok(A.NOCK_ACTIVATIONS.some((x) => x.id === "aletheia") && A.NOCK_ACTIVATIONS.some((x) => x.id === "bythos"), "Aletheia + Bythos era markers present");

  console.log("2. isActivatedAt");
  ok(A.isActivatedAt("v1-fakenet", 38999, "fakenet") === false, "v1 not active just below the gate");
  ok(A.isActivatedAt("v1-fakenet", 39000, "fakenet") === true, "v1 active at the gate");
  ok(A.isActivatedAt("aletheia", 0) === true, "era marker (Aletheia) reads activated regardless of height");
  ok(A.isActivatedAt("nope", 100) === null, "unknown activation id => null");

  console.log("3. nextActivation + upgrade-ahead guard");
  ok(A.nextActivation(1000, "fakenet")?.id === "v1-fakenet", "next height-gated activation after 1000 is v1");
  ok(A.nextActivation(40000, "fakenet") === null, "no further height-gated activation after v1");
  ok(A.upgradeAheadDue(38900, "fakenet", 200)?.id === "v1-fakenet", "within lead window => upgrade-ahead due");
  ok(A.upgradeAheadDue(38000, "fakenet", 200) === null, "outside lead window => not yet due");
  ok(A.upgradeAheadDue(39000, "fakenet", 200) === null, "past the gate => nothing upcoming");

  console.log(`\ntest-nock-activation-heights: all ${pass} assertions passed`);
}
