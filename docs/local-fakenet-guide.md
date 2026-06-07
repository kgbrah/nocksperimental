# Running a fixture against a real `nockchain --fakenet` node

Most fixtures run in `mock-fakenet` mode — deterministic, no infrastructure. A fixture in
`local-fakenet` mode instead drives **real** probes against a running Nockchain fakenet
node: a TCP/gRPC reachability check, and command-backed `balance`/`chain`/`peek`/`poke`
adapters whose stdout is parsed and asserted. This guide is the end-to-end flow for the
reference demo fixture `fixtures/real-fakenet-demo.lab.json`.

The same fixture format spans both modes — only `environment.mode` and the adapter
commands change — so the path from a mock fixture to a real-node fixture is structural,
not a rewrite.

## Prerequisites

- A local Nockchain checkout, built (`make install`), with `fakenock` on your `PATH`.
- A running fakenet node listening on the gRPC endpoint in the fixture
  (`environment.grpcEndpoint`, default `127.0.0.1:5555`).
- On Windows, run inside WSL (or any shell where `fakenock` resolves).

## Flow

```bash
# 1. Clone + build Nockchain (one time)
git clone https://github.com/nockchain/nockchain && cd nockchain && make install

# 2. Start a fakenet node (leave running)
bash scripts/run_nockchain_node_fakenet.sh        # or your node's fakenet launcher

# 3. From this repo, run the demo fixture against the live node
npm run lab:local:demo
# == npx nocklab fixtures/real-fakenet-demo.lab.json --strict
```

The report (`.nocklab/real-fakenet-demo.report.{json,md}`) shows: the TCP reachability +
latency of the gRPC listener, the parsed wallet balance and chain metadata, the
stdout/exit-code of each command-backed peek/poke adapter, and the invariant results.

## What is verified offline vs. what needs a live node

| Verified WITHOUT a node (mock / unit-tested) | Requires a LIVE node |
|---|---|
| Fixture schema validity, invariant evaluation, report shape | Real TCP connect to the gRPC listener |
| Adapter command signature parsing, exit-code handling, stdout-regex matching, timeouts | Real `fakenock` output (balance/chain values) |
| Balance/chain metadata parsing logic (regex over sample output) | State transitions from an actual poke/peek |

Without a node, the reachability/adapter steps report **unreachable** rather than passing
— run `lab:local:demo` without `--strict` to inspect the (expected) unreachable result.
The deterministic parts above are covered by the standard `npm test` suite, so the demo's
*logic* is CI-verified even though the *live run* is operator-driven.

## Handoff: proving the real run

To fully earn the "real execution" star, capture a live run on a machine with a fakenet
node (a recorded terminal session or screencast of `npm run lab:local:demo` showing real
balance/chain values and green adapter results). That artifact is the one piece this
environment can't produce, since it has no Nockchain node.

## Next: full kernel execution

`local-fakenet` exercises a *running* node from the outside. Driving a NockApp's actual
Hoon/Jock kernel through the lab (compile → load into NockVM → poke → assert) is the next
milestone — see [`docs/kernel-integration-design.md`](./kernel-integration-design.md).
