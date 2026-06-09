// Offline unit test for the live-base reader (scripts/lib/base-evm-reader.mjs).
//
// Injects a MOCK viem-shaped client (no network) so readBaseXchainState is exercised end-to-end,
// then feeds its emitted xchain.* state through the INDEPENDENT forensic checks in
// scripts/xchain-verifier.mjs (not run-lab's own copies) to prove:
//   - honest live data satisfies quorum / replay / finality-depth / finality-adequacy,
//   - each tampered variant is caught by EXACTLY its target check (specificity),
//   - honest degradation: paths with no Base source (hashlock/exits/domains/burns-as-backing)
//     are NOT emitted, so their invariants simply have nothing to assert.

import { createBaseReader, readBaseXchainState, SUBMIT_DEPOSIT_ABI } from "./lib/base-evm-reader.mjs";
import {
  quorumAuthorized,
  replaySafe,
  finalityDepth,
  finalityAdequacy
} from "./xchain-verifier.mjs";

let failures = 0;
function ok(cond, label) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}`);
  }
}

const SIGNERS = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555"
];
const HEAD = 30_000_000n;
const INBOX = "0x9b1becA13c39b9Be10dB616F1bE10C3CeF9Dfb36";
const NOCK = "0xA9cd4087D9B050D8B35727AAf810296CA957c7B3";

// A mock client implementing only the surface readBaseXchainState consumes.
function makeMockClient({ head = HEAD, signers = SIGNERS, threshold = 3n, withdrawalsEnabled = true, deposits = [], burns = [] } = {}) {
  return {
    async getBlockNumber() {
      return head;
    },
    async readContract({ functionName, args }) {
      if (functionName === "bridgeNodes") return signers[Number(args[0])];
      if (functionName === "THRESHOLD") return threshold;
      if (functionName === "withdrawalsEnabled") return withdrawalsEnabled;
      throw new Error(`mock: unexpected readContract ${functionName}`);
    },
    async getLogs({ event }) {
      if (event?.name === "DepositProcessed") return deposits;
      if (event?.name === "BurnForWithdrawal") return burns;
      return [];
    }
  };
}

async function readWith(opts) {
  const reader = await createBaseReader({ client: makeMockClient(opts), chainId: 84532 });
  return readBaseXchainState(reader, {
    inboxAddress: INBOX,
    nockAddress: NOCK,
    requiredConfirmations: 32,
    appRequiredConfirmations: 0,
    chainId: 84532
  });
}

function deposit(id, blocksAgo, amount = "1000000000000000") {
  return { args: { txId: id, amount: BigInt(amount) }, blockNumber: HEAD - BigInt(blocksAgo) };
}

console.log("base-evm-reader: offline reader + invariant specificity\n");

// 1) Reader projects the live reads into the expected xchain.* shape.
{
  const { xchain, provenance } = await readWith({
    deposits: [deposit("0xaaa1", 100), deposit("0xbbb2", 200)],
    burns: [{ args: { lockRoot: "0xccc3", amount: 500n }, blockNumber: HEAD - 50n }]
  });
  console.log("1) Reader projects live reads into the xchain.* shape:");
  ok(xchain.signers.length === 5 && xchain.signers[0] === SIGNERS[0], "5 live signers read fresh from bridgeNodes");
  ok(xchain.threshold === 3, "threshold read from THRESHOLD()");
  ok(xchain.requiredConfirmations === 32, "requiredConfirmations from fixture confirmationDepth");
  ok(xchain.mints.length === 2, "two DepositProcessed mints projected");
  ok(xchain.mints[0].id === "0xaaa1" && xchain.mints[0].confirmations === 100, "mint id = txId, confirmations = head - blockNumber");
  ok(Array.isArray(xchain.mints[0].attestedBy) && xchain.mints[0].attestedBy.length === 5, "attestedBy = live roster (contract-enforced quorum)");
  ok(xchain.mints[0].quorumProof === "contract-enforced", "mints labelled contract-enforced");
  ok(typeof xchain.mints[0].amount === "string", "amount carried as a string (no bigint in state)");
  ok(xchain.finality.settles.length === 2 && xchain.finality.settles[0].confirmationBasis === "L1-batch", "finality.settles emitted with L1-batch basis");
  ok(provenance.eventCounts.mints === 2 && provenance.eventCounts.burns === 1, "provenance carries observed event counts");
  ok(provenance.withdrawalsEnabled === true, "provenance carries withdrawalsEnabled");
  // honest degradation: no fabricated cross-chain/HTLC paths
  ok(xchain.hashlock === undefined && xchain.exits === undefined && xchain.domain === undefined && xchain.crosschain === undefined, "no fabricated hashlock/exits/domain/crosschain paths");
  ok(xchain.minted === undefined && xchain.burned === undefined, "no fabricated supply-conservation totals (backing burn is Nockchain-side)");
  // JSON-serializable (run-lab will JSON.stringify this state — no bigint allowed)
  let serializable = true;
  try { JSON.stringify(xchain); } catch { serializable = false; }
  ok(serializable, "emitted xchain state is JSON-serializable (no bigint)");
}

// 2) Honest live data satisfies all four Base-sourced invariants.
{
  const { xchain } = await readWith({ deposits: [deposit("0xaaa1", 100), deposit("0xbbb2", 200)] });
  console.log("\n2) Honest live data passes the four Base-sourced invariants:");
  ok(quorumAuthorized(xchain).ok, "quorum-authorized passes (5-of-5 roster >= threshold 3)");
  ok(replaySafe(xchain.mints).ok, "replay-safe passes (unique txIds)");
  ok(finalityDepth(xchain).ok, "finality-depth passes (>= 32 confirmations)");
  ok(finalityAdequacy(xchain.finality).ok, "finality-adequacy passes (meets Base Sepolia registry floor + basis)");
}

// 3) Empty window: a real read of "nothing happened" passes vacuously (honest, not an app proof).
{
  const { xchain, provenance } = await readWith({ deposits: [], burns: [] });
  console.log("\n3) Empty event window passes vacuously (honest no-op read):");
  ok(provenance.eventCounts.mints === 0, "zero mints observed");
  ok(quorumAuthorized(xchain).ok && replaySafe(xchain.mints).ok && finalityDepth(xchain).ok && finalityAdequacy(xchain.finality).ok, "all four invariants vacuously pass on empty mints");
}

// 4) Each tampered variant is caught by EXACTLY its target invariant (specificity).
{
  console.log("\n4) Each tampered live observation is caught by exactly its target check:");

  // replay: same txId minted twice
  const replayState = (await readWith({ deposits: [deposit("0xdup", 100), deposit("0xdup", 90)] })).xchain;
  ok(!replaySafe(replayState.mints).ok, "duplicate txId -> replay-safe FAILS");
  ok(quorumAuthorized(replayState).ok && finalityDepth(replayState).ok, "  ...and quorum/finality still pass");

  // quorum: a mint attested by an unauthorized signer (tamper emitted state)
  const quorumState = (await readWith({ deposits: [deposit("0xq1", 100)] })).xchain;
  quorumState.mints[0].attestedBy = ["0xdeadbeef00000000000000000000000000000000"];
  ok(!quorumAuthorized(quorumState).ok, "unauthorized attestor -> quorum-authorized FAILS");
  ok(replaySafe(quorumState.mints).ok && finalityDepth(quorumState).ok, "  ...and replay/finality still pass");

  // finality-depth: a mint observed before requiredConfirmations
  const prematureState = (await readWith({ deposits: [deposit("0xp1", 5)] })).xchain;
  ok(!finalityDepth(prematureState).ok, "premature mint (5 < 32 conf) -> finality-depth FAILS");
  ok(quorumAuthorized(prematureState).ok && replaySafe(prematureState.mints).ok, "  ...and quorum/replay still pass");

  // finality-adequacy: a settle claiming a reversible soft-confirmation
  const softState = (await readWith({ deposits: [deposit("0xs1", 100)] })).xchain;
  softState.finality.settles[0].basedOnSoftConfirm = true;
  ok(!finalityAdequacy(softState.finality).ok, "soft-confirmation reliance -> finality-adequacy FAILS");
}

// 5) Log-provable signer recovery (ecrecover follow-on): the reader recovers the ACTUAL signers from
//    the mint tx's submitDeposit calldata, reproducing MessageInbox.sol verification byte-for-byte.
{
  let viem = null;
  let accounts = null;
  try {
    viem = await import("viem");
    accounts = await import("viem/accounts");
  } catch {
    viem = null;
  }
  console.log("\n5) Log-provable signer recovery from submitDeposit calldata:");
  if (!viem || !accounts) {
    console.log("  SKIP  viem not installed (optional dependency) — recovery path falls back to contract-enforced");
  } else {
    const { encodePacked, keccak256, hashMessage, encodeFunctionData } = viem;
    const { privateKeyToAccount, sign } = accounts;

    // 5 deterministic test keys -> roster; the message-preimage packing MUST mirror the reader exactly.
    const keyHexes = [1, 2, 3, 4, 5].map((i) => `0x${i.toString(16).padStart(64, "0")}`);
    const roster = keyHexes.map((k) => privateKeyToAccount(k).address);
    const PACK = [
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "address", "uint256", "uint256",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint256"
    ];
    const deposit = {
      txId: { limbs: [1n, 2n, 3n, 4n, 5n] },
      nameFirst: { limbs: [6n, 7n, 8n, 9n, 10n] },
      nameLast: { limbs: [11n, 12n, 13n, 14n, 15n] },
      recipient: "0x000000000000000000000000000000000000dEaD",
      amount: 1000n,
      blockHeight: 100n,
      asOf: { limbs: [16n, 17n, 18n, 19n, 20n] },
      depositNonce: 1n
    };
    const ethSignedHash = hashMessage({
      raw: keccak256(encodePacked(PACK, [
        ...deposit.txId.limbs, ...deposit.nameFirst.limbs, ...deposit.nameLast.limbs,
        deposit.recipient, deposit.amount, deposit.blockHeight, ...deposit.asOf.limbs, deposit.depositNonce
      ]))
    });
    const signWith = async (idxs) => {
      const sigs = [];
      for (const i of idxs) sigs.push(await sign({ hash: ethSignedHash, privateKey: keyHexes[i], to: "hex" }));
      return sigs;
    };
    const calldataFor = (ethSigs) => encodeFunctionData({
      abi: SUBMIT_DEPOSIT_ABI,
      functionName: "submitDeposit",
      args: [deposit.txId, deposit.nameFirst, deposit.nameLast, deposit.recipient, deposit.amount, deposit.blockHeight, deposit.asOf, deposit.depositNonce, ethSigs]
    });
    const TXHASH = `0x${"ab".repeat(32)}`;
    const recoverClient = (calldata) => ({
      async getBlockNumber() { return HEAD; },
      async readContract({ functionName, args }) {
        if (functionName === "bridgeNodes") return roster[Number(args[0])];
        if (functionName === "THRESHOLD") return 3n;
        if (functionName === "withdrawalsEnabled") return true;
        throw new Error(`mock: unexpected ${functionName}`);
      },
      async getLogs({ event }) {
        if (event?.name === "DepositProcessed") return [{ args: { txId: "0xfeed", amount: 1000n }, blockNumber: HEAD - 100n, transactionHash: TXHASH }];
        return [];
      },
      async getTransaction({ hash }) {
        if (hash === TXHASH) return { input: calldata };
        throw new Error("mock: unknown tx");
      }
    });
    const readMint = async (idxs) => {
      const reader = await createBaseReader({ client: recoverClient(calldataFor(await signWith(idxs))), chainId: 84532 });
      const { xchain } = await readBaseXchainState(reader, { inboxAddress: INBOX, requiredConfirmations: 32, chainId: 84532 });
      return xchain.mints[0];
    };
    const lc = (a) => a.map((x) => x.toLowerCase()).sort();

    // 3-of-5 roster signed -> log-derived with EXACTLY those 3 recovered.
    const m3 = await readMint([0, 2, 4]);
    ok(m3.quorumProof === "log-derived", "3 roster signatures -> quorumProof log-derived");
    ok(m3.attestedBy.length === 3, "exactly 3 signers recovered");
    ok(JSON.stringify(lc(m3.attestedBy)) === JSON.stringify(lc([roster[0], roster[2], roster[4]])), "recovered the correct 3 roster addresses (not the non-signing 2)");

    // Only 2 roster signatures -> below threshold -> falls back to contract-enforced (no false failure).
    const m2 = await readMint([1, 3]);
    ok(m2.quorumProof === "contract-enforced", "2 roster signatures (< threshold) -> falls back to contract-enforced");
    ok(m2.attestedBy.length === 5, "fallback attests the full roster");
  }
}

console.log(failures === 0 ? "\ntest-base-evm-reader: all assertions passed" : `\ntest-base-evm-reader: ${failures} assertion(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
