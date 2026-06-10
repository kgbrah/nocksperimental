# Nockchain Roadmap Alignment — June 2026

How nocksperimental and our other Nock revenue apps should build given the
Nockchain whitepaper (2026-04-30), docs.nockchain.org (39 pages), the public
roadmap (33 milestones), and the team's writings through May 2026. Companion
to the live tracker in `docs/nockchain-watch.md`.

Apps in scope: **nocksperimental.com** (launch evidence, receipts, trust
certs, x402 metering), the **%fair casino + orchestrator**
(`nockchain/services/orchestrator`, `forfeit-flip`, `forfeit-roulette`,
`coinflip-nockapp`), the **Base bridge integration** (MessageInbox, tNOCK,
3-of-5 operator quorum), the **wallet V4 escrow lock builder**
(`nock-wallet`), and **golden-miner** (mining/pool surfaces).

## 1. The protocol's direction in one paragraph

Nockchain's bet is that mining and useful verifiable computation become the
same work. Phase 1 ("dumbnet") proved zkPoW at scale (>1B proofs in under a
year). 2026 is sequenced: harden the base layer (done: Bythos, Aletheia, PMA,
networking) → programmability (optimistic execution + fraud proofs + expanded
Intent Script, then the `zkp` opcode once the full ZKVM lands ~end of 2026) →
privacy as an app (ShieldedCSV pool over forced DA, Q4) → compute markets
(matmul Fork A ~Jun 2026, permissionless Fork B ~Q1 2027). The 20% Foundation
coinbase is explicitly temporary, sunsetting when the useful-PoUW puzzle
ships. Apps are expected to run off-chain ("NockApps"), settle via lock
scripts today, and graduate to proof-conditioned spending (`zkp`) tomorrow.

## 2. Build-now corrections (documented behavior we must match today)

These are facts from the docs that our current code must respect; each is
cheap now and expensive later.

| Fact (source) | Action for us |
| --- | --- |
| `pkh` requires **exactly m** signatures, not ≥m (`intent-script.md`) | Orchestrator/wallet must never over-attach signatures; bridge quorum tooling produces exactly 3 |
| Notes with origin-page ≥ 54,000 must spend with **`%full` (axis-committed) lock-Merkle proofs**; older notes use `stub` (`intent-trees.md`) | V4 lock builder selects proof format by note origin-page; fakenet fixtures must cover both or spends fail `%v1-spend-1-lock-failed` |
| Fee = `max(256 nicks, seed_words·r + witness_words·r/4)`, words = noun-tree nodes incl. sigs, preimages, Merkle path, note-data after lock-root merge (`fees.md`) | Casino payout fee model and x402 quotes recompute on the Bythos formula; estimator counts words, not bytes |
| **Sig-hash covers seeds+fee only; tx-id excludes witness** (`intent-trees.md`) | Anchor receipt chains to tx-id, never witness bytes; witness formats are upgradeable by design |
| Post-Bythos mempool **drops** (does not queue) context-invalid txs, incl. unsatisfied timelocks (`validation-pipeline.md`) | Watchtower must broadcast the %tim refund only at/after the bound, and needs fee-bump capability since conflicting spends resolve by higher fee |
| Block time **150 s** since Aletheia; coinbase timelock 100 blocks (~4.2 h now, not ~17 h) | Re-derive every block-denominated constant: refund timeouts, confirmation waits, "generous window" copy claims |
| `tim` supports absolute+relative **max** bounds — expiring locks (`intent-script.md`) | Use a relative-max bound on win branches so claims expire exactly when the refund branch opens — eliminates the branch race our current escrow handles off-chain |
| `hax` preimages are structured Nock nouns, Tip5-hashed (`intent-script.md`) | Provably-fair reveals can commit to structured game state, not just a 32-byte seed |
| Lock primitives **cannot read note-data**; no covenants (`note-data.md`) | Game commitments in note-data are evidence, not enforcement — don't represent them as consensus-enforced |
| Note-data maps of same-lock outputs **merge before size/fee accounting**; per-output `max-size` leaf cap (`note-data.md`) | Batch receipt outputs to one lock to pay once; watch key collisions on merge |
| Fakenet defaults: v1 activates at height 39,000 (set `--fakenet-v1-phase 1`), difficulty-epoch bug **stalls mining at height 2,016**, coinbase timelock 100 (`development-and-testing.md`) | Our fakenet runs and diagnostics must set v1-phase=1 (else we test v0 semantics) and treat the 2,016 stall as a known failure mode |
| The published fakenet seedphrase/PKH **works on livenet** (`development-and-testing.md` warning) | Trust certs must never accept evidence signed by the standard fakenet key (`9yPeP…`) as livenet evidence |
| Confirmation norm 3–6 blocks; chain weight = accumulated **proofpower**, not height | Bridge/treasury finality should be proofweight-aware and more conservative than 6 blocks |
| Key derivation broke v0→v1 (~Oct 2025): re-import with `--version 1` (`using-a-wallet.md`) | Wallet docs/tooling include the recovery path |
| Node ops post-PMA: NVMe for 5–10 s GC; **SQLite event log is the recovery authority** (PMA post) | Back up the event log, not just PMA slabs; snapshots: latest, latest-1, epoch |

## 3. Build-toward bets, by app

### nocksperimental.com (launch evidence / receipts / trust certs / x402)

- **Receipts should anchor to the chain's own proof surfaces**: block header +
  Merkle tx-inclusion path + note name. Headers are designed for light
  clients; this turns our signed receipts into chain-verifiable evidence.
  Record which witness format (`stub`/`%full`) and engine version applied.
- **Invariant packs become enforceable** when `cmp`/`mrk`/`zkp` land: an
  invariant can become a spending condition ("only spendable with a Merkle
  proof of inclusion in the attested set"). Design pack schemas so predicates
  map onto those primitives later.
- **Named rejection reasons** (`%v1-input-missing`,
  `%v1-spend-version-mismatch`, `%v1-spend-1-lock-failed`,
  `%v1-note-data-exceeds-max-size`) are a documented diagnostic vocabulary —
  assert them in fixtures and surface them in lab reports.
- **Optimistic execution adds a new evidence class**: dispute windows,
  challenges, fraud proofs. Plan an evidence type for "challenge-period state"
  before prediction markets ship on it.
- **Privacy reduces chain observability** (Q4 2026): scan-derived evidence
  weakens; signed receipts + solvency-style proofs (whitepaper §4.3) get more
  valuable. Position the lab as the evidence layer for private apps.
- **x402**: price in nicks (2^16/nock micro-granularity is explicitly
  endorsed); metering math must use word-fees; the 4:1 witness discount
  rewards consume-and-replace channel patterns (`hax` HTLC channels are the
  documented direction).
- **Risk**: the consensus proof object will change when the mining proof
  becomes the block-transition proof (whitepaper footnotes 1–2) — version
  receipt formats now.

### %fair casino + orchestrator (+ forfeit-flip / forfeit-roulette / coinflip-nockapp)

- Our 3-branch escrow is the **documented canonical idiom** (escrow-with-
  timeout in `intent-script.md`; the whitepaper's own intent-tree example).
  Only the satisfied branch is revealed on spend — house-win conditions stay
  private on player wins, and (post-Bythos) the witness commits to *which*
  branch settled. **Receipts should include the lock-Merkle-proof axis** so a
  round can prove "settled via the player-win branch."
- **Adopt expiring win-branches** (`tim` max bounds) to make the timeout
  semantics consensus-true instead of policy-true. This directly addresses the
  "liveness backstop, not an outcome override" claim our landing copy makes:
  with a relative-max on the win branch and the refund branch opening at the
  same height, the override window disappears at the protocol level.
- **Migration path to trustless fairness**: today the orchestrator is the
  trust anchor (docs explicitly anticipate this pre-`zkp`). When `zkp` ships
  (~Q3 2026+), the fairness formula (commit → reveal → outcome) becomes a
  spending condition; when compute markets Fork B ships, the same formula can
  be **registered as a market** (4M NOCK lock) and earn the registrant
  coinbase share. Keep game logic in a pure, provable form now (the team's own
  `sigilante/blackjack` is the reference app for our pattern — track it).
- **Oracle primitives + prediction markets (Q2 2026 per docs)** partially
  overlap casino positioning; differentiate on provable fairness + receipts,
  and evaluate building game-outcome feeds on the oracle primitives instead
  of bespoke attestation.
- **Hard-cutover discipline**: every upgrade is a height-gated fork with no
  signaling. The orchestrator node must track the protocol changelog and
  upgrade ahead of each `activation_height` — a lagging casino node forks
  silently while real value moves.

### Base bridge integration (MessageInbox / tNOCK / 3-of-5)

- The **official** bridge is also a 3-of-5 ecosystem multisig (Zorp holds 2)
  over a deterministic event-mirroring state machine — our architecture is
  congruent with theirs. **Bridge withdrawals are the CURRENT roadmap item**
  and the mechanics are unpublished: do not finalize our withdrawal design
  until their model lands; expect our fixture assumptions to need a pass.
- On the Nockchain side, 3-of-5 is native `pkh(3-of-5)` with **exactly-3**
  semantics; pair it with a time-delayed recovery branch (the whitepaper's
  own custody example) for operator-rotation safety.
- **Trust-minimization ladder** to plan against: operator attestations →
  `mrk` (Merkle inbox-inclusion proofs as spend conditions) → light-client
  header verification on Base → compute-markets Fork B ("bridges proving
  cross-chain state" is a named customer class). Note Solidity STARK
  verification is expensive — "milliseconds" applies to native verifiers only.
- **Reorg model**: heaviest accumulated proofpower, not longest chain —
  confirmation depth for mints should be difficulty-weighted.
- **Revenue note**: all official bridge fees now fund **Flock** (builder
  compensation, retroactive to genesis) — both a funding channel for our
  bridge tooling and a competitive consideration.

### Wallet / V4 escrow lock builder (nock-wallet)

- Emit version-correct artifacts: name = `[Tip5(lock-root), source-hash]`;
  proof format by origin-page; v0 notes only via Spend0 bridge; sign over
  seeds+fee in that order; batch Cheetah Schnorr.
- Fee estimator counts **words** (incl. Merkle siblings, sigs, preimages,
  merged note-data) at r vs r/4 with the 256-nick floor.
- Structure the builder as a **versioned facade** like the protocol's own
  type-level versioning, with forward-compat slots for `zkp`/`mrk`/`cmp`
  branches, the token standard (escrow over non-NOCK assets), and the PQ
  signature migration (H1 2027). Cheetah is nonstandard — hardware-wallet/HSM
  support will lag; plan key custody accordingly.

### golden-miner / pool surfaces

- Fork A (matmul PoUW, ~Jun 2026) changes mining economics: datacenters
  merge-mine AI work at ~zero marginal cost — CPU/GPU zkPoW proofpower gets
  diluted. Benchmark/uptime evidence for provers remains our durable angle;
  emission steps (activation era → decay year 1 ~6 months post-Aletheia, 80/20
  → 100% reversion at the PoUW transition) are repriceable events worth
  publishing evidence around.

## 4. Risk register (cross-app)

1. **Height-gated hard cutovers, no signaling** — silent forks for lagging
   nodes; heights can slip (37,350 → 39,000). Mitigation: changelog watch +
   upgrade-ahead discipline (drift scripts + watch board).
2. **Witness/lock format evolution** — by design (SegWit separation). Pin
   nothing to witness bytes; version everything that parses locks.
3. **Optimistic-execution semantics** — challenge periods arrive under
   intents; pure-lock-script escrow assumptions (instant finality of branch
   spends) may gain dispute-window caveats.
4. **Emission/coinbase regime change** at the PoUW transition (~end 2026) —
   don't hard-code 80/20 or activation-era issuance anywhere (explorer
   surfaces, evidence packs, miner dashboards).
5. **Proof-object redesign** (mining proof = block-transition proof) — receipt
   and light-client formats must be versioned.
6. **Privacy reduces observability** (Q4 2026) — evidence pipelines that scan
   transparent state need an attestation-based fallback.
7. **Fork B trusted-setup ceremony** — would qualify "transparent, no trusted
   setup" claims our trust copy makes about the chain; track and re-word when
   it lands.
8. **No public testnet** — only fakenet and livenet exist; staging plans that
   assume a testnet need restructuring (fakenet parity work matters more).

## 5. Revenue / ecosystem opportunities

- **Foundation protocol fund**: 410 NOCK/block earmarked for proving demand,
  developer grants, product growth, liquidity, partnerships (multisig: Zorp,
  SWPS, Nockbox, LambdaCollective). Our launch-evidence lab and fairness
  tooling fit "developer grants / product growth" — prepare an application
  with receipts as the differentiator.
- **Flock** (SWPS+Nockbox builder compensation, funded by all bridge fees):
  channel for bridge-tooling and diagnostics work.
- **Compute markets**: Fork B market registration (4M NOCK lock, earns the
  20% registrant coinbase share) is a long-dated product option for a
  settlement-formula we already operate (fair-game settlement, bridge state
  proving).
- **Oracle/prediction-market stack (Q2 2026)**: evidence + receipts for
  dispute resolution is squarely our lane; prediction markets will need
  exactly the launch-evidence/invariant surface we sell.
- **Fakenet + Developer API (SWPS) and Iris V2 dev SDK (Nockbox)**: integrate
  early; our wallet-connect work (Iris) tracks Iris V2's new SDK.

## 6. Standing monitoring loop

Weekly: run `npm run check:nockchain-roadmap-drift` (public surfaces — this
doc's triggers) and the existing `check:nockchain-*-drift` suite (canonical
sources), review diffs, update `docs/nockchain-watch.md`, then re-pin the
baseline. Event-driven: any new upgrade spec with an `activation_height` →
schedule node upgrades and re-run escrow/bridge fixtures before the height.
