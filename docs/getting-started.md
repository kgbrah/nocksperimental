# Getting Started — from zero to a passing fixture in 5 minutes

This is the fastest path to running the NockApp Lab and writing your first fixture. For
the full invariant reference see [`docs/invariants.md`](./invariants.md); for ready-made
patterns see [`docs/fixture-cookbook.md`](./fixture-cookbook.md).

## 1. Install

In this repo:

```bash
npm install
```

In an external NockApp repo (once published):

```bash
npm install --save-dev nocklab
# or run without installing:
npx nocklab fixtures/my-app.lab.json --strict
```

## 2. Run a bundled fixture

```bash
# single fixture, JSON + Markdown report
npm run lab:sample            # -> .nocklab/hello-counter.report.{json,md}

# the full CI batch (all bundled fixtures, strict)
npm run lab:ci                # -> .nocklab/manifest.json + summary.md
```

Open `.nocklab/hello-counter.report.md` to see per-step state snapshots, diffs, the
`beforeHash`/`afterHash` chain, and each invariant's pass/fail with an observed and
expected value.

## 3. Scaffold your own fixture

```bash
npx nocklab new-fixture --slug my-app --type poke --out fixtures/my-app.lab.json
npx nocklab fixtures/my-app.lab.json --strict
```

A fixture has five required parts: `app` (identity), `environment` (mode + endpoint),
`initialState` (the starting state tree), `steps` (scripted `fakenet`/`poke`/`peek`/
`bridge` interactions that mutate state), and `invariants` (safety checks evaluated
against the final state).

## 4. A minimal fixture

```json
{
  "id": "counter-demo-v0",
  "app": { "name": "Counter Demo", "slug": "counter-demo", "version": "0.1.0", "kernel": "counter-kernel" },
  "environment": { "mode": "mock-fakenet", "grpcEndpoint": "127.0.0.1:5555", "fakenetCommand": "fakenock --start", "notes": [] },
  "actors": [{ "name": "user", "pkh": "PKHUSER" }],
  "initialState": { "counter": 0 },
  "steps": [
    { "id": "boot", "type": "fakenet", "title": "Boot fakenet" },
    { "id": "bump", "type": "poke", "title": "Increment the counter", "actor": "user",
      "operation": { "kind": "increment", "path": "counter", "by": 2 } }
  ],
  "invariants": [
    { "id": "counter-floor", "title": "counter never negative", "severity": "high", "kind": "numeric-min", "path": "counter", "min": 0 },
    { "id": "counter-cap", "title": "counter within range", "severity": "medium", "kind": "numeric-range", "path": "counter", "min": 0, "max": 10 }
  ]
}
```

Run it: `npx nocklab fixtures/counter-demo.lab.json --strict` → both invariants `pass`.

## 5. Author in TypeScript (optional)

With the `nocklab` package you get full type-checking and autocomplete:

```ts
import { defineFixture } from "nocklab";

export default defineFixture({
  id: "counter-demo-v0",
  app: { name: "Counter Demo", slug: "counter-demo", version: "0.1.0", kernel: "counter-kernel" },
  environment: { mode: "mock-fakenet", grpcEndpoint: "127.0.0.1:5555", fakenetCommand: "fakenock --start", notes: [] },
  initialState: { counter: 0 },
  steps: [{ id: "boot", type: "fakenet", title: "Boot fakenet" }],
  invariants: [{ id: "counter-floor", title: "counter >= 0", severity: "high", kind: "numeric-min", path: "counter", min: 0 }]
});
```

## Next steps

- [`docs/fixture-cookbook.md`](./fixture-cookbook.md) — payment, bridge, token, DEX, and intent patterns.
- [`docs/invariants.md`](./invariants.md) — the full invariant catalog (11 kinds).
- [`docs/ci.md`](./ci.md) — wiring `nocklab` into CI.
- Running against a real node: [`docs/local-fakenet-guide.md`](./local-fakenet-guide.md).
