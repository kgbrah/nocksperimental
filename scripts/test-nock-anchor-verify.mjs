#!/usr/bin/env node
// Correctness gate for the CLIENT-SIDE Nock tx-inclusion anchor checks
// (src/lib/nock-anchor-verify.ts): the browser re-derives root-consistency and
// structural validity WITHOUT trusting the node's `verifiability` label, so a
// node that returns a path rooted at the wrong tx-root is caught in the browser.

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
  const V = loadTS("src/lib/nock-anchor-verify.ts");

  // A realistic single-tx-block anchor (axis 2, 1-step path), proof root == tx-root.
  const good = {
    network: "nockchain-fakenet",
    verifiability: "nock-inclusion-node-attested",
    blockId: "D9bVXPt8aBcDeFgHjKmN",
    height: 7889,
    txId: "ABWoU93Hq5dXYNpQrStU",
    txRoot: "ROOT-abc123",
    axis: 2,
    merkleProof: { root: "ROOT-abc123", path: ["SIBLING-1-subtree"] },
  };

  console.log("1. structural guard");
  ok(V.isWellFormedNockAnchor(good), "a realistic single-tx anchor is well-formed");
  ok(!V.isWellFormedNockAnchor(null), "null is not well-formed");
  ok(!V.isWellFormedNockAnchor(undefined), "undefined is not well-formed");
  ok(!V.isWellFormedNockAnchor({ ...good, txRoot: "" }), "empty txRoot fails");
  ok(!V.isWellFormedNockAnchor({ ...good, height: -1 }), "negative height fails");
  ok(!V.isWellFormedNockAnchor({ ...good, axis: 0 }), "axis < 1 fails");
  ok(!V.isWellFormedNockAnchor({ ...good, axis: 1.5 }), "non-integer axis fails");
  ok(
    !V.isWellFormedNockAnchor({ ...good, axis: 2, merkleProof: { root: "ROOT-abc123", path: [] } }),
    "axis > 1 with an empty sibling path fails"
  );
  ok(
    !V.isWellFormedNockAnchor({ ...good, merkleProof: { root: "ROOT-abc123", path: ["ok", ""] } }),
    "an empty path sibling fails"
  );

  console.log("2. client-side verdict (root matches but fold not re-derivable => node-attested)");
  // `good` uses placeholder (non-base58) digests, so the Tip5 fold can't run and it
  // honestly falls back to node-attested root-consistency.
  const v1 = V.verifyNockAnchorClientSide(good);
  ok(v1.level === "root-consistent", "matching proof root == tx-root, fold undecodable => root-consistent");
  ok(v1.rootMatchesTxRoot === true && v1.structurallyValid === true, "verdict flags reflect a clean root check");
  ok(Array.isArray(v1.notes) && v1.notes.some((n) => /node-attested/i.test(n)),
    "honest note: node-attested when the Tip5 fold can't be re-derived");

  const tampered = { ...good, merkleProof: { root: "ROOT-DIFFERENT", path: ["SIBLING-1-subtree"] } };
  const v2 = V.verifyNockAnchorClientSide(tampered);
  ok(v2.level === "inconsistent", "proof root != tx-root => inconsistent (caught in the browser)");
  ok(v2.rootMatchesTxRoot === false, "rootMatchesTxRoot is false on a mismatch");

  const v3 = V.verifyNockAnchorClientSide(null);
  ok(v3.level === "malformed", "missing anchor => malformed");
  ok(v3.structurallyValid === false, "malformed is not structurally valid");

  console.log("3. independently-verified via the in-browser Tip5 Merkle fold");
  const Merkle = loadTS("src/lib/tip5/merkle.ts");
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
  const root = Merkle.hashTenCell(leaf, sib); // single-tx block: axis=2, root = hash(leaf, sib)
  const realAnchor = {
    network: "nockchain-fakenet",
    verifiability: "nock-inclusion-node-attested",
    blockId: enc([1n, 2n, 3n, 4n, 5n]),
    height: 7889,
    txId: enc(leaf),
    txRoot: enc(root),
    axis: 2,
    merkleProof: { root: enc(root), path: [enc(sib)] },
  };
  const v4 = V.verifyNockAnchorClientSide(realAnchor);
  ok(v4.level === "independently-verified", "a real anchor whose path folds to tx-root => independently-verified");
  ok(v4.notes.some((n) => /no node trust/i.test(n)), "note states it does not trust the node");
  const v5 = V.verifyNockAnchorClientSide({ ...realAnchor, merkleProof: { root: enc(root), path: [enc([1n, 1n, 1n, 1n, 1n])] } });
  ok(v5.level === "root-consistent", "a wrong sibling (root still matches tx-root) drops to node-attested");

  console.log(`\ntest-nock-anchor-verify: all ${pass} assertions passed`);
}
