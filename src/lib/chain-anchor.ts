// A ChainAnchor binds a signed receipt to the chain's OWN proof surfaces, so a
// verifier can re-check the receipt against the chain instead of trusting the
// issuer's signature alone. It is carried inside the Ed25519-signed payload
// (tamper -> signature fails) AND independently re-verified against the chain
// (fake block/tx -> re-verify fails). Two independent gates = forgery-safe.
//
// `verifiability` is honest about how far the chain can confirm it:
//   "evm-full"               - Base/EVM: tx receipt + block + log inclusion are
//                              independently re-checkable today (Phase 1).
//   "nock-inclusion"         - Nockchain: block id + tx-in-block Merkle proof +
//                              note name, Tip5-verifiable (Phase 2/3, once the
//                              node serves GetTransactionProof).
//   "nock-block-note-pending"- Nockchain: block assignment + deterministic note
//                              name only; tx-inclusion path pending protocol
//                              exposure. Honest interim tier.

export type ChainAnchorVerifiability = "evm-full" | "nock-inclusion" | "nock-block-note-pending";

export type ChainAnchorNetwork = "base-sepolia" | "base" | "nockchain-fakenet" | "nockchain";

export type ChainAnchor = {
  network: ChainAnchorNetwork;
  chainId?: number; // EVM chains
  verifiability: ChainAnchorVerifiability;
  /** block hash (EVM) or block id / digest (Nock), as the chain reports it. */
  blockHash: string;
  blockHeight: number;
  /** the transaction this receipt corresponds to. */
  txId: string;
  /** witness/proof format that applied (EVM receipt vs Nock stub/%full lock-Merkle). */
  witnessFormat: "evm-receipt" | "stub" | "%full";
  /** protocol/engine identity so a later upgrade can't silently invalidate the anchor. */
  engineVersion: string;
  // --- EVM leg ---
  /** emitting contract for the bound event log. */
  contract?: string;
  /** topic0 (event signature hash) of the bound log. */
  eventTopic?: string;
  /** index of the bound log within the tx receipt. */
  logIndex?: number;
  // --- Nock leg (Phase 2/3) ---
  /** deterministic note name (first/last) on Nockchain. */
  noteName?: { first: string; last: string };
  /** tx-in-block Merkle inclusion proof: sibling hashes leaf->root + the tx-root + leaf axis. */
  merkleProof?: { root: string; path: string[]; axis: number };
};

const isHex = (s: unknown): s is string => typeof s === "string" && /^0x[0-9a-fA-F]+$/.test(s);

/**
 * Build an EVM (Base) chain anchor from a transaction receipt and the index of
 * the event log that the receipt attests (e.g. the BurnForWithdrawal that a
 * bridge-redeem honored). Captures exactly what a verifier re-fetches.
 */
export function buildBaseAnchor(args: {
  network: "base-sepolia" | "base";
  chainId: number;
  blockHash: string;
  blockNumber: number | bigint;
  txHash: string;
  contract: string;
  eventTopic: string;
  logIndex: number;
}): ChainAnchor {
  return {
    network: args.network,
    chainId: args.chainId,
    verifiability: "evm-full",
    blockHash: args.blockHash.toLowerCase(),
    blockHeight: Number(args.blockNumber),
    txId: args.txHash.toLowerCase(),
    witnessFormat: "evm-receipt",
    engineVersion: `evm-${args.chainId}`,
    contract: args.contract.toLowerCase(),
    eventTopic: args.eventTopic.toLowerCase(),
    logIndex: args.logIndex,
  };
}

/** Structural validity: an anchor that is present must be non-empty + well-formed. */
export function isWellFormedAnchor(a: ChainAnchor | undefined | null): a is ChainAnchor {
  if (!a) return false;
  if (!a.network || !a.verifiability) return false;
  if (typeof a.blockHeight !== "number" || a.blockHeight < 0) return false;
  if (!a.blockHash || !a.txId || !a.engineVersion) return false;
  if (a.verifiability === "evm-full") {
    return isHex(a.blockHash) && isHex(a.txId) && isHex(a.contract ?? "") && isHex(a.eventTopic ?? "") && typeof a.logIndex === "number";
  }
  return true;
}

/**
 * Deep canonical equality — the verifier requires signedPayload.chainAnchor to
 * equal badge.evidence.chainAnchor (same discipline as kernelHash/baseDeploymentHash),
 * so a forger can't pair a signed anchor with a different displayed one.
 */
export function anchorsEqual(a: ChainAnchor | undefined, b: ChainAnchor | undefined): boolean {
  if (!a || !b) return a === b;
  return canonicalAnchor(a) === canonicalAnchor(b);
}

export function canonicalAnchor(a: ChainAnchor): string {
  // stable key order so equality is order-independent
  const keys = Object.keys(a).sort();
  return JSON.stringify(a, keys);
}
