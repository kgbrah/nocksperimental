# Invariant Catalog v0

The v0 catalog covers invariants that can be evaluated from fixture state alone. These checks are intentionally adapter-independent so reports can be generated without a live fakenet adapter (the `local-fakenet` adapter does real probes — a TCP gRPC-reachability check plus command-backed peek/poke against whatever is on your PATH, on Nockchain `nockchain-wallet`).

| ID | Kind | Purpose | Required fields |
| --- | --- | --- | --- |
| `state.numeric-min.v0` | `numeric-min` | Verify a numeric state value never drops below a configured minimum. | `path`, `min` |
| `state.equals.v0` | `state-equals` | Verify a state path has an exact expected value after scripted interactions. | `path`, `equals` |
| `actors.poke-declared.v0` | `poke-actors-declared` | Verify every `poke` step has an actor declared in the fixture. | none |
| `balances.supply-conserved.v0` | `supply-conservation` | Verify balances sum to the declared supply. | `balancesPath`, `supplyPath` |
| `timeline.expected-state.v0` | `timeline-state` | Verify an operational lifecycle reaches a required terminal state. | `path`, `equals` |
| `actors.authorized.v0` | `authorized-actor` | Verify all steps of a type are performed by an allowed actor set. | `actors`, `stepType` |
| `state.numeric-range.v0` | `numeric-range` | Verify a numeric value stays within an inclusive `[min, max]` range (e.g. a fee ≤ 5%). | `path`, `min`, `max` |
| `array.length-min.v0` | `array-length-min` | Verify an array at a path has at least `min` elements (e.g. ≥ 2 trades settled). | `path`, `min` |
| `array.length-max.v0` | `array-length-max` | Verify an array at a path has at most `max` elements (e.g. 0 active alerts). | `path`, `max` |
| `timeline.temporal-ordering.v0` | `temporal-ordering` | Verify one logged event precedes another within an ordered log array (e.g. a lock before a release). | `path`, `field`, `before`, `after` |
| `custom.function.v0` | `custom-function` | Run a named, repo-registered pure function against final state. | `fn`, `path` |

## Expressive kinds (numeric-range, array-length, temporal-ordering, custom-function)

These cover the ~20% of safety properties the original six could not express, while staying deterministic over final state.

- **`numeric-range`** — `actual` must be a number with `min <= actual <= max` (mirrors `numeric-min`'s strict typing; a non-number fails).
- **`array-length-min` / `array-length-max`** — the value at `path` must be an array whose length satisfies the bound; a non-array fails with a clear observed value.
- **`temporal-ordering`** — asserts ordering *within an ordered log array in final state*, NOT against per-step history (invariants see only final state, so determinism is preserved). It finds the first array element whose `[field]` deep-equals `before` and the first whose `[field]` equals `after`, and passes only when both exist and `before` is at a strictly lower index. Example: `path: "payment.events"`, `field: "type"`, `before: "locked"`, `after: "settled"`.
- **`custom-function`** — references a function by **name** (`fn`) from a static, in-repo allowlist (`CUSTOM_INVARIANT_FUNCTIONS` in `scripts/run-lab.mjs`). There is **no `eval`, no `new Function`, and no fixture-supplied code** — a fixture can only reference an already-registered name, and an unknown name is rejected at load time. Each registered function is pure over final state. Adding a function is a deliberate, reviewed code change; it is an allowlist, never a fixture-extensible hook. The seed function `balances-non-negative` asserts every value under `path` is `>= 0`.

## Design Rules

- Invariants must be deterministic from the fixture and resulting state.
- Invariants must emit an observed value and an expected value in the report.
- Critical failures should fail `--strict` runner executions.
- New invariant kinds should be added to the fixture schema, runner evaluator, API catalog, and docs together.

### Required-field enforcement

The runner (`scripts/run-lab.mjs`) validates each invariant's `kind` and the per-kind
required fields above before evaluation, and rejects the run with a located error
(for example, `invariants[0] (counter-non-negative): kind "numeric-min" requires
numeric field "min"`). A `numeric-min` with a missing or non-numeric `min`, or an
`authorized-actor` with an empty `actors` array, is rejected at load time instead of
silently producing a false `fail`. The JSON schemas (`schemas/nockapp-lab-fixture.schema.json`
and `schemas/nockapp-invariant-pack.schema.json`) encode the same per-kind requirements via
`if`/`then` for editor and CI parity; the runtime check is the load-bearing guard, and the
runner's table is kept in sync with `src/lib/lab-report.ts` `invariantCatalog` by
`scripts/test-run-lab-validation.mjs`.

## Initial Packs

- **NockApp starter pack:** counter floor, expected state, declared poke actors.
- **Settlement pack:** bridge status, proof status, timeline terminal state.
- **Token pack:** supply conservation, mint/burn authority, metadata consistency.

## Domain Pack Files

Reusable invariant packs live under `packs/` and can be imported by fixtures through `invariantPacks`.

- `packs/payments.invariants.json`: escrowed payment settlement, authorized payment actors, and payment ledger supply conservation.
- `packs/intents.invariants.json`: intent terminal state, solver recording, authorized intent actors, and clear failure state.
- `packs/tokens.invariants.json`: token issuance finalization, metadata stability, issuance authority, and token supply conservation.
- `packs/bridge.invariants.json`: bridge withdrawal settlement — finalized terminal state, proof and Base observation, failure-free runs, and authorized relayer/sequencer pokes (exercised by `fixtures/bridge-pack.lab.json`).
- `packs/pma-safety.invariants.json`: PMA/state-jam durability — monotonic checkpoint-height and event-log boundary floors, kernel-state continuity, network context, and authorized writers (exercised by `fixtures/pma-safety.lab.json`).
- `packs/mining-pow.invariants.json`: fakenet mining/PoW — block-height floor (no regression), proof-of-work target met, mining on the heaviest chain (not a stale candidate), network context, and authorized miners (exercised by `fixtures/mining-pow.lab.json`).

No new evaluator kinds were added: the bridge, PMA, and mining packs are expressed entirely with the existing catalog (`numeric-min`, `state-equals`, `timeline-state`, `authorized-actor`, `supply-conservation`, `poke-actors-declared`).

## Pack source anchoring

Each pack records an `upstreamBasis` (`repo`, `commit`, `build`, `protocolTrack`) pinning the Nockchain version whose protocol/runtime behavior it encodes, and may list `sourceAnchors` (upstream files) that justify its checks. The basis is surfaced at `/api/invariants` (alongside the invariant catalog) and verified offline by `npm run test:invariant-pack-basis`, which asserts every pack's pinned commit matches the canonical commit in `docs/research/nockchain-rust-architecture.md`. Pack logic does not drift with upstream source the way Rust files do, so pinning + surfacing the basis preserves authority without a networked drift check. Run `npm run verify:invariant-packs` to regenerate the pack reports and confirm they pass with rendered per-step state diffs.
