#!/usr/bin/env node
// Gate for the Nock leg of /api/receipts/verify-chain (src/lib/chain-verify-nock.ts):
// a %full receipt anchor's tx-in-block Merkle proof is RE-FOLDED with the
// KAT-validated Tip5 and confirmed against the proof root — independent of the
// issuer signature and without a node round-trip.

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
  const { verifyNockAnchor } = loadTS("src/lib/chain-verify-nock.ts");
  const A = loadTS("src/lib/chain-anchor.ts");
  const M = loadTS("src/lib/tip5/merkle.ts");
  const { P } = loadTS("src/lib/tip5/field.ts");
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const enc = (d) => {
    let v = 0n, pw = 1n;
    for (const l of d) { v += l * pw; pw *= P; }
    let s = v === 0n ? "1" : "";
    while (v > 0n) { s = B58[Number(v % 58n)] + s; v /= 58n; }
    return s;
  };
  const leaf = [7n, 8n, 9n, 10n, 11n];
  const sib = [100n, 200n, 300n, 400n, 500n];
  const root = M.hashTenCell(leaf, sib); // single-tx block: axis=2

  console.log("1. %full anchor re-folds independently");
  const full = A.buildNockAnchor({
    network: "nockchain-fakenet",
    blockHash: enc([1n, 2n, 3n, 4n, 5n]),
    blockHeight: 7889,
    txId: enc(leaf),
    witnessFormat: "%full",
    engineVersion: "nock-tx-engine-1",
    merkleProof: { root: enc(root), path: [enc(sib)], axis: 2 },
  });
  const r1 = verifyNockAnchor(full);
  ok(r1.onChain === true, "valid %full anchor re-folds to its root => onChain");
  ok(r1.checks.rootReDerived === true && r1.checks.decodeOk === true, "verification flags set");

  console.log("2. tampered proof rejects");
  const bad = { ...full, merkleProof: { ...full.merkleProof, path: [enc([1n, 1n, 1n, 1n, 1n])] } };
  ok(verifyNockAnchor(bad).onChain === false, "a wrong sibling fails the fold => not onChain");

  console.log("3. stub anchor reports pending honestly");
  const stub = A.buildNockAnchor({
    network: "nockchain", blockHash: "Blk", blockHeight: 100, txId: "Tx",
    witnessFormat: "stub", engineVersion: "e", noteName: { first: "a", last: "b" },
  });
  const r3 = verifyNockAnchor(stub);
  ok(r3.onChain === false && /pending/i.test(r3.note || ""), "stub tier is onChain:false with a pending note");

  console.log(`\ntest-chain-verify-nock: all ${pass} assertions passed`);
}
