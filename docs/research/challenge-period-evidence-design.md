# Challenge-period evidence — forward-looking design

Status: **DESIGN ONLY — nothing shipped.** Optimistic execution / prediction
markets are not live on Nockchain yet; this parks a coherent evidence model so we
don't retrofit it under pressure when they are. (nockchain roadmap alignment 2026:
"Plan an evidence type for challenge-period state before prediction markets ship on
it.")

## Why a distinct evidence class

The existing chain-anchor evidence (`src/lib/chain-anchor.ts`) attests that a tx is
**committed** — an EVM receipt+log, or a Nock tx-in-block Merkle proof
(`chain-verify-nock.ts`). Committed ≠ **final** under optimistic execution: an
optimistically-settled state is only provisional until a fraud-proof / challenge
window elapses without a successful challenge. A receipt that says "committed at
height H" while the challenge window is still open over-claims finality — exactly
the failure the repo already guards for optimistic rollups via
`xchain-challenge-window-respected` (`src/data/evm-chains.json`: "optimistic-rollup
chains additionally require the 7-day challenge window").

Challenge-period evidence makes the window itself a first-class, re-checkable fact.

## Shape (`ChallengePeriodEvidence`)

A sibling of `ChainAnchor`, attached where a settlement is optimistic:

```
ChallengePeriodEvidence {
  scheme:          "optimistic"            // vs "finalized" (no window)
  assertedStateRoot: string                // the optimistic claim being settled
  assertionAnchor:  ChainAnchor            // the tx that POSTED the assertion (committed)
  window: {
    basis:        "blocks" | "time"        // Nock counts proofweight/blocks; rollups use wall-clock
    openedAtHeight: number                  // assertion inclusion height
    closesAtHeight: number                  // openedAt + challengePeriod (e.g. 100+ blocks on Nock)
    challengePeriod: number                 // the window length, in `basis` units
  }
  bond: {
    asserterStakeNicks: number             // slashable on a successful challenge
    challengeBondNicks: number             // posted by a challenger
  }
  status:          "open" | "challenged" | "finalized" | "slashed"
  challenge?: {                            // present once a challenge is posted
    challengeAnchor: ChainAnchor           // the challenge tx
    resolvedStateRoot?: string             // the corrected state, if the challenge won
  }
}
```

`engineVersion` + `witnessFormat` carry over from `ChainAnchor` so a fraud-proof
format upgrade can't silently reinterpret an old window (same discipline as the
receipt anchor: bind to tx-id, never witness bytes).

## Verification tiers (honest, like the anchor leg)

1. **window-open** — assertion committed (re-verify `assertionAnchor` via the
   existing EVM/Nock legs), but `closesAtHeight` not yet reached against the live
   tip. NOT final. The UI must label this "provisional — challenge window open
   (~N blocks / ~T left)", never "verified".
2. **window-elapsed-unchallenged** — tip ≥ `closesAtHeight` and `status` never left
   `open`. Finalized by elapsed time; re-checkable from chain height alone.
3. **challenged-resolved** — a challenge was posted and resolved; the evidence
   carries the winning state root + the slash. The effective state is
   `resolvedStateRoot ?? assertedStateRoot`.

Tier 1 reuses `nock-chain-params.ts`: a Nock challenge window denominated in blocks
converts to wall-clock at 150 s/block (so "100 blocks" reads "~4.2 h"), and the
gate is proofweight-aware, not raw-height (chain weight is accumulated proofpower).

## What this does NOT do yet

- No schema file, no `src/lib` module, no fixtures — those land **with** the first
  optimistic-execution / prediction-market integration, when the real fraud-proof
  format is published (mirrors the bridge-withdrawal "do not finalize until the
  upstream model is published" discipline).
- No claim that any current receipt is challenge-windowed: today's Nock and Base
  settlements are direct-finality, so they carry a plain `ChainAnchor`, not this.

## Open questions to resolve when it ships

- Does Nock optimistic execution denominate the window in blocks or proofweight?
  (Affects `window.basis` and the finality gate.)
- Bond economics: is the challenge bond a fixed floor or a function of the asserted
  value? (Couples to the Bythos fee model in `nock-fee-estimator.ts`.)
- Anchoring the challenge tx: a challenge is itself a tx — it gets a `ChainAnchor`,
  re-verifiable by the same EVM/Nock legs, so no new crypto is needed.
