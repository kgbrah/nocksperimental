# Trust Signals

The 6-18 month slice turns lab reports into ecosystem trust infrastructure.

The MVP data source is `src/data/trust-signals.json`, with a registry schema at `schemas/nockapp-trust-signal.schema.json`.

Score history storage is kept in `src/data/trust-score-history.json`, with a registry schema at `schemas/nockapp-trust-score-history.schema.json`.

Trust update history is kept in `src/data/trust-update-log.json`, with a chain schema at `schemas/nockapp-trust-update-log.schema.json`.

## Surfaces

- `/trust`: trust-signal overview and adoption proof.
- `/trust/badges`: verified report badges.
- `/trust/solver-scores`: solver execution-quality scorecards.
- `/trust/token-compatibility`: native token compatibility reports.
- `/trust/compute-benchmarks`: compute provider benchmark profiles.
- `/trust/score-history`: storage-backed score histories.
- `/trust/updates`: signed append-only registry updates.

API routes mirror those pages:

- `/api/trust`
- `/api/trust/badges`
- `/api/trust/badges/[badgeId]`
- `/api/trust/solver-scores`
- `/api/trust/token-compatibility`
- `/api/trust/compute-benchmarks`
- `/api/trust/score-history`
- `/api/trust/updates`

## Data Contracts

Verified badges bind a report slug, fixture id, report hash, snapshot root, invariant packs, and registry signature.

Badge issuance receipts bind each issued badge to a signed payload digest, issuer key id, signature, and verification status. Public embed snippets include the issuance digest and issuer key so consumers can tie a badge display back to the signed registry receipt.

Badge revocations bind a historical badge id to a revocation timestamp, reason, replacement badge, and revocation signature. Public embed snippets are only emitted for current verified badges, while revoked badge records stay queryable for audit trails.

Solver scorecards convert intent settlement reports into fill-rate, latency, failure-rate, and replay-count scores.

Token compatibility reports convert token issuance evidence into wallet listing checks for supply, metadata, authority, and transfer behavior.

Compute benchmark profiles define provider reputation from reproducible job-class latency, failure-rate, uptime, and sample-size metrics.

Score histories persist solver, token compatibility, and compute benchmark score windows in a static JSON store with latest, previous, delta, trend, and sparkline summaries.

Trust update logs chain registry changes with previous roots, entry hashes, root hashes, and registry signatures so consumers can audit append-only trust-store changes. `appendTrustUpdateToLog` creates the next signed devnet entry from the current log without mutating the static source data.

Registry maintainers can exercise the write path with `npm run trust:update:append -- --dry-run --id <update-id> --action score-history --target score-history --target-path src/data/trust-score-history.json --recorded-at <iso-time> --root-hash <new-root> --summary "<summary>"`. Drop `--dry-run` to persist the appended log to `src/data/trust-update-log.json`, or pass `--log <path>` to write a temporary copy during review.

Hosted maintainers can also call the protected `POST /api/trust/updates` path with `x-nocks-registry-key: $NOCKS_REGISTRY_UPDATE_KEY`. For key rotation, set `NOCKS_REGISTRY_UPDATE_KEYS` to comma-separated `key-id:secret` entries and send `x-nocks-registry-key-id` with the selected key. By default the API returns the signed append candidate, updated chain metadata, validation result, and audit event without mutating the static registry source. When `NOCKS_REGISTRY_UPDATE_WRITE_PATH` points at a registry JSON file, the API reads that file, appends from its latest persisted root, validates the candidate, and writes the durable log back to that path. When `NOCKS_REGISTRY_UPDATE_AUDIT_PATH` is set, each protected append also writes a hashed audit event with the update id, actor, key id, previous root, new root, and persistence status. Maintainers can inspect configured audit state through protected `GET /api/trust/updates/audit`, which returns event count, latest event, and the bounded audit event list.

## Adoption Proof

The trust registry includes four consumer categories:

- apps use verified badges as launch-readiness signals
- wallets use token compatibility reports as listing signals
- funds use verified reports and solver scorecards as diligence signals
- providers use benchmark profiles as reputation signals

This is intentionally static and low-capital. The next production step is moving the durable write path from a JSON file adapter to managed registry storage.
