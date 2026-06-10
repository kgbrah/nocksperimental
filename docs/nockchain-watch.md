# Nockchain Watch Board

This board is a **monitoring surface, not protocol authority** (see `AGENTS.md`).
Protocol truth lives in `nockchain/nockchain` + Tier 0 docs (covered by the
`check:nockchain-*-drift` scripts). This board tracks the *public product
surfaces* — nockchain.org/roadmap, docs.nockchain.org, and /writings — so that
nocksperimental and our other Nock revenue apps see protocol changes coming
before they land.

- **Updated:** 2026-06-10 — Front #2 (AI Compute Market / Fork A) flipped to IMPLEMENTATION OPEN: PR #124 (AI-PoW matmul, `ai-pow-miner` + `ai-pow-zk`) is now a full open PR on `nockchain/nockchain`. See PR-radar #124.
- **Sources:** nockchain.org/roadmap (33 milestones), docs.nockchain.org (39
  pages), nockchain.org/writings (9 most-recent posts), whitepaper
  (`nockchain.org/nockchain.pdf`, Allen & Murphy, 2026-04-30)
- **Automated check:** `npm run check:nockchain-roadmap-drift` (baseline:
  `docs/research/nockchain-roadmap-baseline.json`; re-pin after review with
  `npm run check:nockchain-roadmap-drift -- --update-baseline`)
- **Deep dive / app guidance:** `docs/research/nockchain-roadmap-alignment-2026.md`

## Consensus state we build against (snapshot 2026-06-09)

| Parameter | Value | Notes |
| --- | --- | --- |
| Chain | Mainnet since 21 May 2025 | Genesis attests Bitcoin block 897,767; no premine |
| Block time | **150 s** since Aletheia (block 65,500, May 2026) | Was 600 s — re-derive every block-denominated timeout |
| Difficulty | aserti3-2d ASERT, 12 h half-life, per-block | Pre-65,500: 2,016-block epoch retarget |
| Issuance | 2,048 NOCK/block activation era (~first 6 months post-Aletheia), then decay table; hard cap 2^32 NOCK at block 16,144,876 | 1 nock = 2^16 nicks |
| Coinbase | **80% miner / 20% Foundation fund** + 100-block timelock | Fund multisig: Zorp, SWPS, Nockbox, LambdaCollective; reverts to 100% miner at the next PoUW puzzle |
| Fees | words (noun-tree nodes), `fee = max(256 nicks, seed_words·r + witness_words·r/4)` | Bythos halved base rate + added 4:1 witness discount; tx fees 100% to miner |
| Tx engine | V1 (`%1`) — activation heights 6,750 / 12,000 / **39,000 (V1)** / **54,000 (Bythos)** / **65,500 (Aletheia)** | Upgrades are height-gated **hard cutovers with no signaling** |
| Intent Script | `pkh` (exactly-m, Cheetah Schnorr) · `tim` (4 bounds incl. expiring max) · `hax` (Tip5, structured-noun preimages) · `brn` | `zkp` / `mrk` / `cmp` documented as planned |
| Witness format | `%full` lock-Merkle proofs (axis-committed) for notes with origin-page ≥ 54,000; `stub` for older | Sig-hash covers seeds+fee only; tx-id witness-independent |
| Crypto | Tip5 hash, Cheetah-curve Schnorr (~128-bit, **not post-quantum**), STARK/Goldilocks (~121-bit, transparent) | PQ signatures roadmapped H1 2027 |
| Confirmation norm | 3–6 blocks (~7.5–15 min) | Bridge/treasury flows should weigh accumulated *proofweight*, not block count |

## Open fronts

| # | Front | Status / target | What it changes | Why we care (impacted surfaces) | Watch signal |
| --- | --- | --- | --- | --- | --- |
| 1 | **Bridge withdrawals** | **CURRENT** (Q2 2026; slipped from Q1) | Two-way Nockchain↔Base transfers | Our xchain fixtures, bridge reconciliation evidence, MessageInbox/tNOCK mirror. Official bridge = 3-of-5 ecosystem multisig (Zorp×2, SWPS, Nockbox, Lambda) over a deterministic event-mirroring state machine — withdrawal mechanics still unpublished | Roadmap flip to COMPLETED; a dedicated writings post; drift check |
| 2 | **AI Compute Market (Fork A)** | **IMPLEMENTATION OPEN** — [PR #124](https://github.com/nockchain/nockchain/pull/124) (Logan Allen, opened 2026-06-02, 135k+ LOC, OPEN but CONFLICTING/needs-rebase + REVIEW_REQUIRED — not merged) | Matmul PoUW merge-mined alongside zkPoW; difficulty check moves inside formula execution. PR adds two crates: `ai-pow-miner` ("pearl" mining binary `ai_pow_mine.rs`) and `ai-pow-zk` (Plonky3 3-layer compact recursive STARK: L0 useful-work → L1 Tip5 recursive verifier → L2 BLAKE3 final; ~125KB certificate, ~32s cold build, 60 FRI query bits). Production API = `ai-pow::zk_bridge::prove_*_compact_recursive_certificate*` | Miner/pool economics (golden-miner), "proving demand" evidence packs; first concrete useful-work market. **PR-radar #124** carries the live entry | **PR #124 merge to master** (the real flip); then `compute-markets` docs page (Fork A signal); Zorp announcements. Re-pin baseline when it merges |
| 3 | **Full Nock ZKVM** | PLANNED Q3 2026 ("toward end of year" per Phase 2 post) | Performant general-purpose ZK proofs | Prerequisite for `zkp` opcode and next PoUW puzzle; its completion **triggers the 80/20 coinbase reversion** | Repo activity; roadmap flip |
| 4 | **`zkp` opcode + Intent Script expansion (`mrk`, `cmp`)** | PLANNED Q3 2026 (site); docs roadmap puts "Intent Script expansion" in Q2 | Verifiable apps directly on-chain; spendability conditioned on proofs / Merkle membership / comparisons | **Casino**: migrate fairness from orchestrator-trust to an on-chain `zkp` condition. **Lab**: invariant packs become spendable conditions. **Wallet**: new lock-builder grammar | `intent-script` docs page signal flips (script watches `zkp`/`mrk`/`cmp`/"planned"); new upgrade spec in protocol changelog |
| 5 | **Optimistic execution + fraud proofs + oracles + prediction markets** | Docs roadmap Q2 2026 (not on the site roadmap by name) | Challenge-period semantics for intents; disputeable oracles; prediction markets as canonical app | Escrow assumptions gain dispute windows; oracle primitives reusable for game outcomes; prediction markets partially overlap casino positioning | `technical-roadmap` docs checklist flips (script extracts it) |
| 6 | **Forced data availability** | PLANNED Q4 2026 | L1-guaranteed publication of tx data | Foundation for CSV privacy apps; changes evidence-availability assumptions our receipts rely on | Roadmap; writings |
| 7 | **Privacy pool app (ShieldedCSV) / private txs** | PLANNED Q4 2026 (site) vs "private transactions H2 2026" (docs) — direction changed to app-layer privacy | Private economic activity without L1 privacy | Chain observability may drop → our signed-receipt evidence gets *more* valuable but harder to derive from chain scans | Roadmap; ShieldedCSV spec references |
| 8 | **ZK compute markets (Fork B)** | PLANNED Q1 2027 | Permissionless market registration (4,000,000 NOCK lock), unique-transcript PCS (possible **trusted-setup ceremony**), registrant earns the 20% coinbase share | Potential product: register a settlement formula as a market; "bridges proving cross-chain state" named as a customer class | `compute-markets` docs page (Fork B / trusted-setup signals) |
| 9 | **Native token standard** | PLANNED H1 2027 (site) vs H2 2026 (docs) | Composable assets on the platform | House/casino tokens, lab assets, escrow over non-NOCK assets | Roadmap; upgrade specs |
| 10 | **Post-quantum signatures** | PLANNED H1 2027 | Cheetah Schnorr `pkh` supplemented/replaced | Long-lived escrow notes + wallet keys need a migration path; keep escrow lifetimes short | Roadmap; protocol changelog |
| 11 | **PMA + networking upgrade** | **COMPLETED** Q2 2026 (site; docs checklist lags) | ~1.8 GiB RSS nodes, 20× sync throughput | Node ops: NVMe needed for 5–10 s GC; **SQLite event log is the recovery authority — back it up**, not just the PMA slab | Shipped — operational guidance only |

## Known cross-source discrepancies (tracked, not resolved)

- Site roadmap marks **PMA** and **Networking** COMPLETED; the docs
  `technical-roadmap` checklist still shows them unchecked — docs lag the site.
- **Token standard**: H1 2027 (site) vs H2 2026 (docs).
- **Privacy**: site = privacy-pool *app* (Q4 2026, ShieldedCSV, explicitly "not
  baking privacy into the base protocol"); docs + Jan-2026 roadmap post =
  "private transactions… integrated directly into transaction semantics"
  (H2 2026). Direction changed during 2026; assume app-layer privacy wins.
- Nov 2025 messaging: "no optimistic dispute periods, no exit games — just
  proofs"; Jan 2026 roadmap adds optimistic execution + fraud proofs +
  challenge periods. The programmability layer is optimistic-first, proofs later.
- The whitepaper contains **no** mention of ShieldedCSV, forced DA, token
  standard, PQ signatures, or compute-market pricing mechanics — the site
  roadmap and docs are the only sources for those fronts.
- PMA memory: Phase 2 post said "~16 GB regardless of state size"; the PMA
  deep-dive shows ~1.8 GiB RSS in practice; `running-a-node.md` says "a couple
  of GiB".
- No public **testnet** exists or is documented — only fakenet and livenet.
  Plans that assume a testnet staging rung need to be fakenet→mainnet instead.

## Weekly check routine

1. `npm run check:nockchain-roadmap-drift` — exits 1 on any roadmap/writings/
   docs drift; review, fold changes into this board, then re-pin the baseline.
2. `npm run refresh:nockchain-drift-status` + the `check:nockchain-*-drift`
   suite — canonical repo/source drift (already wired).
3. Manual surfaces (no automation): forum.nockchain.org/latest,
   x.com/nockchain, t.me/nockchainproject, nockblocks.com/metrics
   (`?tab=mining`, `?tab=economics`), iriswallet.io (wallet SDK changes).
4. Spot questions against docs without scraping: every GitBook page answers
   `https://docs.nockchain.org/<page>.md?ask=<question>`.

## Block-height tripwires

- Any new upgrade spec with an `activation_height` in the protocol changelog
  (`nockchain/nockchain`) — hard cutover; our nodes (casino orchestrator,
  bridge watchers) must upgrade **before** the height or they fork silently.
  Heights can slip (V1 was rescheduled 37,350 → 39,000).
- Activation-era → decay-year-1 emission step (~6 months after block 65,500):
  miner-economics shift relevant to pool/benchmark evidence.
- Decay ends at block 2,060,500 (64 NOCK/block floor era begins).
