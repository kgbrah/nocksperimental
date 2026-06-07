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

## Flow (verified)

The commands below are the exact ones used to produce the committed evidence
(`docs/evidence/real-fakenet-demo.report.md`).

```bash
# 1. Build Nockchain once: you need `nockchain` and `nockchain-wallet` on PATH.
git clone https://github.com/nockchain/nockchain && cd nockchain && make install

# 2. Start a FRESH fakenet node and leave it running. Two gotchas worth knowing:
#    - Do NOT reuse a data dir that was created for mainnet — booting mainnet data
#      with --fakenet panics ("attempted to boot mainnet node with fakenet flag").
#      Use --new with a dedicated --data-dir so you never touch your mainnet data.
#    - The default file-backed PMA is large; on a space/quota-limited disk add
#      --ephemeral (in-memory state) to avoid "Disk quota exceeded" on snapshot build.
nockchain --new --fakenet --ephemeral --data-dir /tmp/nock-fakenet-demo \
  --bind-public-grpc-addr 127.0.0.1:5555 --bind /ip4/127.0.0.1/udp/3006/quic-v1
#    (scripts/run_nockchain_node_fakenet.sh wraps the same flags but reuses
#     ./.data.nockchain and the durable PMA — fine on a clean fakenet box.)

# 3. Sanity-check the node from the wallet (optional):
nockchain-wallet show-balance --public-grpc-server-addr 127.0.0.1:5555

# 4. From THIS repo, run the demo fixture against the live node:
npm run lab:local:demo
# == npx nocklab fixtures/real-fakenet-demo.lab.json --strict
```

Node-backed adapter commands (like `nockchain-wallet`) take several seconds to boot and
connect, so the adapter command timeout defaults to 15s and is overridable per step via
`adapter.timeoutMs` (the demo sets `20000`). Raise it if your node is slow to respond.

The report (`.nocklab/real-fakenet-demo.report.{json,md}`) shows the TCP reachability of
the gRPC listener and the stdout/exit-code of the `nockchain-wallet show-balance` peek
adapter (which logs `Connected to public NockApp gRPC server endpoint=http://127.0.0.1:5555`).

## What is verified offline vs. what needs a live node

| Verified WITHOUT a node (mock / unit-tested) | Requires a LIVE node |
|---|---|
| Fixture schema validity, invariant evaluation, report shape | Real TCP connect to the gRPC listener |
| Adapter command signature parsing, exit-code handling, stdout-substring matching, timeouts | Real `nockchain-wallet` output (balance, sync state) |
| The mock → local-fakenet fixture format itself | A real state transition from a funded poke (needs a mined/funded wallet) |

Without a node, the reachability/adapter steps report **unreachable** rather than passing
— run `lab:local:demo` without `--strict` to inspect the (expected) unreachable result.
The deterministic parts above are covered by the standard `npm test` suite, so the demo's
*logic* is CI-verified even though the *live run* is operator-driven.

## Evidence (a real run)

`docs/evidence/real-fakenet-demo.report.md` is a committed report from an actual run
against a live `nockchain --fakenet` node: `Status: pass`, both steps green —
`probe-health` (TCP reachable at 127.0.0.1:5555) and `peek-balance`
(`nockchain-wallet show-balance` connected to the node's public gRPC server and returned
`Wallet Balance … at height 0`). Balance is `0 nicks` because it is a fresh ephemeral
fakenet with no mining; to demonstrate a funded balance, also run
`scripts/run_nockchain_miner_fakenet.sh` against the node before the peek.

## Handoff: proving the real run

To fully earn the "real execution" star, capture a live run on a machine with a fakenet
node (a recorded terminal session or screencast of `npm run lab:local:demo` showing real
balance/chain values and green adapter results). That artifact is the one piece this
environment can't produce, since it has no Nockchain node.

## Next: full kernel execution

`local-fakenet` exercises a *running* node from the outside. Driving a NockApp's actual
Hoon/Jock kernel through the lab (compile → load into NockVM → poke → assert) is the next
milestone — see [`docs/kernel-integration-design.md`](./kernel-integration-design.md).
