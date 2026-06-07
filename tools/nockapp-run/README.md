# nockapp-run — offline NockApp kernel poke/peek harness

`nockapp-run.rs` is the small CLI that lets the lab drive **real** NockVM kernel
execution — load a compiled kernel, apply pokes, peek state — entirely offline (no node,
no network). It is what the `kernel`-mode fixture `fixtures/kernel-poke-peek.lab.json`
calls.

It is ~70 lines over the **existing** `nockapp` crate API (`setup_nockapp` /
`poke_sync` / `peek_sync`), mirroring `crates/nockapp/tests/integration.rs::test_sync_peek_and_poke`.
There is **no upstream NockVM work required** — the poke/peek API already exists; this is
just a CLI front-end for it.

## Build

It depends on the `nockapp` crate, so it builds from a Nockchain checkout. Two tiny,
upstreamable changes to that checkout:

1. Drop `nockapp-run.rs` into `crates/nockapp/src/bin/` (cargo auto-discovers `src/bin/*`).
2. Add the tokio runtime features the bin needs to `crates/nockapp/Cargo.toml`:
   `tokio = { workspace = true, features = ["time", "sync", "signal", "rt-multi-thread", "macros"] }`

Then build (the workspace pins a nightly toolchain via `rust-toolchain.toml`; rustup
fetches it automatically). The default `tracing-tracy` feature has a native build that
isn't needed here, so disable it:

```bash
cd <nockchain>
cargo build -p nockapp --bin nockapp-run --no-default-features --features slog-tracing
cp target/debug/nockapp-run ~/.local/bin/nockapp-run   # put it on PATH for the lab fixture
```

(Ideally this is upstreamed as a first-class `nockapp` bin so it ships with the toolchain
alongside `nockchain` / `nockchain-wallet`, and the lab just expects `nockapp-run` on PATH.)

## Use

```bash
nockapp-run 3
# -> nockapp-run: kernel=test-ker.jam pokes=3 peeked-state-matches-expected=true   (exit 0)
```

It loads the bundled counter kernel `test-ker.jam`, applies N `inc` pokes, peeks
`[%state 0]`, and exits 0 iff the state equals N. The poke/peek interface
(`inc` / `[%state 0]`) matches `test-ker.jam`; the same harness runs any kernel exposing
that interface (including hoonc-compiled ones).

A real run is committed at `docs/evidence/kernel-poke-peek.report.md`.
