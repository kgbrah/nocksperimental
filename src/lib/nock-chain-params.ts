// Canonical Nockchain timing parameters — the single source of truth for every
// block/height-denominated figure the frontend states or derives.
//
// Post-Aletheia (Phase 2 consensus upgrade) the block cadence dropped 600 s →
// 150 s, which silently re-scaled every "N blocks ≈ T hours" claim: the 100-block
// coinbase timelock is now ~4.2 h, NOT the ~17 h it was under 600 s blocks.
// Anything quoting a block-derived wall-clock duration MUST derive it here so the
// constant and the copy can never drift apart again. (nockchain roadmap
// alignment 2026; consensus ASERT/block-time trace.)
//
// NOTE: chain WEIGHT is accumulated proofpower, not height — these figures are a
// nominal cadence for human-readable copy, never a finality oracle. Finality
// should be proofweight-aware and more conservative than a raw block count.

/** Nominal block cadence since the Aletheia consensus upgrade (was 600 s). */
export const NOCK_BLOCK_TIME_SECONDS = 150;

/** Pre-Aletheia cadence — kept only to detect/flag stale block-derived durations. */
export const NOCK_LEGACY_BLOCK_TIME_SECONDS = 600;

/** Coinbase maturity / refund timelock, in blocks. */
export const NOCK_COINBASE_TIMELOCK_BLOCKS = 100;

/** Confirmation norm (3–6 blocks); proofweight-aware callers should be conservative. */
export const NOCK_CONFIRMATION_NORM_BLOCKS = { min: 3, max: 6 } as const;

/** Blocks → seconds at a given cadence (default: current 150 s). */
export function blocksToSeconds(blocks: number, blockTimeSeconds: number = NOCK_BLOCK_TIME_SECONDS): number {
  return blocks * blockTimeSeconds;
}

/** Blocks → approximate wall-clock hours at a given cadence (default: current). */
export function blocksToApproxHours(blocks: number, blockTimeSeconds: number = NOCK_BLOCK_TIME_SECONDS): number {
  return blocksToSeconds(blocks, blockTimeSeconds) / 3600;
}

/** The coinbase/refund timelock as an approximate wall-clock window (~4.2 h). */
export const NOCK_COINBASE_TIMELOCK_APPROX_HOURS = blocksToApproxHours(NOCK_COINBASE_TIMELOCK_BLOCKS);

/** Human-readable timelock window, e.g. "~4.2 h". */
export function coinbaseTimelockLabel(): string {
  return `~${NOCK_COINBASE_TIMELOCK_APPROX_HOURS.toFixed(1)} h`;
}
