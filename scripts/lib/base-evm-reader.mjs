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

// Tip5Hash { uint64[5] limbs } — the bridge's Nockchain-native hash type, used in both the
// DepositProcessed event data and the submitDeposit function inputs below.
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

// MessageInbox.submitDeposit — decoded from the mint tx's calldata to recover the actual ECDSA signers
// (the DepositProcessed event does not carry them).
export const SUBMIT_DEPOSIT_ABI = [
  {
    type: "function",
    name: "submitDeposit",
    stateMutability: "nonpayable",
    inputs: [
      { ...TIP5, name: "txId" },
      { ...TIP5, name: "nameFirst" },
      { ...TIP5, name: "nameLast" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "blockHeight", type: "uint256" },
      { ...TIP5, name: "asOf" },
      { name: "depositNonce", type: "uint256" },
      { name: "ethSigs", type: "bytes[]" }
    ],
    outputs: []
  }
];

// secp256k1 order and its half — the contract requires canonical low-s (0 < s <= N/2) and v in {27,28}
// (MessageInbox.sol recoverSigner). We mirror those checks so a signature the contract would reject is
// not counted as an attestation.
const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const SECP256K1_HALF_N = SECP256K1_N / 2n;

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
  // Stash the loaded module so signer recovery reuses it instead of importing viem a second time.
  return { client: realClient, rpcUrl, chainId: Number(chainId), live: true, viem };
}

// Recover the ACTUAL bridge-node signers of a deposit from the mint tx's submitDeposit calldata,
// reproducing MessageInbox.sol verification byte-for-byte: keccak256 of the 276-byte packed preimage
// (each Tip5 = its 5 individual uint64 limbs big-endian — NOT array-padded — then recipient, amount,
// blockHeight, asOf, depositNonce), wrapped in the EIP-191 personal-sign prefix, then ecrecover per
// signature with the contract's canonical low-s (0 < s <= N/2) and v in {27,28} checks. Returns the
// roster addresses (roster casing) that actually signed, deduped. viem is passed in by the caller.
async function recoverDepositSigners(client, txHash, signers, viem) {
  const { decodeFunctionData, encodePacked, keccak256, hashMessage, recoverAddress } = viem;
  const tx = await client.getTransaction({ hash: txHash });
  if (!tx?.input) return [];
  const decoded = decodeFunctionData({ abi: SUBMIT_DEPOSIT_ABI, data: tx.input });
  if (decoded.functionName !== "submitDeposit") return [];
  const [txId, nameFirst, nameLast, recipient, amount, blockHeight, asOf, depositNonce, ethSigs] = decoded.args;
  const limbs = (t) => Array.from(t.limbs, (x) => BigInt(x));
  const preimage = encodePacked(
    [
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "address", "uint256", "uint256",
      "uint64", "uint64", "uint64", "uint64", "uint64",
      "uint256"
    ],
    [
      ...limbs(txId), ...limbs(nameFirst), ...limbs(nameLast),
      recipient, BigInt(amount), BigInt(blockHeight),
      ...limbs(asOf), BigInt(depositNonce)
    ]
  );
  const ethSignedHash = hashMessage({ raw: keccak256(preimage) });
  const recovered = new Set();
  for (const sig of ethSigs ?? []) {
    const hex = String(sig).replace(/^0x/, "");
    if (hex.length !== 130) continue; // not a 65-byte (r,s,v) signature
    const s = BigInt(`0x${hex.slice(64, 128)}`);
    const v = parseInt(hex.slice(128, 130), 16);
    if (!(s > 0n && s <= SECP256K1_HALF_N)) continue; // non-canonical s — contract rejects
    if (v !== 27 && v !== 28) continue;
    try {
      const addr = await recoverAddress({ hash: ethSignedHash, signature: `0x${hex}` });
      recovered.add(addr.toLowerCase());
    } catch {
      // unrecoverable signature — skip (the contract would reject it too)
    }
  }
  return signers.filter((node) => recovered.has(String(node).toLowerCase()));
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

  const readView = (functionName, args = []) =>
    client.readContract({ address: inboxAddress, abi: INBOX_READ_ABI, functionName, args });

  // Head block + the live federation roster (read FRESH — bridgeNodes is mutable on-chain) + THRESHOLD
  // + withdrawalsEnabled are all independent reads, so issue them as one concurrent batch instead of
  // 7 serial round-trips. THRESHOLD/withdrawalsEnabled fall back per-read; a roster read failing throws.
  const [currentBlock, rosterRaw, threshold, withdrawalsEnabled] = await Promise.all([
    client.getBlockNumber(),
    Promise.all(Array.from({ length: FEDERATION_SIZE }, (_, i) => readView("bridgeNodes", [BigInt(i)]))),
    readView("THRESHOLD").then((v) => toSafeNumber(v)).catch(() => DEFAULT_THRESHOLD),
    readView("withdrawalsEnabled").then((v) => Boolean(v)).catch(() => null)
  ]);
  const signers = rosterRaw.map((node) => String(node));

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

  // Per-mint quorum evidence. Default: recover the actual signers from each mint tx (log-provable),
  // falling back to the contract-enforced roster when recovery is unavailable or incomplete. Recovery
  // needs viem + a client exposing getTransaction; the offline mock path simply falls back. Reuse the
  // module the live reader already loaded (avoids a second dynamic import).
  const recoverSigners = opts.recoverSigners !== false;
  let viem = null;
  if (recoverSigners && typeof client.getTransaction === "function") {
    viem = reader.viem ?? null;
    if (!viem) {
      try {
        viem = await import("viem");
      } catch {
        viem = null;
      }
    }
  }
  // Recover all mints' signers concurrently; a failed (tx fetch/decode) recovery resolves to null.
  const recoveries = await Promise.all(
    depositLogs.map((log) =>
      viem && log.transactionHash
        ? recoverDepositSigners(client, log.transactionHash, signers, viem).catch(() => null)
        : Promise.resolve(null)
    )
  );
  const mints = depositLogs.map((log, i) => {
    const recovered = recoveries[i];
    // Upgrade to log-derived only when recovery reproduces at least the threshold of roster signers the
    // contract required; a short/failed result keeps the contract-enforced fallback (no false failure).
    const logDerived = Array.isArray(recovered) && recovered.length >= threshold;
    return {
      id: String(log.args?.txId),
      amount: toAmountString(log.args?.amount),
      attestedBy: logDerived ? recovered : signers.slice(),
      quorumProof: logDerived ? "log-derived" : "contract-enforced",
      confirmations: toSafeNumber(currentBlock - BigInt(log.blockNumber))
    };
  });

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
