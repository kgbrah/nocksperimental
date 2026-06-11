# AI-PoW (matmul Proof-of-Useful-Work) readiness — nocksperimental

**Captured:** 2026-06-10
**Trigger:** [nockchain/nockchain PR #124](https://github.com/nockchain/nockchain/pull/124)
— "AI Proof of Useful Work for matrix multiplication," Logan Allen
(`tacryt-socryp`). This is the concrete implementation of watch-board **Front #2
(AI Compute Market / Fork A)** and the next PoUW puzzle.

> **Status guard:** PR #124 is **OPEN, CONFLICTING (needs rebase), REVIEW_REQUIRED
> — NOT merged.** Nothing here is current protocol authority. Build the
> *scaffolding* now; flip evidence classes from "preview" to "live" only when the
> PR merges to `master` and we re-pin `docs/research/nockchain-roadmap-baseline.json`.
> Do not present any AI-PoW certificate as an "app works on Nockchain" claim
> (see `AGENTS.md` anti-patterns).

## What PR #124 actually is

Mining work becomes **verifiable matrix multiplication** that can subsidize AI
inference/training, **merge-mined alongside the existing zkPoW** (it is an
additional track, not a replacement). Two new crates:

| Crate | Role | Key files |
| --- | --- | --- |
| `ai-pow-miner` | The miner binary + "pearl" mining | `src/bin/ai_pow_mine.rs`, `pearl_mining.rs`, `pearl_plain_proof.rs`, `certificate_noun.rs`, `run.rs` |
| `ai-pow-zk` | Plonky3 proof stack | `recursion.rs`, `composite_*`, `chips/{matmul,blake3,jackpot,...}`, `circuit.rs` |

**Compact recursive certificate** (the wire artifact):

- Layer 0 — useful-work AI-PoW batch STARK (Tip5 MMCS).
- Layer 1 — Tip5-friendly recursive verifier circuit over Layer 0.
- Layer 2 — native BLAKE3 final STARK over Layer 1, then **compacted** to a
  verifier-key/setup digest + compact final proof body.
- Measurements: jammed `%ai-pow` artifact **125,382 B**; compact cert **124,570 B**
  inside it; **~31.8 s** cold build; **60 FRI query bits**, no PoW grinding.
- Tip5 = recursive/circuit-friendly hash; BLAKE3 only for the L2 native STARK.
- Production API: `ai-pow::zk_bridge::prove_pearl_merge_compact_recursive_certificate[_with_prover_cache]`
  and `prove_ai_pow_compact_recursive_certificate[_with_prover_cache]`.
- Authoritative doc:
  `crates/ai-pow-zk/docs/2026-06-07_COMPACT_RECURSIVE_PRODUCTION_PIPELINE.md`.

Consensus tie-in (watch board): completion of the next PoUW puzzle is what
**triggers the 80%/20% coinbase reversion to 100% miner**, and the 20% Fork-A
share economics. The certificate's *byte size* and *cold-build time* are real,
citable compute-cost signals.

## Measured locally (2026-06-10, preview — unmerged branch)

Reproduced the canonical compact-certificate prove→verify→tamper-reject test in
an isolated worktree (`nockchain-aipow`, PR #124 head `d5fc82f4`), release:

```
cargo test -p ai-pow-zk --release --features recursion \
  compact_batch_recursive_certificate_round_trip_for_test_pearl -- --ignored --nocapture
```

Result (16-core host, `TEST_PEARL` profile):

| Measurement | Local value | PR-reported |
| --- | ---: | ---: |
| Compact certificate bytes | **122,597** | 122,597 (crate-level) |
| Prove wall (after chain-verified L0) | **10,465 ms** | 22,006 ms |
| L1 outer / L2 prove | 7,167 / 2,572 ms | — |
| Compact verify | **18 ms** | — |
| Soundness (tamper cases) | wrong-PIs, wrong-digest, stale-context all **rejected** | — |

The certificate size matches the PR's crate-level figure **exactly**; prove wall
is faster here (profile/host dependent). This is a *preview* compute-cost
artifact, not a live runtime claim — do not mint it into the trust-cert system
until #124 merges.

## Where it already lives in the repo (canonical memory)

- `docs/nockchain-watch.md` — Front #2 marked **IMPLEMENTATION OPEN** w/ the PR.
- `src/lib/nockchain-pr-radar.ts` — PR #124 entry (riskClass `compute-proof-puzzle`),
  surfaced at `/nockchain/pr-radar`. Evidence fields:
  `compactCertificateBytes`, `certificateVerifierKeyDigest`; forbidden:
  `privateSolverKey`.

## Readiness plan for nocksperimental (scaffold now, flip on merge)

1. **PR-radar deep entry (done).** Keep #124 current each weekly drift run; the
   real signal is *merge to master*.
2. **AI-PoW explainer surface** under `/nockchain` — what Fork A is, the
   merge-mined model, the compact-certificate shape, and the coinbase-reversion
   consequence. Monitoring framing, not protocol authority.
3. **"Proving-demand" evidence class (preview).** A compute-benchmark profile
   that cites the compact-certificate byte size + cold-build time + verifier-key
   digest as *attested compute cost*, gated behind a `previewOnly` flag until
   merge. Never ingests solver keys.
4. **x402 angle.** AI-PoW makes "pay-for-proof" concrete; a metered endpoint that
   sells verification of a submitted certificate is a candidate revenue lane —
   spec only until merge.

## Miner-improvement tracks (see companion work)

The existing miner is serf-thread-per-CPU zkPoW
(`nockchain/crates/nockchain/src/mining.rs` + Hoon kernel
`crates/kernels/miner`). AI-PoW adds a *second* mineable track. Improvement
candidates, low-regret first:

- **Ops/throughput on our own fakenet miner** — thread-count tuning, restart
  hygiene on new-block, health/hashrate telemetry surfaced to the orchestrator.
  - **Finding (2026-06-10):** the live `nock-testnet-node.service` passes no
    `--num-threads`, so it mines with the **default of 1 thread**
    (`crates/nockchain/src/lib.rs:499-503` resolves `None → 1`) on a 16-core
    host. Bumping to ~4 threads is a one-line service edit + node restart;
    schedule it (the restart briefly interrupts %fair settlement + bridge
    payouts, and should not overlap heavy AI-PoW builds competing for cores).
- **AI-PoW track readiness** — be able to build/run `ai-pow-miner` against
  fakenet once #124 (or its successor) merges; capture certificate artifacts as
  evidence.
- **Pool/economics modeling** — golden-miner share math under the 80/20 → 100%
  reversion and the Fork-A 20% registrant share (modeled below).

## Pool / economics model (preview)

Inputs from the watch-board consensus snapshot (activation era): **2,048
NOCK/block**, **150 s** block time, coinbase **80% miner / 20% Foundation** with
a 100-block timelock. Derived:

| Quantity | 80/20 (now) | 100% (post-reversion) |
| --- | ---: | ---: |
| Blocks/day | 576 | 576 |
| Gross issuance/day | 1,179,648 NOCK | 1,179,648 NOCK |
| Miner take/block | 1,638.4 NOCK | 2,048 NOCK |
| Miner take/day | 943,718 NOCK | 1,179,648 NOCK |
| Foundation/day | 235,930 NOCK | 0 |

A miner with hashrate fraction `f` earns ≈ `f × miner-take/day` (minus orphan
rate), pre-fees. **The reversion is a +25% step up to miners** (1,638.4 → 2,048
NOCK/block).

AI-PoW (Fork A) changes the *shape*, not just the size, of miner revenue:

- **Second reward stream.** Matmul PoUW is merge-mined alongside zkPoW, so the
  same hashware can earn AI-compute-market demand on top of the block subsidy.
  That stream is exogenous (depends on real inference/training demand + NOCK
  price) — model it as an *additive, demand-capped* term, not a fixed rate.
- **Reversion trigger ambiguity (flag, do not assert).** The board ties the
  80/20→100% reversion to "the next PoUW puzzle" *and* to Full-Nock-ZKVM
  completion (Front #3). PR #124 is an AI-PoW puzzle (Front #2). Whether #124
  *is* that trigger or merely a precursor is **not settled in the public
  sources** — treat the reversion timing as unknown until a writings post or the
  protocol changelog says so. Our drift checks watch for exactly this.
- **Fork B (Q1 2027).** A market registrant (4,000,000 NOCK lock) earns the 20%
  coinbase share — i.e. the 20% that reverts away from the Foundation can later
  be *captured by registering a market*, not just returned to miners. Potential
  product: register a settlement formula as a market and earn that share.

Cost side per certificate (from the local benchmark): ~10.5 s prove wall on a
16-core host for a 122,597-byte artifact, ~18 ms to verify. The asymmetry
(seconds to prove, milliseconds to verify) is exactly what makes a **pay-for-
verify** lane viable.

## x402 pay-for-proof lane (design, awaits merge)

The verify side is cheap (~18 ms) and deterministic — a clean fit for x402
metering. Sketch:

- **Endpoint:** `POST /api/nockchain/ai-pow/verify` (x402-metered). Body = a
  submitted compact `%ai-pow` certificate (bytes) + its public inputs.
- **Server:** decode → `verify_compact_batch_recursive_certificate_with_context`
  → return `{ verified, compactCertificateBytes, verifierKeyDigest, latencyMs }`.
  Never accepts or returns a solver private key / prover cache / matmul witness
  (`forbiddenFields`).
- **Pricing:** flat micro-fee per verify (verify cost is bounded + uniform), with
  a small surcharge tied to `compactCertificateBytes` for ingest/storage.
- **Receipt:** a signed evidence receipt citing `certificateVerifierKeyDigest` +
  `compactCertificateBytes` + `latencyMs` — a *proving-demand* attestation, never
  an "app works on Nockchain" claim.
- **Gate:** ships only after #124 merges and we vendor a verify-only build of
  `ai-pow-zk` (no prover, no node feature) so the Worker/edge stays light.
