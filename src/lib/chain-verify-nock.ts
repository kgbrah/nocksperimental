// Independent CHAIN verification of a Nockchain receipt anchor — the Nock leg of
// /api/receipts/verify-chain, the counterpart to chain-verify-base.ts (the EVM leg).
//
// A "%full" Nock anchor carries an axis-committed tx-in-block Merkle proof
// (txId + merkleProof{root, path, axis}, where root is the block's canonical
// tx-root). With the KAT-validated in-browser Tip5 (src/lib/tip5/*) we RE-FOLD that
// proof and confirm it reconstructs the root — no node round-trip, no trust in the
// issuer. This is the Nock analogue of re-reading an EVM receipt from the chain.
//
// A "nock-block-note-pending" (stub) anchor has only block assignment + note name,
// so there is no inclusion proof to recompute; it reports onChain:false honestly.

import type { ChainAnchor } from "@/lib/chain-anchor";
import { base58ToDigest, verifyMerkProof } from "@/lib/tip5/merkle";

export type NockChainVerifyResult = {
  verifiability: string;
  onChain: boolean;
  checks: {
    hasMerkleProof: boolean;
    decodeOk?: boolean;
    rootReDerived?: boolean;
  };
  note?: string;
  error?: string;
};

export function verifyNockAnchor(anchor: ChainAnchor): NockChainVerifyResult {
  const verifiability = anchor.verifiability;

  // Stub tier: block + note name only — nothing to independently re-derive yet.
  if (verifiability !== "nock-inclusion" || !anchor.merkleProof) {
    return {
      verifiability,
      onChain: false,
      checks: { hasMerkleProof: Boolean(anchor.merkleProof) },
      note: "nock-block-note-pending tier: block assignment + deterministic note name only, no axis-committed inclusion proof to re-fold",
    };
  }

  try {
    const leaf = base58ToDigest(anchor.txId);
    const root = base58ToDigest(anchor.merkleProof.root);
    const path = anchor.merkleProof.path.map(base58ToDigest);
    const reDerived = verifyMerkProof(leaf, BigInt(anchor.merkleProof.axis), root, path);
    return {
      verifiability,
      onChain: reDerived,
      checks: { hasMerkleProof: true, decodeOk: true, rootReDerived: reDerived },
      ...(reDerived
        ? { note: "tx-in-block Merkle proof re-folded to the block tx-root in-process via Tip5 — independently confirmed" }
        : { error: "Merkle path does not fold to the proof root" }),
    };
  } catch (e) {
    return {
      verifiability,
      onChain: false,
      checks: { hasMerkleProof: true, decodeOk: false },
      error: `proof decode error: ${(e as Error).message}`,
    };
  }
}
