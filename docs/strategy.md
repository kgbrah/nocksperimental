# Nocksperimental Strategy

## Positioning

Nocksperimental should become testing, simulation, and monitoring infrastructure for Nockchain applications.

The goal is not to outbuild official developer docs, a launchpad, or a block explorer. The goal is to own the trust layer that serious NockApps need before users, funds, wallets, and solvers rely on them.

## Thesis

NockApp development creates a new testing surface:

- application state lives as durable Nock nouns
- interactions happen through `peek` and `poke`
- apps coordinate through gRPC, intents, proofs, and settlement
- Nockchain is moving toward private transactions, ZK verification, native tokens, and compute markets

That makes simulation and invariant testing essential. Distribution tooling gets developers in the door; testing infrastructure decides whether serious value can flow through the app.

## Product Wedge

Start with a NockApp testing lab:

1. Define fakenet and test-run profiles.
2. Script app interactions as repeatable fixtures.
3. Capture state before and after each run.
4. Evaluate invariants.
5. Produce CI-friendly JSON and Markdown reports.
6. Later, host report history and verified badges.

The first user-visible artifact is a run report, even before the test engine is fully connected to real Nockchain services.

## Parallel Tracks

Build these beside the core lab because they reuse the same primitives.

### Bridge + Settlement Monitor

Why: Bridge activity creates immediate operational pain around stuck transfers, withdrawal state, proof status, and reconciliation.

Shared core: event timelines, alert policies, report exports.

First artifact: mocked transfer timeline with initiated, observed, finalized, delayed, and failed states.

### Native Token Test Harness

Why: Native tokens are later on the roadmap, but issuers will need safety checks as soon as the standard lands.

Shared core: invariant packs, state diffs, compatibility reports.

First artifact: supply-conservation, authority, metadata, and transfer invariant pack.

### Intent Simulator

Why: Intent-based execution will need simulation before solver networks and private DeFi can be trusted.

Shared core: scripted runs, failure classification, solver replay logs.

First artifact: fixture format for intent declaration, solver response, proof status, and settlement result.

### Compute Benchmark Reports

Why: Compute brokerage is capital intensive. Benchmarking and provider reputation can start without owning hardware.

Shared core: report identity, scoring, provider profiles, verification badges.

First artifact: benchmark report schema for provider and job classes.

## Execution Plan

### 0-30 Days

Ship:

- NockApp Lab dashboard
- run report schema
- invariant catalog v0
- mock fakenet/test-run fixtures

Proof of value: a developer can understand what would be tested and what report they would get.

### 30-90 Days

Ship:

- CLI command for local report generation
- fixture-driven `peek`/`poke` simulation
- CI-friendly JSON and Markdown reports
- bridge monitor model with alert states

Proof of value: a NockApp repo can run a repeatable check and publish a report artifact.

### 3-6 Months

Ship:

- state snapshot diffing
- invariant packs for payments, intents, and token issuance
- hosted report history
- private team workspaces

Proof of value: teams use the lab before launch, audits, upgrades, and integrations.

### 6-18 Months

Ship:

- verified report badges
- solver execution-quality scoring
- native token compatibility reports
- compute provider benchmark profiles

Proof of value: apps, wallets, funds, and providers use Nocksperimental reports as trust signals.

## Revenue

Start with services and reports, then move into software:

- paid audit-readiness reports
- CI subscriptions
- private hosted report history
- verification badges
- bridge and treasury monitoring subscriptions
- issuer compatibility reports
- solver/provider reputation reports

## Near-Term Build Order

1. Static strategy dashboard and API.
2. Run report JSON schema.
3. Mock fixture library.
4. Invariant catalog.
5. CLI that reads fixtures and emits a report.
6. Hosted report viewer.

## Current Build Slice

The first executable slice is a fixture-driven runner:

- fixture: `fixtures/hello-counter.lab.json`
- fixture: `fixtures/bridge-settlement.lab.json`
- schema: `schemas/nockapp-lab-fixture.schema.json`
- schema: `schemas/nockapp-lab-report.schema.json`
- invariant catalog: `docs/invariants.md`
- runner: `scripts/run-lab.mjs`
- invariant API: `/api/invariants`
- sample report API: `/api/reports/sample`
- hosted report viewer: `/reports/sample`
- dashboard report preview on the home page

This creates a stable contract for the first real adapter. The runner currently applies mock state transitions, evaluates `peek` expectations, checks invariant packs, and emits JSON plus Markdown reports. The next engineering milestone is a local fakenet adapter that replaces mock execution with calls to the Nockchain gRPC service.

## 30-90 Day Build Slice

The developer-workflow slice adds the pieces needed for a NockApp repository to run repeatable checks and publish artifacts:

- package CLI entry: `nocklab`
- config-driven runs: `nocklab.config.json`
- local CI command: `npm run lab:ci`
- CI artifact workflow: `.github/workflows/nocklab.yml`
- CI docs: `docs/ci.md`
- operation-driven `peek`/`poke` fixture simulation
- bridge settlement fixture with clear alert states
- bridge delayed fixture with triggered warning alert state
- 30-90 verification gate: `npm run verify:90-day`

## 3-6 Month Build Slice

The pre-audit layer slice turns the lab from one-off reports into reusable team infrastructure:

- state snapshot timeline and per-step state diffs in generated reports
- invariant pack schema: `schemas/nockapp-invariant-pack.schema.json`
- payment invariant pack: `packs/payments.invariants.json`
- intent invariant pack: `packs/intents.invariants.json`
- token issuance invariant pack: `packs/tokens.invariants.json`
- payment fixture: `fixtures/payment-flow.lab.json`
- intent fixture: `fixtures/intent-settlement.lab.json`
- token issuance fixture: `fixtures/token-issuance.lab.json`
- hosted report history data: `src/data/report-history.json`
- hosted report history API and page: `/api/history`, `/reports/history`
- private workspace data: `src/data/private-workspaces.json`
- private workspace API and page: `/api/workspaces`, `/workspaces`
- 3-6 month verification gate: `npm run verify:3-6`

This proves the long-term wedge in a low-capital way: the repo now models the reports teams would retain before launch, during audits, for upgrades, and while integrating with other NockApp infrastructure.

## 6-18 Month Build Slice

The ecosystem-trust slice turns report evidence into reusable public signals:

- trust signal schema: `schemas/nockapp-trust-signal.schema.json`
- trust registry data: `src/data/trust-signals.json`
- verified report badge API and page: `/api/trust/badges`, `/trust/badges`
- solver execution-quality API and page: `/api/trust/solver-scores`, `/trust/solver-scores`
- native token compatibility API and page: `/api/trust/token-compatibility`, `/trust/token-compatibility`
- compute benchmark API and page: `/api/trust/compute-benchmarks`, `/trust/compute-benchmarks`
- trust overview API and page: `/api/trust`, `/trust`
- trust signal docs: `docs/trust-signals.md`
- 6-18 month verification gate: `npm run verify:6-18`

This completes the roadmap's trust-signal layer in a low-capital way: apps, wallets, funds, and compute providers now have explicit data contracts and UI surfaces for using Nocksperimental evidence as ecosystem trust signals.
