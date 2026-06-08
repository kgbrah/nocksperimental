// Shared secret-field deny-list scrubber for evidence submissions.
//
// AGENTS.md mandates that we never store or echo private keys, seed phrases,
// wallet exports, raw payment material, API keys, unredacted env dumps, raw PMA
// slabs, checkpoints, state jams, or event logs. The VESL and Nockup evidence
// libs previously carried byte-identical copies of this deny-list + recursive
// scan; two copies can silently drift and weaken the filter in one module, so
// the canonical implementation lives here and both libs import it.
//
// The pattern keeps the original secret-credential terms (private / secret /
// seed / mnemonic / api-key / token / password) and the documented raw-state
// forbidden keys (rawPmaSlab / rawStateJam / rawEventLog / rawGrpcPayload /
// rawTransactionJam / stateJam / eventLog / checkpoint / walletExport). It also
// covers transport/credential material that can nest under public evidence —
// authorization / bearer / cookie / credential / passphrase and the *-key
// variants (signingKey / sessionKey / accessKey, which lack a standalone "key"
// term) — plus raw payment/transaction material (txHash / transactionHash /
// rawTransaction / rawTx / rawJam / rawPayload / rawBytes / rawHash). Without
// these, a submission keyed with e.g. `signingKey` or `authorization` slipped
// past the noSecretFields gate and was persisted/echoed verbatim.
//
// It additionally covers canonical abbreviated wallet-secret key names the longer
// terms miss: privKey/priv_key (the `private` term truncates to `priv` and does
// not reach `key`), recoveryPhrase/recoveryWords, keystore/key_store, xpriv/xprv
// extended keys, and encryptedKey/encryptionKey. The same single pattern powers
// both the reject gate (containsSecretLikeField) and the redactor
// (redactSecretFields), so one missing term simultaneously fails to reject AND
// fails to redact before persistence. xpriv/xprv carry word boundaries so a
// benign key like `maxprivacy`/`xprivilege` is not over-flagged.

const secretKeyPattern =
  /(?:private|priv[-_]?key|secret|seed|mnemonic|recovery[-_]?(?:phrase|words?)|passphrase|credential|password|api[-_]?key|access[-_]?key|sign(?:ing)?[-_]?key|session[-_]?key|key[-_]?store|\bx(?:priv|prv)\b|encrypt(?:ed|ion)?[-_]?key|token|authorization|bearer|cookie|tx[-_]?hash|transaction[-_]?hash|raw[-_]?(?:pma[-_]?slab|state[-_]?jam|event[-_]?log|grpc[-_]?payload|transaction[-_]?jam|transaction|tx|jam|payload|bytes|hash)|state[-_]?jam|event[-_]?log|checkpoint|wallet[-_]?export)/i;

// Secret-SHAPED string VALUES. The deny-list above is key-name-only, so a secret
// placed under a benign key name (e.g. {"note":"0x<64 hex>"}) would still be
// persisted and echoed. These conservative, high-confidence shapes catch that
// without over-redacting legitimate evidence values. Deliberately NOT matched, so
// real data survives: bare 64-hex sha256 hashes, "sha256:..." fingerprints, base58
// wallet addresses, and 0x-prefixed 40-hex (20-byte) public addresses.
const secretValuePatterns = [
  /^0x[0-9a-fA-F]{64,}$/, // 0x + >=32 bytes -> raw private key / secret (not a 40-hex address)
  /^xprv[1-9A-HJ-NP-Za-km-z]{20,}$/, // BIP32 extended PRIVATE key (xpub is public, excluded)
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private-key block
  /\bsk_(?:live|test)_[0-9A-Za-z]{8,}\b/ // secret API key (Stripe-style)
];

// True for a string value whose shape strongly indicates secret material. Returns
// false for any non-string so it is safe to call on every node. The BIP39 check
// requires a run of exactly 12/15/18/21/24 lowercase-alpha words (valid mnemonic
// lengths) so ordinary short prose values are not over-matched.
function isSecretLikeValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (secretValuePatterns.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  const words = trimmed.split(/\s+/);
  return [12, 15, 18, 21, 24].includes(words.length) && words.every((word) => /^[a-z]{3,8}$/.test(word));
}

// Bounds for the secret scan, which runs synchronously over attacker-controlled
// JSON reached from public, unauthenticated POST routes. MAX_SCAN_DEPTH guards
// against a deeply-nested payload overflowing the call stack; MAX_SCAN_NODES is a
// breadth bound so a wide payload (millions of sibling entries, e.g. one that
// omits Content-Length to slip the body-size cap) cannot force an unbounded
// scan/redact. On exceeding either bound we fail closed — the scan reports a
// secret (submission rejected) and the redactor drops the subtree to "[redacted]".
const MAX_SCAN_DEPTH = 64;
const MAX_SCAN_NODES = 20_000;

export function containsSecretLikeField(value: unknown, depth = 0): boolean {
  // Count every key/element examined (not just container nodes) so a wide, flat
  // payload of scalar siblings is bounded by MAX_SCAN_NODES, not just deep ones.
  let nodes = 0;
  const scan = (val: unknown, currentDepth: number): boolean => {
    if (!val || typeof val !== "object") {
      return false;
    }
    if (currentDepth >= MAX_SCAN_DEPTH) {
      return true;
    }
    if (Array.isArray(val)) {
      for (const child of val) {
        nodes += 1;
        if (nodes > MAX_SCAN_NODES) {
          return true;
        }
        if (isSecretLikeValue(child) || scan(child, currentDepth + 1)) {
          return true;
        }
      }
      return false;
    }
    for (const [key, child] of Object.entries(val)) {
      nodes += 1;
      if (nodes > MAX_SCAN_NODES) {
        return true;
      }
      if (secretKeyPattern.test(key) || isSecretLikeValue(child) || scan(child, currentDepth + 1)) {
        return true;
      }
    }
    return false;
  };
  return scan(value, depth);
}

const REDACTED = "[redacted]";

// Deep-redacted copy of a value: any entry whose key matches the secret deny-list
// — or whose string value is itself secret-shaped (isSecretLikeValue) — is replaced
// with "[redacted]". Applied unconditionally and recursively because secrets can
// nest under otherwise-innocuous keys (and benign-named keys can hold raw secret
// values), so callers never echo raw secret-like material back to clients even on
// the rejected path. Bounded by the
// same depth + node guards as containsSecretLikeField; beyond either bound the
// subtree is dropped to "[redacted]" (fail closed). Non-object/array values pass
// through unchanged.
export function redactSecretFields<T>(value: T, depth = 0): T {
  // Count every key/element processed (see containsSecretLikeField) so the deep
  // copy a wide payload forces is bounded; past the budget the subtree fails closed.
  let nodes = 0;
  const redact = (val: unknown, currentDepth: number): unknown => {
    if (!val || typeof val !== "object") {
      return val;
    }
    if (currentDepth >= MAX_SCAN_DEPTH) {
      return REDACTED;
    }
    if (Array.isArray(val)) {
      const out: unknown[] = [];
      for (const child of val) {
        nodes += 1;
        if (nodes > MAX_SCAN_NODES) {
          return REDACTED;
        }
        out.push(isSecretLikeValue(child) ? REDACTED : redact(child, currentDepth + 1));
      }
      return out;
    }
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(val)) {
      nodes += 1;
      if (nodes > MAX_SCAN_NODES) {
        return REDACTED;
      }
      out[key] = secretKeyPattern.test(key) || isSecretLikeValue(child) ? REDACTED : redact(child, currentDepth + 1);
    }
    return out;
  };
  return redact(value, depth) as T;
}
