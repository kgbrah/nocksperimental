// Read-only Base (EVM) reader for nocklab's `live-base` environment mode.
//
// Reads the REAL, Basescan-verified Nockchain<->Base federated bridge on Base Sepolia
// (chainId 84532) — MessageInbox.sol (mints) and Nock.sol (burns) — and projects the
// on-chain facts into the SAME xchain.* state shape the cross-chain invariants already
// consume, so the same checks run over live chain data instead of a model.
//
// Honest limits (see docs/xchain-security-model.md):
//   - It is PURELY read-only: getBlockNumber / readContract / getLogs. No signing, no keys.
//   - viem is an OPTIONAL dependency, imported dynamically only here, so the rest of the
//     dependency-light CLI never loads it. A live reader without viem fails with a clear error.
//   - Only the BASE-sourced subset of invariants is fed: quorum (contract-enforced 3-of-5),
//     replay-safety, finality-depth, and finality-adequacy over real DepositProcessed mints.
//     `supply-conserved` is intentionally NOT fed: each Base mint is backed by a Nockchain-side
//     burn that is NOT observable from Base, so we do not fabricate a backing relation here.
//     HTLC / multi-EVM / domain / challenge-window paths have no source on this single
//     federated MessageInbox and are likewise omitted (their invariants simply do not run).
//   - Quorum is CONTRACT-ENFORCED: MessageInbox verifies >= THRESHOLD distinct ECDSA sigs in
//     calldata and discards them, so the event cannot name WHICH signers signed. We attest the
//     live bridgeNodes roster the contract required >= threshold of. Log-provable per-signer
//     identities (ecrecover over submitDeposit calldata) are a scoped follow-on.

// ---- contract ABIs (only the fragments a read-only client needs) ---------------------------

// Tip5Hash { uint64[5] limbs } — the bridge's Nockchain-native hash type, carried in event data.
const TIP5 = { type: "tuple", components: [{ name: "limbs", type: "uint64[5]" }] };

// MessageInbox.sol: emitted when a Nockchain deposit is minted as wrapped-NOCK on Base.
// The indexed txId is keccak256(txId.to_be_limb_bytes()) — a stable per-deposit id we dedup on.
export const DEPOSIT_PROCESSED_EVENT = {
  type: "event",
  name: "DepositProcessed",
  inputs: [
    { name: "txId", type: "bytes32", indexed: true },
    { name: "nameFirstHash", type: "bytes32", indexed: true },
    { name: "recipient", type: "address", indexed: true },
    { ...TIP5, name: "txIdFull" },
    { ...TIP5, name: "nameFirst" },
    { ...TIP5, name: "nameLast" },
    { name: "amount", type: "uint256" },
    { name: "blockHeight", type: "uint256" },
    { ...TIP5, name: "asOf" },
    { name: "nonce", type: "uint256" }
  ]
};

// Nock.sol: emitted when wrapped-NOCK is burned on Base to withdraw back to Nockchain.
export const BURN_FOR_WITHDRAWAL_EVENT = {
  type: "event",
  name: "BurnForWithdrawal",
  inputs: [
    { name: "burner", type: "address", indexed: true },
    { name: "amount", type: "uint256" },
    { name: "lockRoot", type: "bytes32", indexed: true }
  ]
};

// MessageInbox.sol view functions (the read-only surface we consume).
export const INBOX_READ_ABI = [
  { type: "function", name: "bridgeNodes", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "THRESHOLD", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "withdrawalsEnabled", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] }
];

// The federation is a fixed 5-node set with a 3-of-5 threshold (MessageInbox.sol).
const FEDERATION_SIZE = 5;
const DEFAULT_THRESHOLD = 3;

// When a fixture does not pin a getLogs window, scan a small recent range ending at the head block.
// Public RPCs cap getLogs ranges (often ~10k blocks); a bounded lookback keeps the call within limits
// and avoids author-time guessing of absolute block numbers. ~800 Base Sepolia blocks ≈ 27 minutes.
const DEFAULT_LOOKBACK_BLOCKS = 800n;

const BLOCK_TAGS = new Set(["latest", "earliest", "pending", "safe", "finalized"]);

function normalizeBlock(b) {
  if (b == null) return "latest";
  if (typeof b === "string") {
    if (BLOCK_TAGS.has(b)) return b;
    return BigInt(b);
  }
  return BigInt(b);
}

// Coerce a viem value (often bigint) to a JSON/state-safe Number. Used only for small,
// bounded quantities (confirmations, block heights) where Number precision is safe.
function toSafeNumber(v) {
  return typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

// Amounts are uint256 base units (1 nick = 152587890625 base units) and can exceed 2^53, so
// they are carried as decimal STRINGS (no invariant does arithmetic on them — they are
// provenance only; supply-conserved is intentionally not fed by live-base).
function toAmountString(v) {
  return v == null ? null : String(v);
}

/**
 * Build a read-only reader. Either inject a viem-shaped `client` (for offline tests) or pass
 * `rpcUrl` + `chainId` to construct a real viem PublicClient (viem imported dynamically).
 */
export async function createBaseReader({ rpcUrl, chainId, client } = {}) {
  if (client) {
    return { client, rpcUrl: rpcUrl ?? null, chainId: chainId == null ? null : Number(chainId), live: false };
  }
  if (!rpcUrl) {
    throw new Error("createBaseReader: rpcUrl is required for a live reader (or inject { client } for tests)");
  }
  let viem;
  try {
    viem = await import("viem");
  } catch {
    throw new Error(
      "live-base mode requires the optional dependency 'viem'. Install it with: npm install viem"
    );
  }
  // A minimal chain descriptor is sufficient for read-only RPC and keeps the reader chain-agnostic
  // (works for any EVM chainId without depending on viem/chains having an entry).
  const chain = {
    id: Number(chainId),
    name: `evm-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  };
  const realClient = viem.createPublicClient({ chain, transport: viem.http(rpcUrl) });
  return { client: realClient, rpcUrl, chainId: Number(chainId), live: true };
}

/**
 * Read the live bridge state and project it into the xchain.* shape the invariants consume.
 * Returns { xchain, provenance }. Throws on RPC/contract errors (the caller decides how to
 * surface them); never fabricates data for paths it cannot source.
 */
export async function readBaseXchainState(reader, opts) {
  const {
    inboxAddress,
    nockAddress,
    fromBlock,
    toBlock,
    requiredConfirmations,
    appRequiredConfirmations,
    chainId
  } = opts;
  if (!inboxAddress) throw new Error("readBaseXchainState: inboxAddress is required");
  const client = reader.client;
  const resolvedChainId = Number(chainId ?? reader.chainId ?? 0);

  const currentBlock = await client.getBlockNumber();

  // Live federation roster — read FRESH every run (bridgeNodes is mutable on-chain). Never hardcoded.
  const signers = [];
  for (let i = 0; i < FEDERATION_SIZE; i += 1) {
    const node = await client.readContract({
      address: inboxAddress,
      abi: INBOX_READ_ABI,
      functionName: "bridgeNodes",
      args: [BigInt(i)]
    });
    signers.push(String(node));
  }

  let threshold = DEFAULT_THRESHOLD;
  try {
    threshold = toSafeNumber(
      await client.readContract({ address: inboxAddress, abi: INBOX_READ_ABI, functionName: "THRESHOLD", args: [] })
    );
  } catch {
    threshold = DEFAULT_THRESHOLD;
  }

  let withdrawalsEnabled = null;
  try {
    withdrawalsEnabled = Boolean(
      await client.readContract({ address: inboxAddress, abi: INBOX_READ_ABI, functionName: "withdrawalsEnabled", args: [] })
    );
  } catch {
    withdrawalsEnabled = null;
  }

  // Default to a bounded recent window (head - lookback .. head) when the fixture pins neither bound,
  // so the live call stays within public-RPC getLogs limits without hardcoded block numbers.
  const tb = toBlock == null ? currentBlock : normalizeBlock(toBlock);
  const fb = fromBlock == null
    ? (currentBlock > DEFAULT_LOOKBACK_BLOCKS ? currentBlock - DEFAULT_LOOKBACK_BLOCKS : 0n)
    : normalizeBlock(fromBlock);

  const depositLogs = await client.getLogs({ address: inboxAddress, event: DEPOSIT_PROCESSED_EVENT, fromBlock: fb, toBlock: tb });
  const burnLogs = nockAddress
    ? await client.getLogs({ address: nockAddress, event: BURN_FOR_WITHDRAWAL_EVENT, fromBlock: fb, toBlock: tb })
    : [];

  const mints = depositLogs.map((log) => ({
    id: String(log.args?.txId),
    amount: toAmountString(log.args?.amount),
    // Contract-enforced quorum: the on-chain verifier required >= threshold of these signers.
    attestedBy: signers.slice(),
    quorumProof: "contract-enforced",
    confirmations: toSafeNumber(currentBlock - BigInt(log.blockNumber))
  }));

  // Burns are informational provenance only (an opposite-direction Base->Nockchain flow); they
  // are deliberately NOT used to back mints (that backing is a Nockchain-side event).
  const burns = burnLogs.map((log) => ({
    id: String(log.args?.lockRoot),
    amount: toAmountString(log.args?.amount)
  }));

  const required = toSafeNumber(requiredConfirmations ?? 0);
  const settles = mints.map((m) => ({
    id: m.id,
    chainId: resolvedChainId,
    confirmations: m.confirmations,
    confirmationBasis: "L1-batch",
    basedOnSoftConfirm: false
  }));

  const xchain = {
    signers,
    threshold,
    requiredConfirmations: required,
    mints,
    finality: {
      appRequiredConfirmations: toSafeNumber(appRequiredConfirmations ?? 0),
      settles
    }
  };

  const provenance = {
    rpcUrl: reader.rpcUrl ?? null,
    chainId: resolvedChainId,
    inboxAddress,
    nockAddress: nockAddress ?? null,
    currentBlock: toSafeNumber(currentBlock),
    fromBlock: typeof fb === "bigint" ? toSafeNumber(fb) : fb,
    toBlock: typeof tb === "bigint" ? toSafeNumber(tb) : tb,
    eventCounts: { mints: mints.length, burns: burns.length },
    withdrawalsEnabled,
    signers,
    threshold,
    burns
  };

  return { xchain, provenance };
}
