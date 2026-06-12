// Client-side (browser) re-checks for a Nock tx-inclusion anchor served by the
// orchestrator's GET /round/:id/anchor. The node already proves AND verifies the
// Merkle path against the block's canonical tx-root before returning the anchor
// (hence verifiability "nock-inclusion-node-attested"). The browser cannot yet
// recompute the Tip5 z-set hashes — that needs an in-browser WASM Tip5 verifier
// — but it CAN independently confirm two things WITHOUT trusting the node's
// self-declared label:
//
//   1. structural integrity — every digest is present + well-formed, the axis is
//      a real leaf position, and a non-trivial leaf carries a sibling path;
//   2. root-consistency — the proof's own root equals the block's canonical
//      tx-root the node reported. A node that returned a path rooted at a
//      DIFFERENT tx-root (or a placeholder) is caught here, in the browser.
//
// And, with the KAT-validated in-browser Tip5 port (src/lib/tip5/*), it can now
// go all the way: RE-FOLD the Merkle path to the tx-root in the browser, matching
// the chain's hashes bit-for-bit — fully independent verification, no node trust.

import { verifyNockInclusionProof } from "@/lib/tip5/merkle";

export type NockInclusionAnchor = {
  network: string;
  verifiability: string;
  blockId: string;
  height: number;
  txId: string;
  txRoot: string;
  axis: number;
  merkleProof: { root: string; path: string[] };
};

export type AnchorCheckLevel =
  | "malformed" // structurally invalid — make no client-side claim
  | "inconsistent" // structurally ok but proof root != block tx-root — INTEGRITY ALERT
  | "root-consistent" // root == tx-root, but the Tip5 fold could not be re-derived (node-attested)
  | "independently-verified"; // the browser re-folded the Merkle path to the tx-root via Tip5 — no node trust

export type AnchorCheck = {
  level: AnchorCheckLevel;
  structurallyValid: boolean;
  rootMatchesTxRoot: boolean;
  /** human-readable findings, in display order. */
  notes: string[];
};

const nonEmptyStr = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;

/** Structural validity of an inclusion anchor before any cryptographic claim. */
export function isWellFormedNockAnchor(a: NockInclusionAnchor | null | undefined): a is NockInclusionAnchor {
  if (!a) return false;
  if (!nonEmptyStr(a.network) || !nonEmptyStr(a.verifiability)) return false;
  if (!nonEmptyStr(a.blockId) || !nonEmptyStr(a.txId) || !nonEmptyStr(a.txRoot)) return false;
  if (typeof a.height !== "number" || !Number.isFinite(a.height) || a.height < 0) return false;
  if (typeof a.axis !== "number" || !Number.isInteger(a.axis) || a.axis < 1) return false;
  const mp = a.merkleProof;
  if (!mp || !nonEmptyStr(mp.root) || !Array.isArray(mp.path)) return false;
  if (!mp.path.every(nonEmptyStr)) return false;
  // A non-trivial leaf position (axis > 1) must carry at least one sibling hash.
  if (a.axis > 1 && mp.path.length < 1) return false;
  return true;
}

/**
 * Re-derive what the browser can confirm about an inclusion anchor on its own,
 * without trusting the node's `verifiability` label. Never throws; returns a
 * structured verdict the UI renders honestly (a mismatch is surfaced as a
 * failure, not as "verified").
 */
export function verifyNockAnchorClientSide(a: NockInclusionAnchor | null | undefined): AnchorCheck {
  const notes: string[] = [];
  if (!isWellFormedNockAnchor(a)) {
    notes.push("anchor is missing or malformed — no client-side claim made");
    return { level: "malformed", structurallyValid: false, rootMatchesTxRoot: false, notes };
  }
  const rootMatchesTxRoot = a.merkleProof.root === a.txRoot;
  if (!rootMatchesTxRoot) {
    notes.push("proof root does NOT match the block tx-root — inclusion claim rejected client-side");
    return { level: "inconsistent", structurallyValid: true, rootMatchesTxRoot: false, notes };
  }
  // Full independent re-derivation: re-fold the Merkle path to the tx-root with the
  // in-browser Tip5 (bit-exact, KAT-validated) — no trust in the node's label.
  const independent = verifyNockInclusionProof({
    txId: a.txId,
    txRoot: a.txRoot,
    axis: a.axis,
    merkleProof: a.merkleProof,
  });
  if (independent.independentlyVerified) {
    notes.push("Merkle path re-folded to the block tx-root in your browser via Tip5 — independently verified, no node trust");
    notes.push(`${a.merkleProof.path.length}-step Merkle path at axis ${a.axis}`);
    return { level: "independently-verified", structurallyValid: true, rootMatchesTxRoot: true, notes };
  }
  notes.push("proof root matches the block's canonical tx-root (checked in your browser)");
  notes.push(`independent Tip5 re-derivation unavailable: ${independent.reason ?? "fold mismatch"} — node-attested`);
  return { level: "root-consistent", structurallyValid: true, rootMatchesTxRoot: true, notes };
}
