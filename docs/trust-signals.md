# Trust Signals

The 6-18 month slice turns lab reports into ecosystem trust infrastructure.

The MVP data source is `src/data/trust-signals.json`, with a registry schema at `schemas/nockapp-trust-signal.schema.json`.

## Surfaces

- `/trust`: trust-signal overview and adoption proof.
- `/trust/badges`: verified report badges.
- `/trust/solver-scores`: solver execution-quality scorecards.
- `/trust/token-compatibility`: native token compatibility reports.
- `/trust/compute-benchmarks`: compute provider benchmark profiles.

API routes mirror those pages:

- `/api/trust`
- `/api/trust/badges`
- `/api/trust/solver-scores`
- `/api/trust/token-compatibility`
- `/api/trust/compute-benchmarks`

## Data Contracts

Verified badges bind a report slug, fixture id, report hash, snapshot root, invariant packs, and registry signature.

Solver scorecards convert intent settlement reports into fill-rate, latency, failure-rate, and replay-count scores.

Token compatibility reports convert token issuance evidence into wallet listing checks for supply, metadata, authority, and transfer behavior.

Compute benchmark profiles define provider reputation from reproducible job-class latency, failure-rate, uptime, and sample-size metrics.

## Adoption Proof

The trust registry includes four consumer categories:

- apps use verified badges as launch-readiness signals
- wallets use token compatibility reports as listing signals
- funds use verified reports and solver scorecards as diligence signals
- providers use benchmark profiles as reputation signals

This is intentionally static and low-capital. The next production step is signed badge issuance, revocation, public embed codes, and storage-backed score histories.
