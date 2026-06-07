# nocklab

Fixture-driven test runner for **NockApp launch evidence**. Author a fixture (scripted
`poke`/`peek`/`fakenet`/`bridge` steps over a mutable state tree), declare invariants,
and `nocklab` emits a deterministic JSON + Markdown report with per-step state
snapshots, diffs, and cryptographic hashes — runnable in CI before a live Nockchain
node exists.

This is the standalone distribution of the lab runner from
[`kgbrah/nocksperimental`](https://github.com/kgbrah/nocksperimental).

## Install

```bash
npm install --save-dev nocklab
# or run without installing:
npx nocklab fixtures/my-app.lab.json --strict
```

## CLI

```bash
# Run one fixture, write JSON + Markdown reports
nocklab fixtures/my-app.lab.json --out report.json --markdown report.md --strict

# Run a batch from a config (paths resolve relative to the config file)
nocklab run --config nocklab.config.json --ci --strict

# Scaffold a new fixture
nocklab new-fixture --slug my-app --type poke --out fixtures/my-app.lab.json
```

Exit code is non-zero under `--strict` when an invariant fails. Invariant packs in a
fixture's `invariantPacks` are resolved **relative to the fixture file**, so an external
repo ships its own `fixtures/` and `packs/` and the paths Just Work.

## Invariant kinds

`numeric-min`, `numeric-range`, `array-length-min`, `array-length-max`, `state-equals`,
`timeline-state`, `temporal-ordering`, `supply-conservation`, `authorized-actor`,
`poke-actors-declared`, and `custom-function` (a name resolved against a frozen in-runner
allowlist — no fixture-supplied code). All invariants are evaluated deterministically
from final fixture state.

## Typed authoring

Author fixtures in TypeScript with full autocomplete and type-checking:

```ts
import { defineFixture } from "nocklab";

export default defineFixture({
  id: "my-app-v0",
  app: { name: "My App", slug: "my-app", version: "0.1.0", kernel: "my-kernel" },
  environment: { mode: "mock-fakenet", grpcEndpoint: "127.0.0.1:5555", fakenetCommand: "fakenock --start", notes: [] },
  initialState: { counter: 0 },
  steps: [{ id: "boot", type: "fakenet", title: "Boot" }],
  invariants: [
    { id: "counter-floor", title: "counter >= 0", severity: "high", kind: "numeric-min", path: "counter", min: 0 }
  ]
});
```

## License

MIT
