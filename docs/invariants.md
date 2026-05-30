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

## Initial Packs

- **NockApp starter pack:** counter floor, expected state, declared poke actors.
- **Settlement pack:** bridge status, proof status, timeline terminal state.
- **Token pack:** supply conservation, mint/burn authority, metadata consistency.

## Domain Pack Files

Reusable invariant packs live under `packs/` and can be imported by fixtures through `invariantPacks`.

- `packs/payments.invariants.json`: escrowed payment settlement, authorized payment actors, and payment ledger supply conservation.
- `packs/intents.invariants.json`: intent terminal state, solver recording, authorized intent actors, and clear failure state.
- `packs/tokens.invariants.json`: token issuance finalization, metadata stability, issuance authority, and token supply conservation.
