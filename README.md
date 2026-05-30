# nocksperimental

Nocksperimental is a Nockchain product lab focused on testing, simulation, and monitoring infrastructure for NockApps.

The current product thesis: serious NockApps will need deterministic local testing, state replay, invariant checks, and shareable audit-readiness reports before meaningful value can safely flow through them.

## Product Direction

The primary wedge is a NockApp testing lab:

- fakenet/test-run profiles
- scripted `peek` and `poke` fixtures
- state snapshots and replay logs
- invariant checks for app-specific safety rules
- CI-friendly JSON and Markdown reports
- hosted report history and verification badges later

Parallel tracks can reuse the same core engine:

- bridge and settlement monitoring
- native token test harnesses
- intent simulation and solver scoring
- compute benchmark reports

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` starts the Next.js app.
- `npm run build` checks a production build.
- `npm run lint` runs ESLint.
- `npm run lab:sample` generates the starter JSON and Markdown lab report in `.nocklab/`.
- `npm run lab:bridge` generates a mock bridge settlement report in `.nocklab/`.
- `npm run lab:bridge:delayed` generates a bridge report with a triggered warning alert.
- `npm run lab:payment` generates a payment flow report with the payments invariant pack.
- `npm run lab:intent` generates an intent settlement report with the intents invariant pack.
- `npm run lab:token` generates a token issuance report with the token invariant pack.
- `npm run lab:all` generates every bundled fixture report.
- `npm run lab:ci` runs the config-driven CI workflow locally and writes a manifest plus summary.
- `npm run verify:30-day` checks the 30-day plan artifacts and report generation.
- `npm run verify:90-day` checks the 30-90 day workflow, CI artifacts, and bridge alert states.
- `npm run verify:3-6` checks snapshot diffing, invariant packs, hosted report history, and private workspaces.
- `npm run verify:6-18` checks verified badges, solver scores, token compatibility, compute benchmarks, and trust-signal consumers.

## Initial MVP

- NockApp Lab dashboard.
- Filterable module plan.
- Strategy roadmap in `docs/strategy.md`.
- Invariant catalog in `docs/invariants.md`.
- Lab API at `/api/lab`.
- Invariant API at `/api/invariants`.
- Sample report API at `/api/reports/sample`.
- Hosted report viewer at `/reports/sample`.
- Hosted report history at `/reports/history`.
- Private team workspaces at `/workspaces`.
- Trust signal registry at `/trust`.
- Verified badges at `/trust/badges`.
- Solver scorecards at `/trust/solver-scores`.
- Token compatibility reports at `/trust/token-compatibility`.
- Compute benchmark profiles at `/trust/compute-benchmarks`.
- Fixture-driven runner in `scripts/run-lab.mjs`.
- Config-driven CI run in `nocklab.config.json`.
- GitHub Actions artifact workflow in `.github/workflows/nocklab.yml`.
- Structured strategy data in `src/lib/strategy.ts`.

## First Lab Runner

The first runner is intentionally fixture-driven. It validates the shape of a run, applies mock `poke` state patches, evaluates `peek` expectations, checks invariant packs, and emits CI-friendly report artifacts.

```bash
npm run lab:sample
```

Run every bundled fixture with:

```bash
npm run lab:all
```

Run the repo the way CI does with:

```bash
npm run lab:ci
```

This creates:

- `.nocklab/hello-counter.report.json`
- `.nocklab/hello-counter.report.md`
- `.nocklab/bridge-settlement.report.json`
- `.nocklab/bridge-settlement.report.md`
- `.nocklab/bridge-delayed.report.json`
- `.nocklab/bridge-delayed.report.md`
- `.nocklab/payment-flow.report.json`
- `.nocklab/payment-flow.report.md`
- `.nocklab/intent-settlement.report.json`
- `.nocklab/intent-settlement.report.md`
- `.nocklab/token-issuance.report.json`
- `.nocklab/token-issuance.report.md`
- `.nocklab/manifest.json`
- `.nocklab/summary.md`

The current runner does not call a live Nockchain node yet. The next adapter milestone is replacing mock step execution with local fakenet gRPC calls.

## 3-6 Month Slice

The repo now includes the pre-audit layer primitives from the strategy:

- state snapshot timelines and per-step state diffs in generated reports
- reusable invariant packs for payments, intents, and token issuance
- hosted report history data, API, and page
- private team workspace data, API, and page

Run the verification gate with:

```bash
npm run verify:3-6
```

## 6-18 Month Slice

The repo now includes the ecosystem trust primitives from the strategy:

- verified report badges with report hash, snapshot root, invariant packs, and signature fields
- solver execution-quality scorecards
- native token compatibility reports for wallet listing decisions
- compute provider benchmark profiles
- adoption proof for apps, wallets, funds, and providers

Run the verification gate with:

```bash
npm run verify:6-18
```
