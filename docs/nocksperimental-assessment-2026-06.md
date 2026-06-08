# Nocksperimental Assessment Report

**Date:** June 7, 2026  
**Assessor:** Hermes Agent (via `kgbrah/nocksperimental` deep evaluation)  
**Scope:** Full product evaluation — test suite, developer experience, web surfaces, upstream intelligence, and product thesis  
**Methodology:** Cloned repo, installed deps, ran all 10 bundled fixtures, built a custom NockDEX mock NockApp, explored live deployment, assessed against Nockchain ecosystem needs

---

## ⏱ Status update — 2026-06-08

> The assessment below is the original **June 7, 2026** snapshot. In the days since, most of the "path to 5 stars" work shipped. The published [`nocklab@0.1.4`](https://www.npmjs.com/package/nocklab) package is now the source of truth for the runner's capabilities. The star tables and priorities further down are the **June-7 snapshot, annotated inline with current status** — read this section first.

| Priority (from §5) | June 7 | Now |
|---|---|---|
| P1 — Ship the npm package | not started | ✅ **Shipped** — `nocklab@0.1.4` on npm; `npm install --save-dev nocklab` / `npx nocklab`. The runner is extracted to `packages/nocklab/`; the `nocksperimental` repo itself stays `private`. |
| P2 — TypeScript fixture authoring | not started | ✅ **Shipped** — `import { defineFixture } from "nocklab"` ships with `.d.ts` types and autocomplete. |
| P3 — Missing invariant kinds | 6 kinds | ✅ **Shipped** — now **11 kinds**: added `numeric-range`, `array-length-min`, `array-length-max`, `temporal-ordering`, and `custom-function` (a name resolved against a frozen in-runner allowlist — no fixture-supplied code). |
| P6 — Developer documentation | none | ✅ **Shipped** — `docs/getting-started.md`, `docs/fixture-cookbook.md`, and `docs/invariants.md` exist and are linked from the README. |
| P7 — `setPath` array mutation bug | open | ✅ **Fixed** — writing through `arr.0.field` now preserves the array. |
| P8 — Drift-check graceful degradation | open | ✅ **Shipped** — drift checks skip gracefully without a local `nockchain/nockchain` clone (`test:source-drift-graceful-skip`). |
| P4 — Real fakenet adapter demo | mock-only | ⏳ **Inflight** — `local-fakenet` mode now does real TCP reachability + command-backed (`nockchain-wallet`) poke/peek, and a real-node demo is recorded; **stable gRPC-native poke/peek is the remaining work.** |
| P5 — NockApp kernel integration | not started | ⏳ **Inflight** — `kernel` mode ships a real `hoonc` compile-gate + offline `nockapp-run` poke/peek; **a full Hoon → `hoonc` → `.jam` → NockVM → assert harness is still in progress.** |

**Updated scorecard:** Developer test suite **7.0 → ~9.5/10** — only the gRPC-native / full-NockVM execution star remains. Distribution and Portability are now ★★★★★ (npm package shipped); fixture-authoring ergonomics, invariant expressiveness, learning curve, and CI integration all reached ★★★★★. Product thesis holds at **9.5/10**.

---

## Executive Summary

Nocksperimental is the most thorough blockchain testing infrastructure for an ecosystem at this stage of maturity. It doesn't just run tests — it produces audit-ready, receipt-anchored, upstream-pinned evidence with cryptographic verification that can survive offline. This is genuinely a product the Nockchain ecosystem **needs** before serious value flows through NockApps.

**Current: 8.5/10** as a developer test suite. **9.5/10** as an ecosystem-level product thesis.

**Target: 10/10** across all dimensions. Detailed gap analysis and path to 5 stars follows.

---

## 1. What Nocksperimental Is

A multi-layered testing, monitoring, and evidence infrastructure spanning:

| Layer | Capability |
|---|---|
| **Lab Runner** | JSON-schema-validated, fixture-driven test engine with scripted poke/peek/fakenet/bridge/invariant steps, mutable state tree, per-step expectations, state snapshots, diffs, cryptographic hashes |
| **Invariant Packs** | Reusable safety contracts (supply conservation, authorization, PMA safety, mining-PoW) shared across fixtures with pinned upstream research basis |
| **Fakenet Adapter** | Real TCP connectivity probes, gRPC endpoint health checks, balance parsing, chain metadata extraction, command-backed poke/peek adapters bridging mock to real nodes |
| **Trust Registry** | Ed25519-signed badges, issuer key rotation, offline-verifiable attestations, trust feed, freshness tracking, solver scorecards |
| **Upstream Intelligence** | 24 traces/atlases pinned to exact upstream Nockchain commits with automated drift detection and daily GitHub Action monitoring |
| **Web Surfaces** | Deployed on Cloudflare Workers at nocksperimental.com — verification endpoints, fakenet evidence submission, Launch Evidence, private workspaces, OpenAPI, .well-known discovery |
| **x402 Metering** | Optional Coinbase x402 agentic-payments protocol for paid verification at scale, settled on Nockchain via VESL |

---

## 2. Star Ratings: Current vs. Target

### 2.1 Test Suite for Developers

| Criterion | Current | Target | Gap |
|---|---|---|---|
| Fixture authoring ergonomics | ★★★☆☆ | ★★★★★ | No TypeScript intellisense; JSON-only authoring |
| Invariant expressiveness | ★★★★☆ | ★★★★★ | Missing: array-length, numeric-range, custom function, temporal ordering |
| Report quality | ★★★★★ | ★★★★★ | — Already 5 stars |
| Real execution support | ★★☆☆☆ | ★★★★★ | Mock-only today; no Hoon→NockVM→lab path |
| CI integration | ★★★★☆ | ★★★★★ | Missing one-step external-repo install |
| Error messages | ★★★★★ | ★★★★★ | — Already 5 stars |
| Learning curve | ★★★☆☆ | ★★★★★ | Need docs/invariants.md, cookbook, examples |
| Portability | ★★☆☆☆ | ★★★★★ | No `npm install nocksperimental`; must copy source files |

**Developer score: 7.0 → 10.0 target**

### 2.2 Product

| Criterion | Current | Target | Gap |
|---|---|---|---|
| Product thesis clarity | ★★★★★ | ★★★★★ | — Already 5 stars |
| Revenue model | ★★★★★ | ★★★★★ | — Already 5 stars |
| Ecosystem positioning | ★★★★★ | ★★★★★ | — Already 5 stars |
| Public web surface | ★★★★★ | ★★★★★ | — Already 5 stars |
| Evidence infrastructure | ★★★★★ | ★★★★★ | — Already 5 stars |
| Upstream intelligence depth | ★★★★★ | ★★★★★ | — Already 5 stars |
| Competitive moat | ★★★★★ | ★★★★★ | — Already 5 stars |
| Distribution | ★★★☆☆ | ★★★★★ | No npm package; no one-step install path |

**Product score: 9.5 → 10.0 target**

---

## 3. What Was Tested

### 3.1 Bundled fixtures — all pass

| Fixture | Status | Steps | Invariants |
|---|---|---|---|
| hello-counter | PASS | 4/4 | 4/4 |
| bridge-settlement | PASS | 5/5 | 3/3 |
| bridge-delayed | WARN | 3/3 | 2/2 (1 alert triggered — intentional) |
| payment-flow | PASS | 5/5 | 5/5 |
| intent-settlement | PASS | 5/5 | 6/6 |
| token-issuance | PASS | 5/5 | 6/6 |
| compute-benchmark-alpha | PASS | 5/5 | 4/4 |
| bridge-pack | PASS | 5/5 | 6/6 |
| pma-safety | PASS | 4/4 | 6/6 |
| mining-pow | PASS | 4/4 | 6/6 |

### 3.2 Custom NockDEX fixture — built and iterated

Created a decentralized exchange fixture with order book, multi-actor trades, fee collection, and 8 invariants. The invariant system caught two real design flaws in v1 (fee pool separation violated supply conservation; authorization invariant was overly broad). Fixed in v2 — all 8/8 steps and 8/8 invariants pass. See `fixtures/nockdex-mock.lab.json` for reference.

### 3.3 Live deployment — fully functional

Verified nocksperimental.com surfaces: Nockchain intelligence (28 linked traces), verification index (8 verifier families), trust registry (5 verified badges), drift status, PR radar (35 open PRs tracked), `.well-known/nocksperimental.json` discovery manifest.

---

## 4. Strengths (Keep These Sharp)

### 4.1 The invariant system is the killer feature

Eleven invariant kinds (six at the time of this assessment) cover the critical surface area of blockchain safety. Crucially, the system **found real bugs** in a custom fixture on first run — it doesn't rubber-stamp, it actively prevents shipping broken invariants.

### 4.2 Cryptographic audit trail

Every report carries `beforeHash`/`afterHash`, Ed25519 signatures with key rotation, portable offline verification, freshness tracking. This is audit-ready evidence infrastructure, not just test output.

### 4.3 Upstream anchoring is unprecedented

24 traces pinned to exact Nockchain commits with automated drift detection. Daily GitHub Action refreshes drift status and opens PRs when drift is detected. No other blockchain project at this stage has anything comparable.

### 4.4 Schema-driven design

JSON Schema 2020-12 validation with conditional requirements. Strict mode, dual JSON+Markdown output, CI manifest generation, config-driven batch runner. Well-designed operation types and per-kind invariant field requirements.

### 4.5 Monetization thinking baked in

x402 micro-payments, Launch Evidence cases, CI subscriptions, Verified Bazaar — coherent and defensible. Free tier is genuinely useful; paid tier has clear scaling economics.

### 4.6 Bridge between mock and real

Same fixture format for both `mock-fakenet` (deterministic, no infrastructure) and `local-fakenet` (real TCP/gRPC probes). Transition path is structurally identical — only the adapter mode changes.

---

## 5. Path to 5 Stars: Required Work

### Priority 1 — Ship the npm package (unlocks distribution ★★★★★) — ✅ SHIPPED (2026-06-08)

**Current:** `"private": true`, no install path. External repos must copy `scripts/run-lab.mjs`, `scripts/fixture-builder.mjs`, `nocklab.config.json`, and fixtures.

**Target:** `npm install nocksperimental` or `npm install -g nocklab` with a `nocklab` CLI binary.

**Required:**
- Extract `scripts/run-lab.mjs` and `scripts/fixture-builder.mjs` into a standalone `packages/nocklab/` directory
- Add `"bin": { "nocklab": "./bin/nocklab.mjs" }` 
- Publish as `@nocksperimental/nocklab` or `nocklab` on npm
- External repos run: `npx nocklab fixtures/my-app.lab.json --strict`

**Effort:** ~3 days. **Impact:** Goes from "copy source files" to "one command." Largest single leverage item.

### Priority 2 — TypeScript types for fixture authoring (unlocks ergonomics ★★★★★) — ✅ SHIPPED (2026-06-08)

**Current:** Raw JSON authoring with no intellisense, no autocomplete, no type checking at author time.

**Target:** `defineFixture()` helper with full generics.

**Required:**
```typescript
import { defineFixture, type LabFixture } from '@nocksperimental/nocklab';

const fixture = defineFixture({
  id: 'my-app-v1',
  app: { name: 'My App', slug: 'my-app', version: '0.1.0', kernel: 'my-kernel-v1' },
  // ... full type checking and autocomplete for operations, invariants, etc.
});
```

**Effort:** ~2 days. **Impact:** Dramatically reduces fixture authoring errors and learning curve.

### Priority 3 — Add missing invariant kinds (unlocks expressiveness ★★★★★) — ✅ SHIPPED (now 11 kinds)

**Current gaps:**

| Missing Kind | Example Use Case |
|---|---|
| `numeric-range` | Fees ≤ 5% |
| `array-length-min` / `array-length-max` | At least 2 trades settled |
| `temporal-ordering` | Bridge lock must precede release |
| `custom-function` | Escape hatch for arbitrary validation |

**Required:**
- Add `numeric-range` kind (`path`, `min`, `max`)
- Add `array-length` kind (`path`, `min`, `max`)
- Document as cookbook entries in `docs/invariants.md`

**Effort:** ~3 days for all four kinds + docs. **Impact:** Covers the ~20% of blockchain safety properties currently unexpressible.

### Priority 4 — Real fakenet adapter demo (unlocks execution ★★★★★) — ⏳ INFLIGHT (real local-fakenet shipped; gRPC-native poke/peek remaining)

**Current:** All fixtures run in `mock-fakenet` mode. Operations are applied to a JavaScript object — no NockVM, no Nock ISA, no proof generation.

**Target:** At least one fixture running against a real `nockchain --fakenet` node with gRPC-native poke/peek.

**Required:**
- Ship a fixture with `"mode": "local-fakenet"` and a real `balanceCheck`/`chainCheck`
- Document the full flow: `git clone nockchain → make install → bash scripts/run_nockchain_node_fakenet.sh → nocklab fixtures/real-fakenet-health.lab.json`
- Record a demo video or screencast showing the real probe results

**Effort:** ~5 days (depends on fakenet gRPC surface stability). **Impact:** Proves the bridge from mock to real; validates the whole adapter architecture.

### Priority 5 — NockApp kernel integration path (unlocks full-stack testing ★★★★★) — ⏳ INFLIGHT (compile-gate + offline poke/peek shipped; full NockVM harness remaining)

**Current:** Can test invariant design but not actual Hoon/Jock kernel implementation.

**Target:** `my-app.hoon → hoonc → my-app.jam → NockVM → lab runner`

**Required:**
- Command-backed adapter that runs `hoonc my-app.hoon` as part of fixture setup
- Load the compiled `.jam` into a NockVM context
- Poke the kernel with test inputs and observe/assert on state transitions
- This is the genuinely hard problem — may require contributing upstream to NockVM to expose a test-harness API

**Effort:** ~4-8 weeks (significant upstream dependency). **Impact:** This is the 5th star for real execution support — the thing that makes Nocksperimental genuinely irreplaceable.

### Priority 6 — Developer documentation (unlocks learning curve ★★★★★) — ✅ SHIPPED

**Current:** README is comprehensive but deep. No separate `docs/invariants.md`, no cookbook, no tutorial.

**Required:**
- `docs/invariants.md` — each invariant kind with examples, common pitfalls, and when to use each
- `docs/fixture-cookbook.md` — 5-8 common NockApp patterns (DEX, bridge, payment, token, governance)
- `docs/getting-started.md` — 5-minute tutorial from zero to passing fixture
- Link from README to each doc

**Effort:** ~3 days. **Impact:** Converts the learning curve from "read 700-line README and experiment" to "5-minute tutorial then cookbook reference."

### Priority 7 — Fix the `setPath` array mutation bug (correctness) — ✅ FIXED

**Current:** `setPath(state, "orderBook.asks.0.status", "filled")` converts the array to `{"0": {"status": "filled"}}` instead of preserving `[{status: "filled"}, ...]`.

**Required:** In `applyOperation` for `kind: "set"`, check if the parent is an array and preserve array structure when setting indexed elements.

**Effort:** ~2 hours. **Impact:** Prevents confusing state snapshots and potential downstream operation failures.

### Priority 8 — Docs-atlas and drift-check hardening — ✅ SHIPPED

**Current:** Some drift checks require a local `nockchain/nockchain` clone, which blocks contributors who just want to author fixtures.

**Target:** Drift checks degrade gracefully with a clear message. Fixture authoring doesn't require upstream intelligence.

**Required:**
- In `check-nockchain-docs-drift.mjs` and related checks: if the local clone isn't found, return a `skipped` status with a clear message rather than failing
- Document in CONTRIBUTING.md: "To run drift checks, clone nockchain/nockchain to ../nockchain"

**Effort:** ~2 days. **Impact:** Removes the biggest friction for new contributors.

---

## 6. Five-Star Roadmap (ordered by leverage)

```
WEEK 1-2:  Ship npm package (Priority 1) ────────── ★★★☆☆ → ★★★★★ (portability)
WEEK 2-3:  TypeScript types (Priority 2) ─────────── ★★★☆☆ → ★★★★★ (ergonomics)
WEEK 3-4:  Invariant docs + cookbook (Priority 6) ── ★★★☆☆ → ★★★★★ (learning curve)
WEEK 4-5:  New invariant kinds (Priority 3) ──────── ★★★★☆ → ★★★★★ (expressiveness)
WEEK 5-6:  Fix setPath bug (Priority 7) ──────────── (correctness win)
WEEK 6-7:  Drift-check graceful degradation (P8) ── (contributor friction removal)
MONTH 2:   Real fakenet adapter demo (Priority 4) ── ★★☆☆☆ → ★★★★☆ (execution)
MONTH 3:   Kernel integration path POC (Priority 5)  ★★★★☆ → ★★★★★ (full-stack)
```

---

## 7. What Shipped During This Evaluation

- Built and validated `fixtures/nockdex-mock.lab.json` — a DEX fixture with 8 steps, 8 invariants, order book lifecycle, multi-actor trades, fee calculation, and supply conservation
- NockDEX fixture can serve as a reference example for `docs/fixture-cookbook.md`
- Confirmed all 10 bundled fixtures pass in strict CI mode
- Confirmed production deployment at nocksperimental.com is healthy across all major surfaces

---

## 8. Appendix: NockDEX Fixture as Reference

The custom fixture built during evaluation is committed at `fixtures/nockdex-mock.lab.json`. It demonstrates:

- **4 actors** (3 traders + DEX operator) with role-separated pokes
- **8 steps**: fakenet boot → bid placement → ask placement → partial fill → additional ask → full fill → orderbook peek → ledger peek
- **8 invariants**: supply conservation (balances + fees = totalSupply), fee non-negativity, trader solvency, orderbook state, poke-actor declaration, insolvent-settlement alert monitoring, minimum fee threshold, and exact trade log verification
- **Alert policy**: trader balance depletion warning
- **Design lesson**: fees must live inside `ledger.balances` for supply-conservation invariants to account for them; authorization invariants should be narrowly scoped to specific step types

---

*Report generated by Hermes Agent after a full evaluation of `kgbrah/nocksperimental` at commit `5ad2389`. This document is intended as a living improvement roadmap — update it as gaps close and stars are earned.*
