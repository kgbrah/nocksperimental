#!/usr/bin/env node
// Known-answer tests for the in-browser Tip5 port (src/lib/tip5/*), pinned to the
// canonical upstream vectors in nockchain crates/zkvm-jetpack/src/jets/tip5_jets.rs
// (test_hash_varlen_jet). A match proves the TS permutation + sponge reproduce the
// chain's hashes byte-for-byte — the basis for trustless client-side proof checks.

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
  const { hashVarlen, hash10 } = loadTS("src/lib/tip5/tip5.ts");
  const F = loadTS("src/lib/tip5/field.ts");

  // tip5_jets.rs test_hash_varlen_jet — sample → digest (5 belts).
  const KATS = [
    { in: [], out: [11048995573592393898n, 6655187932135147625n, 8573492257662932655n, 4379820112787053727n, 3881663824627898703n] },
    { in: [2], out: [8342164316692288712n, 12061287490523852513n, 4038969618836824144n, 5830796451787599265n, 468390350313364562n] },
    { in: [5, 26], out: [4045697570544439560n, 13674194094340317530n, 13743008867885290460n, 6020910684025273897n, 3362765570390427021n] },
    { in: [1, 2448, 1, 0, 0, 0, 0, 0, 0, 0], out: [12811986333282368874n, 13601598673786067780n, 3807788325936413287n, 5511165615113400862n, 11490077061305916457n] },
  ];

  console.log("1. field sanity");
  ok(F.bmul(2n, 3n) === 6n, "bmul small product");
  ok(F.badd(F.P - 1n, 1n) === 0n, "badd wraps at P");
  ok(F.montReduction(F.montify(7n)) === 7n, "montify∘montReduction round-trips");

  console.log("2. hash_varlen known-answer vectors (canonical Tip5)");
  for (const kat of KATS) {
    const got = hashVarlen(kat.in.map((x) => BigInt(x)));
    const match = got.length === 5 && got.every((v, i) => v === kat.out[i]);
    ok(match, `hash_varlen([${kat.in.join(",")}])${match ? " matches upstream" : " MISMATCH got [" + got.join(",") + "]"}`);
  }

  console.log("3. hash_10 shape + determinism");
  const d = hash10([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n]);
  ok(d.length === 5 && d.every((x) => x >= 0n && x < F.P), "hash_10 yields 5 field elements in [0,P)");
  const d2 = hash10([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n]);
  ok(d.every((x, i) => x === d2[i]), "hash_10 is deterministic");

  console.log(`\ntest-tip5-kat: all ${pass} assertions passed`);
}
