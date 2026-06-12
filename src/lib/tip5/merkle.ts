// Tip5 z-set Merkle inclusion verification — the client-side counterpart to the
// kernel's verify-merk-proof (nockchain hoon/common/ztd/three.hoon L2068) and the
// base58 ⇄ digest codec (crates/.../tip5_util.rs). Together with the KAT-validated
// Tip5 port (./tip5), this lets the browser RE-DERIVE a tx-inclusion proof's root
// from the tx-id + axis + sibling path WITHOUT trusting the node — upgrading a Nock
// anchor from "node-attested" to independently verified.

import { P } from "@/lib/tip5/field";
import { hash10 } from "@/lib/tip5/tip5";

/** A Tip5 digest: five Goldilocks limbs (little-endian base-P), as bigints. */
export type Digest = [bigint, bigint, bigint, bigint, bigint];

// Bitcoin/IPFS base58 alphabet (bs58 default) — must match the node's bs58 crate.
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, bigint> = {};
for (let i = 0; i < B58.length; i++) B58_MAP[B58[i]] = BigInt(i);

/** base58 string → unsigned integer (Horner). Equals UBig::from_be_bytes(bs58::decode). */
export function base58ToBigInt(s: string): bigint {
  let n = 0n;
  for (const ch of s) {
    const d = B58_MAP[ch];
    if (d === undefined) throw new Error(`invalid base58 character: ${ch}`);
    n = n * 58n + d;
  }
  return n;
}

/** unsigned integer → 5 base-P limbs (tip5_util.rs decimal_to_base_p). */
export function bigIntToDigest(value: bigint): Digest {
  let v = value;
  const limbs: bigint[] = [];
  for (let i = 0; i < 5; i++) {
    limbs.push(v % P);
    v /= P;
  }
  return limbs as Digest;
}

/** A base58-encoded Tip5 hash (as the orchestrator anchor serves it) → digest. */
export function base58ToDigest(s: string): Digest {
  return bigIntToDigest(base58ToBigInt(s));
}

export function digestEq(a: Digest, b: Digest): boolean {
  return a.length === 5 && b.length === 5 && a.every((x, i) => x === b[i]);
}

/** hash-ten-cell: Tip5 hash of two child digests concatenated (10 limbs → digest). */
export function hashTenCell(a: Digest, b: Digest): Digest {
  return hash10([...a, ...b]) as Digest;
}

/**
 * Fold a Merkle inclusion proof to its root — a faithful port of the kernel's
 * verify-merk-proof. Given the leaf (tx-id digest), its axis (leaf position), the
 * claimed root, and the sibling path, returns true iff the recomputed root equals
 * the claimed root. Axis navigation: even ⇒ this node is a left child (hash(node,
 * sib)); odd ⇒ right child (hash(sib, node)). Fail-closed on any shape mismatch.
 */
export function verifyMerkProof(leaf: Digest, axis: bigint, root: Digest, path: Digest[]): boolean {
  if (axis === 0n) return false;
  let a = axis;
  let node = leaf;
  let rest = path;
  // Bounded by the path length (each step consumes one sibling); guard anyway.
  for (let guard = 0; guard <= path.length + 1; guard++) {
    if (a === 1n) return digestEq(root, node) && rest.length === 0;
    if (rest.length === 0) return false;
    const sib = rest[0];
    if (a === 2n) return digestEq(root, hashTenCell(node, sib)) && rest.length === 1;
    if (a === 3n) return digestEq(root, hashTenCell(sib, node)) && rest.length === 1;
    if (a % 2n === 0n) {
      node = hashTenCell(node, sib);
      a = a / 2n;
    } else {
      node = hashTenCell(sib, node);
      a = (a - 1n) / 2n;
    }
    rest = rest.slice(1);
  }
  return false;
}

/**
 * End-to-end independent check of an orchestrator tx-inclusion anchor: decode the
 * base58 tx-id / tx-root / sibling path, re-derive the Merkle root in-browser, and
 * confirm it equals BOTH the proof's root and the block's canonical tx-root. No
 * trust in the node's `verifiability` label. Never throws — returns a verdict.
 */
export function verifyNockInclusionProof(anchor: {
  txId: string;
  txRoot: string;
  axis: number;
  merkleProof: { root: string; path: string[] };
}): { independentlyVerified: boolean; reason?: string } {
  try {
    const leaf = base58ToDigest(anchor.txId);
    const txRoot = base58ToDigest(anchor.txRoot);
    const proofRoot = base58ToDigest(anchor.merkleProof.root);
    const path = anchor.merkleProof.path.map(base58ToDigest);
    if (!digestEq(proofRoot, txRoot)) {
      return { independentlyVerified: false, reason: "proof root ≠ block tx-root" };
    }
    const folds = verifyMerkProof(leaf, BigInt(anchor.axis), proofRoot, path);
    if (!folds) return { independentlyVerified: false, reason: "Merkle path does not fold to the tx-root" };
    return { independentlyVerified: true };
  } catch (e) {
    return { independentlyVerified: false, reason: `decode error: ${(e as Error).message}` };
  }
}
