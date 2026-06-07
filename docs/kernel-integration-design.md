# NockApp kernel integration (Hoon → NockVM → lab)

> **Status: ACHIEVED (real poke/peek), not upstream-gated.** An earlier draft of this doc
> claimed the 5th "real execution" star needed ~4–8 weeks of upstream NockVM work. That was
> wrong: the `nockapp` crate already exposes `setup_nockapp` / `poke_sync` / `peek_sync`
> (see `crates/nockapp/tests/integration.rs::test_sync_peek_and_poke`). The remaining gap
> was only a small CLI front-end, now built as `nockapp-run` (~70 lines; source vendored at
> `tools/nockapp-run/`). The lab drives a **real** offline NockVM kernel poke →
> state-transition → peek cycle via the `kernel` environment mode:
>
> - **Compile:** `fixtures/kernel-compile-trivial.lab.json` runs real `hoonc` (Hoon → Nock jam).
> - **Poke/peek:** `fixtures/kernel-poke-peek.lab.json` runs `nockapp-run`, applying 3 `inc`
>   pokes to a real counter kernel and verifying the peeked `[%state 0]` equals 3 — strict, exit 0.
>
> Real runs are committed at `docs/evidence/kernel-compile-trivial.report.md` and
> `docs/evidence/kernel-poke-peek.report.md`. Build instructions for the harness:
> `tools/nockapp-run/README.md`. **What still needs upstream**: shipping `nockapp-run` as a
> first-class toolchain bin (so it lands on PATH with `nockchain`/`nockchain-wallet`), and a
> generic poke/peek that constructs arbitrary cause nouns from the CLI (today the harness uses
> the counter kernel's `inc`/`[%state 0]` interface). Neither blocks the real-execution path.

## Problem

Today the lab can test invariant **design** but not a NockApp's actual kernel
implementation. `mock-fakenet` applies operations to a JavaScript state tree;
`local-fakenet` drives a *running* node from the outside via command-backed adapters.
Neither executes the app's compiled Hoon/Jock kernel and observes real state
transitions. Until it does, a passing report proves the invariants are well-formed, not
that the kernel upholds them.

## Target

```
my-app.hoon  --hoonc-->  my-app.jam  --load-->  NockVM  --poke/peek-->  state  --> lab invariants
```

A fixture should be able to: compile a kernel during setup, load the compiled `.jam`
into a NockVM context, poke it with scripted inputs, read back state via peek, and
evaluate the existing invariant catalog against that **real** state — using the same
fixture/report format as mock and local-fakenet runs.

## Approach: a command-backed kernel adapter (reuses the existing seam)

The lab already has a command-backed adapter mechanism (`step.adapter.command` +
`expect`, see `local-fakenet` peek/poke). The kernel path extends the same seam rather
than inventing a new runner:

1. **Compile in setup** — an environment-level `kernelBuild` command runs `hoonc
   my-app.hoon` and yields a `.jam` artifact path. Failures fail the run with the
   compiler's diagnostics (a real, valuable signal on its own).
2. **Load + poke via a harness command** — each `poke`/`peek` step's adapter invokes a
   NockVM test-harness CLI that loads the `.jam`, applies the poke, and prints the
   resulting state (or a peek result) as JSON to stdout.
3. **Map stdout → state** — the adapter's parsed JSON merges into the lab state tree, so
   the existing invariant evaluator (`numeric-min`, `supply-conservation`,
   `temporal-ordering`, …) runs unchanged against real kernel output.

This keeps the runner's invariant/report machinery untouched; only a new adapter "mode"
(e.g. `kernel`) and an environment `kernelBuild` field are added.

### Proposed fixture shape (not yet supported)

```jsonc
{
  "environment": {
    "mode": "kernel",
    "kernelBuild": { "program": "hoonc", "args": ["app/my-app.hoon", "--out", "build/my-app.jam"] }
  },
  "steps": [
    { "id": "poke-init", "type": "poke", "title": "Initialize", "actor": "op",
      "adapter": { "kind": "kernel",
        "command": { "program": "nockvm-harness", "args": ["poke", "build/my-app.jam", "--input", "init.jam"] },
        "expect": { "stdoutJsonMerge": "$.state" } } }
  ]
}
```

## The upstream dependency (why this is not built here)

The load-bearing missing piece is a **NockVM test-harness API**: a stable, scriptable way
to load a compiled kernel, apply a poke, and read state out as structured data, without a
full node. That surface does not exist upstream today and likely requires contributing it
to NockVM. Concretely, upstream needs to expose:

- a deterministic "load `.jam` → context" entry point usable from a CLI/library;
- `poke(context, input) -> context'` and `peek(context, path) -> noun` that serialize
  the result to a stable, machine-readable form (JSON or a documented jam encoding);
- determinism guarantees (no clock/entropy) so lab reports stay reproducible.

Estimated effort: **4–8 weeks**, dominated by the upstream NockVM work and its review
cycle, not the lab-side adapter (which is small once the harness exists).

## Incremental, shippable steps (in dependency order)

1. **`hoonc`-only compile gate** — add `environment.kernelBuild`; a fixture that just
   compiles a kernel and asserts compilation succeeds. This is buildable **now** (depends
   only on `hoonc`) and already catches real breakage. *(Smallest first star toward this.)*
2. **Harness poke/peek** — once the NockVM harness CLI exists, add the `kernel` adapter
   mode + `stdoutJsonMerge`, then drive real state transitions.
3. **Reference fixture + guide** — a `kernel`-mode reference fixture and a guide mirroring
   `docs/local-fakenet-guide.md`, with a recorded real run.

## What exists today (the seam this builds on)

- Command-backed adapters: `scripts/run-lab.mjs` (`runCommand`, `probeAdapterCommand`,
  `step.adapter.command`/`expect`).
- Deterministic invariant evaluation over final state (`evaluateInvariant`).
- The mock → local-fakenet → kernel progression keeps one fixture/report format; only the
  adapter changes. See `docs/local-fakenet-guide.md` for the live-node tier.
