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
// seed / mnemonic / api-key / token / password) and additionally matches the
// documented raw-state forbidden keys (rawPmaSlab / rawStateJam / rawEventLog /
// rawGrpcPayload / rawTransactionJam / stateJam / eventLog / checkpoint /
// walletExport) so a submission carrying those cannot slip past the noSecretFields
// gate.

const secretKeyPattern =
  /(?:private|secret|seed|mnemonic|api[-_]?key|token|password|raw[-_]?(?:pma[-_]?slab|state[-_]?jam|event[-_]?log|grpc[-_]?payload|transaction[-_]?jam)|state[-_]?jam|event[-_]?log|checkpoint|wallet[-_]?export)/i;

// Default recursion bound for the secret scan. The scan runs synchronously over
// attacker-controlled JSON reached from public, unauthenticated POST routes, so a
// small deeply-nested payload (that JSON.parse accepts cleanly) could otherwise
// overflow the call stack and crash the request handler. On exceeding the bound
// we fail closed (return true -> the submission is treated as containing a
// secret-like field and rejected), consistent with the existing semantics.
const MAX_SCAN_DEPTH = 64;

export function containsSecretLikeField(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (depth >= MAX_SCAN_DEPTH) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((child) => containsSecretLikeField(child, depth + 1));
  }

  return Object.entries(value).some(
    ([key, child]) => secretKeyPattern.test(key) || containsSecretLikeField(child, depth + 1)
  );
}

const REDACTED = "[redacted]";

// Deep-redacted copy of a value: any entry whose key matches the secret deny-list
// is replaced with "[redacted]". Applied unconditionally and recursively because
// secrets can nest under otherwise-innocuous keys, so callers never echo raw
// secret-like material back to clients even on the rejected path. Bounded by the
// same depth guard as containsSecretLikeField; beyond the bound the subtree is
// dropped to "[redacted]" (fail closed). Non-object/array values pass through
// unchanged.
export function redactSecretFields<T>(value: T, depth = 0): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (depth >= MAX_SCAN_DEPTH) {
    return REDACTED as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((child) => redactSecretFields(child, depth + 1)) as unknown as T;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    redacted[key] = secretKeyPattern.test(key) ? REDACTED : redactSecretFields(child, depth + 1);
  }

  return redacted as T;
}
