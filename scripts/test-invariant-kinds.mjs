#!/usr/bin/env node

// Positive + negative evaluator coverage for the expressive invariant kinds
// (numeric-range, array-length-min/max, temporal-ordering, custom-function) and a
// regression for the setPath array-mutation fix. One fixture drives a non-strict
// run-lab pass; we read each invariant's status from the emitted report. Without
// --strict the report is written and the process exits 0 even when invariants fail,
// so both pass and fail cases are observable in a single run.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

main();

function main() {
  // Cross-chain HTLC commitments: the Base leg uses sha256 (verified concretely); the Nockchain leg
  // uses Tip5 (opaque/distinct here, since Tip5 is not computable in JS).
  const preimage = "aa".repeat(32);
  const commitBase = createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  const commitNock = "t1p5" + "c".repeat(60);
  // EIP-712 domain hash (matches the runner's xchain-domain-separator-binding hashOf).
  const dh = (d) => createHash("sha256").update(`${d.name}|${d.version}|${d.chainId}|${d.verifyingContract}`).digest("hex");
  const gDom = { name: "B", version: "1", chainId: 42161, verifyingContract: "0xA1" };
  const fixture = {
    id: "invariant-kinds-test-v0",
    app: {
      name: "Invariant Kinds Test",
      slug: "invariant-kinds-test",
      version: "0.0.1",
      kernel: "test-kernel"
    },
    environment: {
      mode: "mock-fakenet",
      grpcEndpoint: "127.0.0.1:5555",
      fakenetCommand: "fakenock --start",
      notes: []
    },
    actors: [{ name: "op", pkh: "PKHOP" }],
    initialState: {
      rate: 3,
      trades: [{ type: "bid" }, { type: "ask" }],
      events: [{ type: "locked" }, { type: "settled" }],
      alerts: [],
      ledger: { balances: { a: 10, b: 0 } },
      negLedger: { balances: { a: -1 } },
      arr: [{ field: 0 }],
      // Cross-chain federated-bridge state: `xc` is correct; `xcBad` violates ALL of
      // supply-conserved (inflation + unbacked), quorum (1<3), replay (dup id), finality (1<12).
      xc: {
        minted: 1000, burned: 1000, signers: ["n1", "n2", "n3", "n4", "n5"], threshold: 3, requiredConfirmations: 12,
        burns: [{ id: "g", amount: 1000 }],
        mints: [{ id: "g", amount: 1000, attestedBy: ["n1", "n2", "n3"], confirmations: 12 }],
        settlement: ["claimed"]
      },
      xcBad: {
        minted: 2000, burned: 1000, signers: ["n1", "n2", "n3", "n4", "n5"], threshold: 3, requiredConfirmations: 12,
        burns: [],
        mints: [{ id: "d", amount: 2000, attestedBy: ["n1"], confirmations: 1 }, { id: "d", amount: 2000, attestedBy: ["n1"], confirmations: 1 }],
        settlement: ["claimed", "refunded"]
      },
      // Cross-chain HTLC state: `htlc` is correct; `htlcBad` violates hashlock-algo (nockchain keccak256),
      // timelock-ordering (first-funded 100 <= 200), and atomic-settlement (one-sided).
      htlc: {
        preimage,
        legs: [
          { chain: "nockchain", hashAlgo: "tip5", commitment: commitNock, derivedFromSharedPreimage: true, timelockBlocks: 200, fundsFirst: true },
          { chain: "base", hashAlgo: "sha256", commitment: commitBase, derivedFromSharedPreimage: true, timelockBlocks: 100, fundsFirst: false }
        ],
        settlement: ["claimed", "claimed"]
      },
      htlcBad: {
        preimage,
        legs: [
          { chain: "nockchain", hashAlgo: "keccak256", commitment: commitNock, derivedFromSharedPreimage: true, timelockBlocks: 100, fundsFirst: true },
          { chain: "base", hashAlgo: "sha256", commitment: commitBase, derivedFromSharedPreimage: true, timelockBlocks: 200, fundsFirst: false }
        ],
        settlement: ["claimed", "refunded"]
      },
      // Multi-EVM generalization: `mevm` is correct; `mevmBad` violates each new fn (sub-objects read
      // by the respective invariant via path).
      mevm: {
        crosschain: { messages: [{ id: "w", targetChainId: 42161, attestation: { signedPayloadIncludesChainId: true, signedChainId: 42161, eip155: true } }] },
        finality: { appRequiredConfirmations: 0, settles: [{ id: "w", chainId: 42161, confirmations: 64, confirmationBasis: "L1-batch", basedOnSoftConfirm: false }] },
        routing: { processed: [{ id: "w", sourceChainId: 0, destChainId: 42161 }], expectedRoute: { w: 42161 } },
        domain: { endpoints: [{ chainId: 42161, verifyingContract: gDom.verifyingContract, domain: gDom, derivesChainIdAtVerify: true }], authorizations: [{ boundDomainHash: dh(gDom), usedAtEndpoint: 42161 }] },
        exits: { now: 700000, withdrawals: [{ id: "w", chainId: 42161, l2BurnBlockTime: 0, creditedAtTime: 0, finalizedOnL1: true }] }
      },
      mevmBad: {
        crosschain: { messages: [{ id: "w", targetChainId: 10, attestation: { signedPayloadIncludesChainId: true, signedChainId: 42161, eip155: true } }] },
        finality: { appRequiredConfirmations: 12, settles: [{ id: "w", chainId: 8453, confirmations: 12, confirmationBasis: "native" }] },
        routing: { processed: [{ id: "w", sourceChainId: 0, destChainId: 8453 }, { id: "w", sourceChainId: 0, destChainId: 42161 }], expectedRoute: { w: 8453 } },
        domain: { endpoints: [{ chainId: 8453, verifyingContract: "0xSAME", domain: { name: "B", version: "1", chainId: 1, verifyingContract: "0xSAME" }, derivesChainIdAtVerify: false }, { chainId: 10, verifyingContract: "0xSAME", domain: { name: "B", version: "1", chainId: 1, verifyingContract: "0xSAME" }, derivesChainIdAtVerify: false }], authorizations: [] },
        exits: { now: 3600, withdrawals: [{ id: "w", chainId: 10, l2BurnBlockTime: 0, creditedAtTime: 3600, finalizedOnL1: false }] }
      }
    },
    steps: [
      { id: "boot", type: "fakenet", title: "Boot" },
      {
        id: "mutate",
        type: "poke",
        title: "Set a nested element through an array index",
        actor: "op",
        // Exercises the setPath array-mutation fix: arr must stay an array.
        operation: { kind: "set", path: "arr.0.field", value: 42 }
      }
    ],
    invariants: [
      inv("range-pass", "numeric-range", { path: "rate", min: 0, max: 5 }),
      inv("range-fail", "numeric-range", { path: "rate", min: 0, max: 1 }),
      inv("lenmin-pass", "array-length-min", { path: "trades", min: 2 }),
      inv("lenmin-fail", "array-length-min", { path: "trades", min: 3 }),
      inv("lenmax-pass", "array-length-max", { path: "alerts", max: 0 }),
      inv("lenmax-fail", "array-length-max", { path: "trades", max: 1 }),
      inv("order-pass", "temporal-ordering", {
        path: "events",
        field: "type",
        before: "locked",
        after: "settled"
      }),
      inv("order-fail", "temporal-ordering", {
        path: "events",
        field: "type",
        before: "settled",
        after: "locked"
      }),
      inv("custom-pass", "custom-function", { fn: "balances-non-negative", path: "ledger.balances" }),
      inv("custom-fail", "custom-function", { fn: "balances-non-negative", path: "negLedger.balances" }),
      // setPath regression: arr survives as an array AND the indexed write landed.
      inv("setpath-arr-survives", "array-length-min", { path: "arr", min: 1 }),
      inv("setpath-value", "state-equals", { path: "arr.0.field", equals: 42 }),
      // Cross-chain security invariants — a pass+fail per fn.
      inv("xc-supply-pass", "custom-function", { fn: "xchain-supply-conserved", path: "xc" }),
      inv("xc-supply-fail", "custom-function", { fn: "xchain-supply-conserved", path: "xcBad" }),
      inv("xc-quorum-pass", "custom-function", { fn: "xchain-quorum-authorized", path: "xc" }),
      inv("xc-quorum-fail", "custom-function", { fn: "xchain-quorum-authorized", path: "xcBad" }),
      inv("xc-replay-pass", "custom-function", { fn: "xchain-replay-safe", path: "xc.mints" }),
      inv("xc-replay-fail", "custom-function", { fn: "xchain-replay-safe", path: "xcBad.mints" }),
      inv("xc-finality-pass", "custom-function", { fn: "xchain-finality-depth", path: "xc" }),
      inv("xc-finality-fail", "custom-function", { fn: "xchain-finality-depth", path: "xcBad" }),
      inv("xc-hashlock-pass", "custom-function", { fn: "xchain-hashlock-algo-match", path: "htlc" }),
      inv("xc-hashlock-fail", "custom-function", { fn: "xchain-hashlock-algo-match", path: "htlcBad" }),
      inv("xc-timelock-pass", "custom-function", { fn: "xchain-timelock-ordering", path: "htlc" }),
      inv("xc-timelock-fail", "custom-function", { fn: "xchain-timelock-ordering", path: "htlcBad" }),
      inv("xc-atomic-pass", "custom-function", { fn: "xchain-atomic-settlement", path: "htlc.settlement" }),
      inv("xc-atomic-fail", "custom-function", { fn: "xchain-atomic-settlement", path: "htlcBad.settlement" }),
      // Multi-EVM generalization invariants — a pass+fail per fn.
      inv("xc-chainid-pass", "custom-function", { fn: "xchain-chainid-bound", path: "mevm.crosschain" }),
      inv("xc-chainid-fail", "custom-function", { fn: "xchain-chainid-bound", path: "mevmBad.crosschain" }),
      inv("xc-finadq-pass", "custom-function", { fn: "xchain-finality-adequacy", path: "mevm.finality" }),
      inv("xc-finadq-fail", "custom-function", { fn: "xchain-finality-adequacy", path: "mevmBad.finality" }),
      inv("xc-nsreplay-pass", "custom-function", { fn: "xchain-per-chain-replay-namespacing", path: "mevm.routing" }),
      inv("xc-nsreplay-fail", "custom-function", { fn: "xchain-per-chain-replay-namespacing", path: "mevmBad.routing" }),
      inv("xc-domain-pass", "custom-function", { fn: "xchain-domain-separator-binding", path: "mevm.domain" }),
      inv("xc-domain-fail", "custom-function", { fn: "xchain-domain-separator-binding", path: "mevmBad.domain" }),
      inv("xc-challenge-pass", "custom-function", { fn: "xchain-challenge-window-respected", path: "mevm.exits" }),
      inv("xc-challenge-fail", "custom-function", { fn: "xchain-challenge-window-respected", path: "mevmBad.exits" })
    ]
  };

  const report = runFixture(fixture);
  const status = Object.fromEntries(report.invariants.map((entry) => [entry.id, entry.status]));

  const expected = {
    "range-pass": "pass",
    "range-fail": "fail",
    "lenmin-pass": "pass",
    "lenmin-fail": "fail",
    "lenmax-pass": "pass",
    "lenmax-fail": "fail",
    "order-pass": "pass",
    "order-fail": "fail",
    "custom-pass": "pass",
    "custom-fail": "fail",
    "setpath-arr-survives": "pass",
    "setpath-value": "pass",
    "xc-supply-pass": "pass",
    "xc-supply-fail": "fail",
    "xc-quorum-pass": "pass",
    "xc-quorum-fail": "fail",
    "xc-replay-pass": "pass",
    "xc-replay-fail": "fail",
    "xc-finality-pass": "pass",
    "xc-finality-fail": "fail",
    "xc-hashlock-pass": "pass",
    "xc-hashlock-fail": "fail",
    "xc-timelock-pass": "pass",
    "xc-timelock-fail": "fail",
    "xc-atomic-pass": "pass",
    "xc-atomic-fail": "fail",
    "xc-chainid-pass": "pass",
    "xc-chainid-fail": "fail",
    "xc-finadq-pass": "pass",
    "xc-finadq-fail": "fail",
    "xc-nsreplay-pass": "pass",
    "xc-nsreplay-fail": "fail",
    "xc-domain-pass": "pass",
    "xc-domain-fail": "fail",
    "xc-challenge-pass": "pass",
    "xc-challenge-fail": "fail"
  };

  for (const [id, want] of Object.entries(expected)) {
    assertEqual(status[id], want, `invariant ${id} status`);
  }

  // Defense in depth: the final snapshot's arr must be a real array (not {"0":...}).
  const finalSnapshot = report.stateSnapshots?.at(-1);
  const finalArr = finalSnapshot?.state?.arr;
  assertEqual(Array.isArray(finalArr), true, "final state.arr is an array (setPath preserved it)");
  assertEqual(finalArr?.length, 1, "final state.arr has one element");
  assertEqual(finalArr?.[0]?.field, 42, "final state.arr[0].field was set through the index");

  console.log("test-invariant-kinds: OK");
}

function inv(id, kind, fields) {
  return { id, title: id, severity: "low", kind, ...fields };
}

function runFixture(fixture) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-invariant-kinds-"));
  try {
    const fixturePath = path.join(tempDir, "case.lab.json");
    const outPath = path.join(tempDir, "report.json");
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
    const result = spawnSync(
      process.execPath,
      ["scripts/run-lab.mjs", fixturePath, "--out", outPath],
      { encoding: "utf8", cwd: process.cwd() }
    );
    // Non-strict: the report is written even when invariants fail; a non-zero exit
    // here means a LOAD error (which should not happen for a valid fixture).
    if (result.status !== 0) {
      throw new Error(`run-lab exited ${result.status}: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(readFileSync(outPath, "utf8"));
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
