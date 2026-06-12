#!/usr/bin/env node
// Validates the Merkle-proof fold + base58 codec (src/lib/tip5/merkle.ts) against
// the kernel's verify-merk-proof semantics. The leaf/sibling hashing uses the
// KAT-validated Tip5 hash_10 (see test-tip5-kat), so a tree built + proven here
// reproduces the chain's roots; this test pins the fold/axis navigation + codec.

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
  const M = loadTS("src/lib/tip5/merkle.ts");
  const { P } = loadTS("src/lib/tip5/field.ts");
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  // local base58 ENCODE (the module only needs decode; we encode to build vectors)
  const bigIntToBase58 = (n) => {
    if (n === 0n) return "1";
    let s = "";
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    return s;
  };
  const digestToBigInt = (d) => { let v = 0n, pw = 1n; for (const l of d) { v += l * pw; pw *= P; } return v; };
  const digestToBase58 = (d) => bigIntToBase58(digestToBigInt(d));
  const D = (...xs) => xs.map((x) => BigInt(x));

  console.log("1. base58 ⇄ digest round-trip");
  const sample = D(1n, 2n, 3n, 4n, 5n);
  ok(M.digestEq(M.base58ToDigest(digestToBase58(sample)), sample), "decode∘encode is identity for a digest");
  ok(M.base58ToBigInt("1") === 0n && M.base58ToBigInt("2") === 1n, "base58 '1'→0, '2'→1 (alphabet anchor)");
  const big = D(P - 1n, P - 2n, 12345678901234567n, 0n, 999n);
  ok(M.digestEq(M.base58ToDigest(digestToBase58(big)), big), "round-trips a near-max digest");

  console.log("2. single-tx block proof (axis 2: leaf is the root's left child)");
  const leaf = D(7n, 8n, 9n, 10n, 11n);
  const sib = D(100n, 200n, 300n, 400n, 500n);
  const root2 = M.hashTenCell(leaf, sib);
  ok(M.verifyMerkProof(leaf, 2n, root2, [sib]), "axis=2 folds to root");
  ok(!M.verifyMerkProof(leaf, 3n, root2, [sib]), "axis=3 (wrong child order) rejects");
  ok(!M.verifyMerkProof(leaf, 2n, sib, [sib]), "a wrong root rejects");
  ok(!M.verifyMerkProof(leaf, 2n, root2, [sib, sib]), "an over-long path rejects");
  ok(!M.verifyMerkProof(leaf, 0n, root2, [sib]), "axis 0 rejects");

  console.log("3. right child (axis 3) + deeper trees");
  const root3 = M.hashTenCell(sib, leaf);
  ok(M.verifyMerkProof(leaf, 3n, root3, [sib]), "axis=3 (right child) folds");
  // axis 4: leaf is left-of-left. root = h(h(leaf, s0), s1)
  const s0 = D(1n, 1n, 1n, 1n, 1n), s1 = D(2n, 2n, 2n, 2n, 2n);
  const root4 = M.hashTenCell(M.hashTenCell(leaf, s0), s1);
  ok(M.verifyMerkProof(leaf, 4n, root4, [s0, s1]), "axis=4 folds through two levels");
  // axis 5: leaf is right-of-left. root = h(h(s0, leaf), s1)
  const root5 = M.hashTenCell(M.hashTenCell(s0, leaf), s1);
  ok(M.verifyMerkProof(leaf, 5n, root5, [s0, s1]), "axis=5 folds (right then left)");
  ok(!M.verifyMerkProof(leaf, 4n, root5, [s0, s1]), "axis=4 against an axis-5 tree rejects");

  console.log("4. end-to-end verifyNockInclusionProof (base58 anchor shape)");
  const anchor = {
    txId: digestToBase58(leaf),
    txRoot: digestToBase58(root2),
    axis: 2,
    merkleProof: { root: digestToBase58(root2), path: [digestToBase58(sib)] },
  };
  ok(M.verifyNockInclusionProof(anchor).independentlyVerified === true, "valid anchor verifies independently");
  const tampered = { ...anchor, merkleProof: { ...anchor.merkleProof, path: [digestToBase58(s0)] } };
  ok(M.verifyNockInclusionProof(tampered).independentlyVerified === false, "tampered sibling fails the fold");
  const wrongRoot = { ...anchor, txRoot: digestToBase58(root3) };
  ok(M.verifyNockInclusionProof(wrongRoot).independentlyVerified === false, "root≠tx-root fails");

  console.log(`\ntest-tip5-merkle: all ${pass} assertions passed`);
}
