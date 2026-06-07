# Kernel Poke/Peek (counter) Lab Report

- Report: lab_kernel-poke-peek-v0_20260607200107903
- Fixture: kernel-poke-peek-v0
- Status: pass
- Steps: 1 passed, 0 failed
- Invariants: 1 passed, 0 failed
- Alerts: 0 clear, 0 triggered
- Snapshots: 2

## Steps

- PASS poke-peek-counter: kernel adapter nockapp-run 3 succeeded: nockapp-run: kernel=test-ker.jam pokes=3 peeked-state-matches-expected=true (kernel state equals 3 after 3 inc pokes (real poke -> peek, no node)); 7b9b7d0aea58cf38 -> 7b9b7d0aea58cf38

## Invariants

- PASS expected-state-pinned: 3 expected 3 <= expectedState <= 3

## Alerts

- No alert policies configured.

## Adapter Observations

- No adapter observations captured.

## State Diffs


## Snapshot Timeline

- Initial state: 7b9b7d0aea58cf38
- After poke-peek-counter: 7b9b7d0aea58cf38

