# Contributing

## Quick start

```bash
npm install
npm test          # full suite (a fan-out of node scripts/test-*.mjs checks)
npm run lint
npm run build     # production build (Next, deployed to Cloudflare via OpenNext)
npm run lab:ci    # run all bundled lab fixtures in strict mode
```

The single source of truth for agent/automation conventions is `AGENTS.md` (imported by
`CLAUDE.md`). Honor its **Coordination Gate** before structural work:
`git fetch --all --prune`, check branches/PRs/issues on `kgbrah/nocksperimental`, and
prefer CodeGraph over text search.

## Test conventions

- Tests are custom Node scripts: `scripts/test-*.mjs`, run via `node` (not Jest/Vitest).
  Each is wired into the aggregate `test` script in `package.json` as `test:<name>`.
- API-route tests import the route's `GET`/`POST` directly and stub `next/server`
  (and `@opennextjs/cloudflare` for KV-backed code).
- When you add a `test:*` script, add it to BOTH the `scripts` map and the `test` chain.

## Upstream drift checks degrade gracefully

The Nockchain source-drift checks (`scripts/check-nockchain-*-source-drift.mjs`, via the
shared engine `scripts/lib/source-drift-check.mjs`) compare commit-pinned anchors against
current upstream by fetching from the GitHub API. **You do not need network access or a
local `nockchain/nockchain` clone to author or run lab fixtures.** When upstream is
unreachable (offline, rate-limited, or GitHub down), an engine-based source-drift check
emits `status: "skipped"` and exits `0` rather than failing the build — a real drift only
fails once the fetch succeeds. To exercise the skip path deterministically, point the API
base at an unreachable host: `NOCKS_DRIFT_GITHUB_API=http://offline.invalid node
scripts/check-nockchain-mining-source-drift.mjs --json`.

(If you DO want full live drift coverage, run with normal network access; some
non-engine drift checks still require connectivity.)

## Adding an invariant kind

An invariant kind must be added in lockstep across these places or the parity tests fail.
The runner↔catalog parity is enforced by `scripts/test-run-lab-validation.mjs`
(`parityWithCatalog`), so a mismatch is caught automatically:

1. `scripts/run-lab.mjs` — `INVARIANT_REQUIRED_FIELDS` (per-kind required fields) and an
   `evaluateInvariant` branch returning `invariantResult(...)`.
2. `scripts/fixture-builder.mjs` — add the kind to `INVARIANT_KINDS`.
3. `src/lib/lab-report.ts` — add to the `InvariantKind` union and `invariantCatalog`
   (the catalog `requiredFields` must match the runner table exactly).
4. `schemas/nockapp-lab-fixture.schema.json` and `schemas/nockapp-invariant-pack.schema.json`
   — add to the `kind` enum, declare any new fields, and add the `if`/`then` required-field
   rule. (The pack schema is `additionalProperties: false`, so new fields MUST be declared.)
5. `docs/invariants.md` — add a catalog row.
6. Tests — extend `scripts/test-invariant-packs.mjs` (`CATALOG_KINDS`) and add positive +
   negative coverage in `scripts/test-invariant-kinds.mjs`.

Invariants must be **deterministic from final fixture state** (no clock, network, or
randomness). `custom-function` is a name resolved against a frozen in-runner allowlist
(`CUSTOM_INVARIANT_FUNCTIONS`) — never an eval of fixture-supplied code.

## Commits

Keep changes scoped and gated: run `npm test`, `npm run lint`, `npx tsc --noEmit`, and
`npm run build` before landing. Conventional-commit prefixes (`feat`, `fix`, `refactor`,
`test`, `docs`, `chore`) are used throughout the history.
