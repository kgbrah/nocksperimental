// Named Nockchain v1 transaction-validation rejection reasons.
//
// Post-Bythos the mempool DROPS (does not queue) context-invalid txs, each with
// a specific reason code. Asserting the exact code in a negative-control fixture
// — and surfacing it in the lab report — turns an opaque "rejected" into a
// precise, checkable diagnostic: a proof that the fixture models the intended
// failure mode and not some incidental one. (nockchain roadmap alignment 2026;
// validation-pipeline.md.)

export const NOCK_REJECTION_CODES = {
  "%v1-input-missing": "A declared input note is absent from the spend.",
  "%v1-spend-version-mismatch": "The spend's lock/proof version doesn't match the note's origin-page era.",
  "%v1-spend-1-lock-failed": "A v1 lock script failed to satisfy its spend condition.",
  "%v1-note-data-exceeds-max-size": "A note's data payload exceeds the protocol maximum size.",
} as const;

export type NockRejectionCode = keyof typeof NOCK_REJECTION_CODES;

/** The documented rejection-code vocabulary as a flat list. */
export const KNOWN_REJECTION_CODES: readonly string[] = Object.keys(NOCK_REJECTION_CODES);

/** True if `value` is one of the documented rejection codes. */
export function isKnownRejectionCode(value: unknown): value is NockRejectionCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NOCK_REJECTION_CODES, value);
}

/** Human-readable description for a known code, or null. */
export function describeRejectionCode(code: string): string | null {
  return isKnownRejectionCode(code) ? NOCK_REJECTION_CODES[code] : null;
}
