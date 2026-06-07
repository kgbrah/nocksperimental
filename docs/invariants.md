# Invariant Catalog v0

The v0 catalog covers invariants that can be evaluated from fixture state alone. These checks are intentionally adapter-independent so reports can be generated before a live fakenet adapter exists.

| ID | Kind | Purpose | Required fields |
| --- | --- | --- | --- |
| `state.numeric-min.v0` | `numeric-min` | Verify a numeric state value never drops below a configured minimum. | `path`, `min` |
| `state.equals.v0` | `state-equals` | Verify a state path has an exact expected value after scripted interactions. | `path`, `equals` |
| `actors.poke-declared.v0` | `poke-actors-declared` | Verify every `poke` step has an actor declared in the fixture. | none |
| `balances.supply-conserved.v0` | `supply-conservation` | Verify balances sum to the declared supply. | `balancesPath`, `supplyPath` |
| `timeline.expected-state.v0` | `timeline-state` | Verify an operational lifecycle reaches a required terminal state. | `path`, `equals` |
| `actors.authorized.v0` | `authorized-actor` | Verify all steps of a type are performed by an allowed actor set. | `actors`, `stepType` |

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
