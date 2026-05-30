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
- `npm run lab:sample` generates a sample JSON and Markdown lab report in `.nocklab/`.

## Initial MVP

- NockApp Lab dashboard.
- Filterable module plan.
- Strategy roadmap in `docs/strategy.md`.
- Lab API at `/api/lab`.
- Sample report API at `/api/reports/sample`.
- Fixture-driven runner in `scripts/run-lab.mjs`.
- Structured strategy data in `src/lib/strategy.ts`.

## First Lab Runner

The first runner is intentionally fixture-driven. It validates the shape of a run, applies mock `poke` state patches, evaluates `peek` expectations, checks invariant packs, and emits CI-friendly report artifacts.

```bash
npm run lab:sample
```

This creates:

- `.nocklab/hello-counter.report.json`
- `.nocklab/hello-counter.report.md`

The current runner does not call a live Nockchain node yet. The next adapter milestone is replacing mock step execution with local fakenet gRPC calls.
