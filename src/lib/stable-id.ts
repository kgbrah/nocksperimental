import { createHash } from "node:crypto";

// Shared 32-bit FNV-1a stable hash used to derive NON-security ids: connection ids
// and display/dedup ids (effect / peek / command / artifact ids). This routine was
// copy-pasted byte-for-byte across the fakenet/vesl/nockup evidence libs and the
// fakenet connection profile; a divergent edit to the magic constants would silently
// break id compatibility, so the single canonical implementation lives here. Output
// is byte-identical to the former local copies (offset basis 2166136261, prime
// 16777619, 8-char zero-padded lowercase hex), so all existing connection/display
// ids are unchanged.
//
// Do NOT use stableId to derive receiptIds or evidenceHashes: its 32-bit space makes
// a second-preimage collision feasible offline (~2^32), which — combined with
// content-addressed receipt keys — was an unauthenticated receipt-overwrite vector.
// Use secureId for those (256-bit, collision-resistant).
export function stableId(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

// 256-bit SHA-256 hex digest for SECURITY-relevant id derivation (receiptId,
// evidenceHash) where collision-resistance is required so a content-addressed key
// cannot be targeted by a crafted second submission. Distinct from stableId, which
// stays the (stable, brief) choice for non-security connection/display ids.
export function secureId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
