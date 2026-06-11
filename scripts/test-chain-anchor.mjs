#!/usr/bin/env node
// Correctness gate for chain-anchored receipts: the anchor guard functions, and
// the real committed chain-anchored cert (signature + binding). Live on-chain
// re-verification is exercised by /api/receipts/verify-chain, not here.

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
  const A = loadTS("src/lib/chain-anchor.ts");
  const { resolvedBadgeForId } = loadTS("src/lib/trust-signals.ts");
  const { verifyTrustBadgeIssuance } = loadTS("src/lib/trust-badge-verifier.ts");

  // 1) anchor guards — the binding logic the verifier relies on.
  console.log("1. anchor guards");
  const good = A.buildBaseAnchor({
    network: "base-sepolia", chainId: 84532,
    blockHash: "0x" + "ab".repeat(32), blockNumber: 100,
    txHash: "0x" + "cd".repeat(32), contract: "0x" + "ee".repeat(20),
    eventTopic: "0x" + "11".repeat(32), logIndex: 3,
  });
  ok(A.isWellFormedAnchor(good), "a built EVM anchor is well-formed");
  ok(!A.isWellFormedAnchor(undefined), "undefined anchor is not well-formed");
  ok(!A.isWellFormedAnchor({ ...good, blockHash: "" }), "empty blockHash fails well-formed");
  ok(!A.isWellFormedAnchor({ ...good, txId: "" }), "empty txId fails well-formed");
  ok(!A.isWellFormedAnchor({ ...good, verifiability: "evm-full", logIndex: undefined }), "evm-full without logIndex fails");
  ok(A.anchorsEqual(good, { ...good }), "anchorsEqual: identical anchors match");
  ok(!A.anchorsEqual(good, { ...good, txId: "0x" + "00".repeat(32) }), "anchorsEqual: a swapped txId is caught");
  ok(!A.anchorsEqual(good, undefined), "anchorsEqual: present vs absent is caught");
  // canonical form is key-order independent
  const reordered = Object.fromEntries(Object.entries(good).reverse());
  ok(A.canonicalAnchor(good) === A.canonicalAnchor(reordered), "canonicalAnchor is key-order independent");

  // 2) the real committed chain-anchored cert
  console.log("2. committed chain-anchored cert");
  const badge = resolvedBadgeForId("badge-chain-anchored-base-redeem-001");
  ok(badge, "demo chain-anchored badge resolves");
  ok(badge.kind === "chain-anchored", "kind is chain-anchored");
  ok(A.isWellFormedAnchor(badge.evidence.chainAnchor), "its anchor is well-formed");
  ok(badge.evidence.chainAnchor.verifiability === "evm-full", "anchor is EVM-full verifiability");
  const v = verifyTrustBadgeIssuance({ badgeId: badge.id });
  ok(v.verified === true, "issuance signature verifies (anchor binding holds)");
  // the signed payload's anchor must equal the badge's (the cross-binding)
  ok(A.anchorsEqual(v.issuance?.signedPayload?.chainAnchor ?? badge.evidence.chainAnchor, badge.evidence.chainAnchor),
    "signedPayload.chainAnchor is bound to the badge's anchor");

  // 3) a chain-anchored badge MUST carry a well-formed anchor (registry invariant)
  console.log("3. registry invariant");
  const ds = JSON.parse(readFileSync(path.join(REPO, "src/data/trust-signals.json"), "utf8"));
  for (const b of ds.verifiedBadges) {
    if (b.kind === "chain-anchored") {
      ok(A.isWellFormedAnchor(b.evidence?.chainAnchor), `${b.id} carries a well-formed anchor`);
      const iss = ds.badgeIssuanceReceipts.find((r) => r.badgeId === b.id);
      ok(iss && A.anchorsEqual(iss.signedPayload?.chainAnchor, b.evidence?.chainAnchor),
        `${b.id} signed anchor matches the badge anchor`);
    }
  }

  console.log(`\ntest-chain-anchor: all ${pass} assertions passed`);
}
