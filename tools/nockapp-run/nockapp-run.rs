// nockapp-run — minimal offline NockApp kernel poke/peek harness over the nockapp API.
//
// Loads a compiled kernel jam, applies N `inc` pokes, peeks `[%state 0]`, and checks the
// peeked state equals N: a REAL NockVM kernel poke -> state-transition -> peek cycle with
// NO live node and NO network. It is the harness nocksperimental's lab drives (in its
// `kernel` environment mode) to exercise real kernel execution.
//
// The poke/peek interface (`inc` poke, `[%state 0]` peek) matches the bundled counter
// kernel test-ker.jam; the same harness runs any kernel exposing that interface. Mirrors
// crates/nockapp/tests/integration.rs::test_sync_peek_and_poke (the canonical offline
// poke/peek example).
//
// Usage: nockapp-run [POKES]    (POKES defaults to 3)
// Exit 0 iff the peeked state equals POKES.

use nockapp::noun::slab::NounSlab;
use nockapp::test::setup_nockapp;
use nockapp::wire::{SystemWire, Wire};
use nockvm::noun::{Noun, NounAllocator, D};
use nockvm_macros::tas;

fn main() {
    let pokes: u64 = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(3);

    // The kernel serf runs on this runtime; keep `rt` alive for the program's lifetime.
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)
        .enable_all()
        .build()
        .expect("failed to build tokio runtime");

    // Loading is async; run it on the runtime.
    let (_temp, mut nockapp) = rt.block_on(setup_nockapp("test-ker.jam"));

    // poke_sync/peek_sync block on the serf channel internally, so they must run OUTSIDE
    // an async context — i.e. from this (non-worker) main thread, not inside rt.block_on.

    // Apply N real `inc` pokes — each is a genuine NockVM kernel state transition.
    for _ in 0..pokes {
        let mut poke = NounSlab::new();
        poke.set_root(D(tas!(b"inc")));
        let wire = SystemWire.to_wire();
        nockapp
            .poke_sync(wire, poke)
            .unwrap_or_else(|err| panic!("poke_sync failed: {err:?}"));
    }

    // Peek the kernel state: result is `[~ ~ %0 val]`; val sits at slot 15.
    let peek: NounSlab = [D(tas!(b"state")), D(0)].into();
    let res = nockapp
        .peek_sync(peek)
        .unwrap_or_else(|err| panic!("peek_sync failed: {err:?}"));

    let space = res.noun_space();
    let root = unsafe { *res.root() };
    let val: Noun = root
        .in_space(&space)
        .slot(15)
        .map(|handle| handle.noun())
        .unwrap_or_else(|err| panic!("peek result slot 15 failed: {err:?}"));

    let matches = unsafe { val.raw_equals(&D(pokes)) };
    println!(
        "nockapp-run: kernel=test-ker.jam pokes={pokes} peeked-state-matches-expected={matches}"
    );
    if !matches {
        eprintln!("nockapp-run: state mismatch (expected {pokes})");
        std::process::exit(1);
    }
}
