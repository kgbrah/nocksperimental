# Nockchain Rust Architecture Notes

Updated: 2026-06-06

## Why This Exists

Nocksperimental needs to act like a serious Nockchain testing and evidence surface, not a generic lab runner with Nock branding. That means our product assumptions should track current Nockchain protocol authority, Rust crate boundaries, fakenet behavior, wallet/API behavior, PMA state handling, and upstream release cadence.

Primary upstream sources:

- https://github.com/nockchain/nockchain
- https://github.com/zorp-corp
- https://github.com/nockchain/nockchain/blob/master/START_HERE.md
- https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md
- https://github.com/nockchain/nockchain/blob/master/ARCHITECTURE.md
- https://github.com/nockchain/nockchain/blob/master/WORKFLOWS.md

## Current Upstream Snapshot

Latest scanned canonical Nockchain commit:

- `33ba97b1e206`
- Message: `bridge: add end-to-end withdrawal execution (#127)`
- Date: 2026-06-05
- Release: `build-33ba97b1e206dd89b15c61b72b7802caf2136c18`

This commit matters for Nocksperimental because bridge withdrawal execution is now represented by the latest public build release. Receipts that claim bridge settlement, VESL/x402 payout behavior, or fakenet withdrawal coverage need to record commit/build provenance, sequencer authorization state, proposal hashes, blockchain constants source, journal mirroring, and confirmed inclusion separately.

Recent high-signal upstream changes:

- `33ba97b1e206`: end-to-end bridge withdrawal execution, sequencer authorization, submission, confirmation polling, and withdrawal journal persistence.
- `5d022ced5504`: behind-tip gossip suppression that affects fakenet/mining interpretation.
- `2601509be0da`: Nous protocol upgrade.
- `0787a54906e0`: PMA dynamic growth, libp2p IP-level exclusion, bridge operator tooling.
- `1cbd470b0c08`: kernel-state migration and gRPC IP blocklist work.
- `334b8fc58121`: first public PMA release.
- `1a23ccdabf3f`: state-jam/checkpoint decode hardening and stack-size diagnostics.

Open upstream work to keep watching:

- nockup template and run UX hardening.
- `NockApp::export_state` public API.
- wallet blob/memo transaction support.
- Nockchain benchmarking.
- AI PoW / AI compute network exploration.

## Documentation Authority Model

Nockchain now has a docs trust contract. Treat it as product-critical.

Tier 0 canonical spine:

- `START_HERE.md`
- `PROTOCOL.md`
- `ARCHITECTURE.md`
- `WORKFLOWS.md`
- `DECISIONS/README.md`

Tier 0 protocol authority is `PROTOCOL.md` plus versioned specs in `changelog/protocol/`.

Scoped Tier 1 satellites currently include:

- `crates/nockapp/README.md` for NockApp runtime interface usage.
- `crates/nockchain-api/README.md` for public API runtime/deployment guidance.
- `crates/nockchain-wallet/README.md` for wallet CLI behavior and operations.

Implication: Nocksperimental should not encode protocol claims from old READMEs, old Zorp repos, or remembered CLI behavior unless the Tier 0 spine or scoped Tier 1 docs support it.

## Protocol Track

Latest scanned `PROTOCOL.md` index:

- `014-aletheia`: draft, version `0.1.14`, activation height `65500`.
- `013-nous`: final, version `1.0.0`, target `2026-Q2`, rollout-gated with `activation_height = 0`.
- `012-bythos`: final, version `0.1.11`, activation height `54000`.

Nocksperimental receipts should eventually include:

- Nockchain commit/build.
- Protocol track/spec name.
- Activation height/target if known.
- Whether the test was run on mainnet, testnet, fakenet, or a local dev chain.

## Rust Workspace Taxonomy

The upstream Rust workspace is a protocol monorepo, not one binary.

Chain/runtime:

- `crates/nockchain`
- `crates/nockchain-types`
- `crates/nockchain-libp2p-io`
- `crates/nockchain-math`
- `crates/nockchain-testkit`
- `crates/nockchain-e2e`

APIs and operator tools:

- `crates/nockchain-api`
- `crates/nockchain-wallet`
- `crates/nockchain-peek`
- `crates/nockchain-explorer-tui`
- `crates/raw-tx-checker`
- `crates/wallet-tx-builder`

NockApp/NockVM:

- `crates/nockapp`
- `crates/nockapp-grpc`
- `crates/nockapp-grpc-proto`
- `crates/nockvm/rust/nockvm`
- `crates/nockvm/rust/nockvm_macros`
- `crates/nockvm/rust/ibig`
- `crates/nockvm/rust/murmur3`

Hoon, kernels, and scaffolding:

- `crates/hoon`
- `crates/hoonc`
- `crates/kernels`
- `crates/nockup`

Bridge and proof-adjacent:

- `crates/bridge`
- `crates/bridge-dev`
- `crates/nockchain-bridge-sequencer`
- `crates/zkvm-jetpack`
- `crates/equix-latency`

Serialization/support:

- `crates/noun-serde`
- `crates/noun-serde-derive`
- `crates/habit`
- `crates/chaff`

## Rust Validation Gates

Prefer narrow checks before full workspace checks:

```bash
cargo check -p nockchain
cargo check -p nockapp
cargo check -p nockchain-wallet
cargo test -p <crate> --release
cargo fmt --check
cargo clippy --all-targets -- -Dclippy::unwrap_used -Aclippy::missing_safety_doc
```

Upstream `Makefile` gates to know:

- `make build-rust`
- `make test`
- `make fmt`
- `make check-cargo-fmt`
- `make clippy`
- `make lint-local`
- `make docs-check`
- `make install-hoonc`
- `make install-nockchain`
- `make install-nockchain-wallet`
- `make install-nockchain-peek`

## Operational Scripts

Current upstream scripts:

- `scripts/run_nockchain_node.sh`
- `scripts/run_nockchain_miner.sh`
- `scripts/run_nockchain_node_fakenet.sh`
- `scripts/run_nockchain_miner_fakenet.sh`
- `scripts/watch-event-log.sh`
- `scripts/block-poke-times.sh`
- `scripts/poke-times.sh`
- `scripts/docs/check_docs_metadata.sh`
- `scripts/docs/check_canonical_links.sh`
- `scripts/docs/check_nous_validation_entrypoints.sh`

Nocksperimental should treat these scripts as upstream command source for local node/miner/fakenet helper UX.

## NockApp Runtime Model

`crates/nockapp/README.md` is Tier 1 canonical for runtime interface usage. The core framing:

- NockApps are pure-functional state machines with automatic persistence and modular IO.
- `nockapp` provides the minimal Rust interface to a Nock kernel.
- Runtime interaction centers on `Kernel`, `poke()`, `peek()`, and effects.
- `hoonc` compiles Hoon to Nock in batch mode for developer and CI workflows.

Nocksperimental should align lab reports to this model:

- `poke` steps are state transitions.
- `peek` steps are state inspections.
- effects are first-class evidence.
- receipts should capture kernel/app identity and Nockchain runtime provenance.

## Wallet/API Model

`crates/nockchain-wallet/README.md` is Tier 1 canonical for wallet CLI behavior. Key product implications:

- Wallets can import/export keys and watch-only addresses/pubkeys.
- Watch-only balances sync alongside signing keys.
- Wallet operations can target public API endpoints or private local gRPC.
- Do not echo private keys, seed phrases, exported key material, or raw token material in Nocksperimental outputs.

`crates/nockchain-api/README.md` is Tier 1 canonical for public API runtime/deployment guidance. It explicitly frames the API as alpha/test-grade and warns that public exposure currently lacks auth, authorization, and rate limiting. Nocksperimental should recommend VPN, SSH tunnel, mTLS proxy, private network, or other access control for non-local endpoints.

## PMA And State Jams

PMA is durable local kernel-state storage. It is not a disposable cache, not a consensus artifact, and not a safe raw third-party bootstrap object.

Nocksperimental should store metadata about state artifacts, not the artifacts themselves:

- source URL or Drive folder id
- filename
- size
- hash
- checkpoint height or event boundary
- network
- Nockchain build/commit
- producer identity if known
- import command or supported bootstrap path

Never commit raw PMA slabs, event logs, checkpoints, state jams, wallet exports, or seed material.

## Product Roadmap Implications

Near-term Nocksperimental improvements:

- Add Nockchain upstream build/protocol fields to fakenet and VESL receipts.
- Add fakenet sync/peer/tip diagnostics beside mining and balance tests.
- Add state-jam registry metadata without hosting raw state.
- Add "connect your own fakenet" provenance checks for endpoint, wallet address, network id, sync state, and available peeks.
- Add docs trust warnings when a test assumption comes from a legacy or non-canonical Nockchain doc.

Medium-term improvements:

- Build a Nockchain upstream monitor surface inside the app using the existing automation findings.
- Add a Rust crate map page that helps developers understand which upstream crate a Nocksperimental test touches.
- Add optional receipts for `nockup` project build/run flows.
- Add PMA/state-jam bootstrap diagnostics with explicit safety warnings.
