// Shared 32-bit FNV-1a stable hash used to derive receipt ids, evidence hashes,
// and connection ids. This routine was copy-pasted byte-for-byte across the
// fakenet/vesl/nockup evidence libs and the fakenet connection profile; a
// divergent edit to the magic constants would silently break receipt-id
// compatibility, so the single canonical implementation lives here. Output is
// byte-identical to the former local copies (offset basis 2166136261, prime
// 16777619, 8-char zero-padded lowercase hex), so all existing receiptIds /
// evidenceHashes / connectionIds are unchanged.
export function stableId(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
