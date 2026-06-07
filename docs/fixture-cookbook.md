# Fixture Cookbook

Ready-made patterns for common NockApp shapes. Each recipe points at a real fixture in
`fixtures/` you can copy, and calls out the invariants that make it trustworthy. See
[`docs/invariants.md`](./invariants.md) for the full catalog and
[`docs/getting-started.md`](./getting-started.md) for the basics.

## How state + steps + invariants fit together

- `initialState` is the starting state tree.
- Each step may carry an `operation`/`operations` that mutates state:
  `set` (write a path), `increment` (`path` + `by`), `transfer` (`fromPath`/`toPath`/`amount`),
  and `append-event` (push onto an ordered log array — the basis for `temporal-ordering`).
- Invariants run against the **final** state. They are deterministic and
  adapter-independent (no clock, network, or randomness), so reports reproduce exactly.

## 1. Counter / state machine — `numeric-min`, `numeric-range`, `state-equals`

See `fixtures/hello-counter.lab.json`. Use `numeric-min` for a floor (`counter >= 0`),
`numeric-range` for a bounded value (`0 <= level <= 100`), and `state-equals` /
`timeline-state` to assert a terminal status (`status == "ready"`).

## 2. Payment / escrow — `supply-conservation`, `temporal-ordering`, `authorized-actor`

See `fixtures/payment-flow.lab.json`. Model balances under `ledger.balances` and use
`transfer` operations so totals are preserved; assert `supply-conservation`
(`balancesPath` sums to `supplyPath`). Append lifecycle events to `payment.events` with
`append-event`, then prove ordering with `temporal-ordering`:

```json
{ "id": "lock-before-settle", "title": "funds lock before settlement", "severity": "high",
  "kind": "temporal-ordering", "path": "payment.events", "field": "type",
  "before": "locked", "after": "settled" }
```

Scope writes with `authorized-actor` (`stepType: "poke"`, `actors: ["merchant", "treasury"]`).

## 3. Bridge / settlement — `timeline-state`, `temporal-ordering`, alert policies

See `fixtures/bridge-settlement.lab.json` and `fixtures/bridge-delayed.lab.json`. Drive
the lifecycle to a terminal `timeline-state` (`bridge.status == "finalized"`), assert the
proof/observation order with `temporal-ordering`, and add an `alertPolicies` entry that
`triggers` on a stuck/delayed state (the delayed fixture shows a warning alert firing by
design).

## 4. Token issuance — `supply-conservation`, `authorized-actor`, `state-equals`

See `fixtures/token-issuance.lab.json`. Assert mint/burn keep `supply-conservation`,
that only the issuer can mint (`authorized-actor`), and that metadata is stable
(`state-equals` on the metadata path).

## 5. DEX / order book — `array-length-min/max`, `custom-function`, `supply-conservation`

See `fixtures/nockdex-mock.lab.json` (the reference DEX fixture). It models an order
book, multi-actor trades, and fee collection across 8 steps and 8 invariants. Key
techniques:

- Keep collected fees **inside** `ledger.balances` so `supply-conservation`
  (`balances + fees == totalSupply`) accounts for them — fees living outside the ledger
  is the classic supply-conservation violation.
- Use `array-length-min` to require at least N settled trades (`trades.length >= 2`) and
  `array-length-max` to require no open insolvent positions (`alerts.active.length <= 0`).
- Use `custom-function` (`fn: "balances-non-negative"`) to assert no trader goes
  insolvent. `custom-function` resolves a **name** against a frozen in-runner allowlist —
  there is no fixture-supplied code; add new functions in `scripts/run-lab.mjs`.
- Scope each poke to a specific actor with a narrowly-typed `authorized-actor`.

## 6. Intent / solver settlement — `timeline-state`, `temporal-ordering`

See `fixtures/intent-settlement.lab.json`. Assert the intent reaches a settled terminal
state, the solver is recorded, and the declared→quoted→settled order holds via
`temporal-ordering` on `intent.events`.

## Tips

- Prefer declarative kinds over `custom-function`; reach for `custom-function` only when
  a check can't be expressed with the others, and keep its registered function pure.
- Use `--strict` in CI so a critical invariant failure fails the build.
- `nocklab new-fixture --slug <x> --type poke` scaffolds a valid starting point.
