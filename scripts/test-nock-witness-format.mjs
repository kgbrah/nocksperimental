#!/usr/bin/env node
// Gate for Nock anchor witness-format + engine-version metadata (chain-anchor.ts).
// A receipt must record WHICH witness format (stub vs %full lock-Merkle) and engine
// version applied, so a later witness upgrade can't silently reinterpret it; the
// well-formed guard must reject an anchor missing/with an unknown witness format.

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

  console.log("1. %full Nock anchor (axis-committed Merkle)");
  const full = A.buildNockAnchor({
    network: "nockchain-fakenet",
    blockHash: "D9bVXPt8aBcDeFgHjKmN",
    blockHeight: 7889,
    txId: "ABWoU93Hq5dXYNpQrStU",
    witnessFormat: "%full",
    engineVersion: "nock-tx-engine-1",
    merkleProof: { root: "ROOTb58", path: ["SIBb58"], axis: 2 },
  });
  ok(full.witnessFormat === "%full", "records the %full witness format");
  ok(full.verifiability === "nock-inclusion", "%full ⇒ nock-inclusion verifiability");
  ok(full.engineVersion === "nock-tx-engine-1", "records the engine version");
  ok(A.isWellFormedAnchor(full), "a %full Nock anchor is well-formed");

  console.log("2. stub Nock anchor (block + note pending)");
  const stub = A.buildNockAnchor({
    network: "nockchain",
    blockHash: "Blk",
    blockHeight: 100,
    txId: "Tx",
    witnessFormat: "stub",
    engineVersion: "nock-tx-engine-1",
    noteName: { first: "nf", last: "nl" },
  });
  ok(stub.witnessFormat === "stub" && stub.verifiability === "nock-block-note-pending", "stub ⇒ block-note-pending verifiability");
  ok(A.isWellFormedAnchor(stub), "a stub Nock anchor is well-formed");

  console.log("3. the strengthened guard");
  ok(!A.isWellFormedAnchor({ ...full, witnessFormat: undefined }), "missing witnessFormat fails");
  ok(!A.isWellFormedAnchor({ ...full, witnessFormat: "made-up" }), "an unknown witnessFormat fails");
  ok(!A.isWellFormedAnchor({ ...stub, engineVersion: "" }), "empty engineVersion fails");
  const evm = A.buildBaseAnchor({
    network: "base-sepolia", chainId: 84532,
    blockHash: "0x" + "ab".repeat(32), blockNumber: 1, txHash: "0x" + "cd".repeat(32),
    contract: "0x" + "ee".repeat(20), eventTopic: "0x" + "11".repeat(32), logIndex: 0,
  });
  ok(A.isWellFormedAnchor(evm), "an EVM anchor (witnessFormat evm-receipt) still validates — no regression");

  console.log(`\ntest-nock-witness-format: all ${pass} assertions passed`);
}
