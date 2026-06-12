// Bythos transaction fee estimator — counts WORDS, not bytes.
//
// Post-Bythos the minimum fee is a word-weighted size charge with the witness
// discounted 4:1 (a witness word costs r/4), floored at 256 nicks:
//
//     fee = max(256, seed_words · r  +  witness_words · r/4)
//
// The rate r = 128 nicks/word is pinned from the live create-tx planner traces on
// the casino-fresh node, e.g. seed_words=13, witness_words=9356 → min_fee=301056
// = 13·128 + 9356·32 (confirmed across multiple plans). Both the casino payout fee
// model and x402 verification quotes must recompute on this, not a byte count.
// (nockchain roadmap alignment 2026.)

export const NICKS_PER_SEED_WORD = 128; // r
export const NICKS_PER_WITNESS_WORD = NICKS_PER_SEED_WORD / 4; // r/4 (witness 4:1 discount)
export const MIN_FEE_NICKS = 256; // floor

export type FeeEstimate = {
  seedWords: number;
  witnessWords: number;
  /** the raw word-weighted charge before the floor */
  rawNicks: number;
  /** the fee actually charged (>= MIN_FEE_NICKS) */
  feeNicks: number;
  flooredToMin: boolean;
};

/** Estimate the Bythos minimum fee (nicks) for a tx of the given word counts. */
export function estimateFeeNicks(
  seedWords: number,
  witnessWords: number,
  rate: number = NICKS_PER_SEED_WORD
): number {
  return estimateFee(seedWords, witnessWords, rate).feeNicks;
}

/** Detailed estimate (for quotes / diagnostics). */
export function estimateFee(
  seedWords: number,
  witnessWords: number,
  rate: number = NICKS_PER_SEED_WORD
): FeeEstimate {
  const s = Math.max(0, Math.floor(seedWords));
  const w = Math.max(0, Math.floor(witnessWords));
  const rawNicks = s * rate + w * (rate / 4);
  const feeNicks = Math.max(MIN_FEE_NICKS, rawNicks);
  return { seedWords: s, witnessWords: w, rawNicks, feeNicks, flooredToMin: rawNicks < MIN_FEE_NICKS };
}
