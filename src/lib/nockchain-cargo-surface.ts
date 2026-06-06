import { createHash } from "node:crypto";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const workspaceManifestPaths = [
  "crates/bridge/Cargo.toml",
  "crates/bridge-dev/Cargo.toml",
  "crates/equix-latency/Cargo.toml",
  "crates/habit/Cargo.toml",
  "crates/hoon/Cargo.toml",
  "crates/hoonc/Cargo.toml",
  "crates/kernels/Cargo.toml",
  "crates/kernels/bridge/Cargo.toml",
  "crates/kernels/dumb/Cargo.toml",
  "crates/kernels/miner/Cargo.toml",
  "crates/kernels/nockchain-peek/Cargo.toml",
  "crates/kernels/wallet/Cargo.toml",
  "crates/nockapp/Cargo.toml",
  "crates/nockapp-grpc/Cargo.toml",
  "crates/nockapp-grpc-proto/Cargo.toml",
  "crates/nockchain/Cargo.toml",
  "crates/nockchain-api/Cargo.toml",
  "crates/nockchain-bridge-sequencer/Cargo.toml",
  "crates/nockchain-e2e/Cargo.toml",
  "crates/nockchain-explorer-tui/Cargo.toml",
  "crates/nockchain-libp2p-io/Cargo.toml",
  "crates/nockchain-math/Cargo.toml",
  "crates/nockchain-peek/Cargo.toml",
  "crates/nockchain-testkit/Cargo.toml",
  "crates/nockchain-types/Cargo.toml",
  "crates/nockchain-wallet/Cargo.toml",
  "crates/nockup/Cargo.toml",
  "crates/nockvm/rust/ibig/Cargo.toml",
  "crates/nockvm/rust/murmur3/Cargo.toml",
  "crates/nockvm/rust/nockvm/Cargo.toml",
  "crates/nockvm/rust/nockvm_macros/Cargo.toml",
  "crates/noun-serde/Cargo.toml",
  "crates/noun-serde-derive/Cargo.toml",
  "crates/raw-tx-checker/Cargo.toml",
  "crates/wallet-tx-builder/Cargo.toml",
  "crates/zkvm-jetpack/Cargo.toml"
] as const;

const crateManifestSnapshots = [
  {
    path: "crates/bridge/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/bridge/Cargo.toml",
    sha256: "5936471456fb077e81f145717eff805c24b72533820a33a502fbf62c740d6833",
    bytes: 2171
  },
  {
    path: "crates/bridge-dev/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/bridge-dev/Cargo.toml",
    sha256: "26daee1c5a2565552ebff4d72611aa0382208edd14d90b3e76326e9fe3982334",
    bytes: 991
  },
  {
    path: "crates/equix-latency/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/equix-latency/Cargo.toml",
    sha256: "d15b62ee9be0800e5abc54249aad829150e2359abf96cf1613bf0bccbef0781e",
    bytes: 152
  },
  {
    path: "crates/habit/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/habit/Cargo.toml",
    sha256: "6b4a3416b75aa4b83e625dbd69b109dd0a13d6a0d16fbdc430cf85a9580315fe",
    bytes: 178
  },
  {
    path: "crates/hoon/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/hoon/Cargo.toml",
    sha256: "15e421eea32c7de5b406ed7b246f046c312d3f2400430c509d4609e0e1ae778d",
    bytes: 319
  },
  {
    path: "crates/hoonc/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/hoonc/Cargo.toml",
    sha256: "c7ed6870fb4e21ed8d290b1e1beea6c2e486bdcfdbd2a925963ab07a794f2679",
    bytes: 943
  },
  {
    path: "crates/kernels/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/Cargo.toml",
    sha256: "c0ca41d888b512fa0e44135e27cbf6406b9679b6cf00eac58ae087bc371472e9",
    bytes: 218
  },
  {
    path: "crates/kernels/bridge/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/bridge/Cargo.toml",
    sha256: "07cf056b4b91b24fe663edf3452a7f3682d2add63d264ce642a6034b6c78b209",
    bytes: 135
  },
  {
    path: "crates/kernels/dumb/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/dumb/Cargo.toml",
    sha256: "6e37d18b9d8f09c859534e7749598a28637141436c120327a1b6db25cde89f60",
    bytes: 133
  },
  {
    path: "crates/kernels/miner/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/miner/Cargo.toml",
    sha256: "d0b88004d141a8c4a3aef848a8ae44398b16eb20c3712a27d1c9607d7e393eb1",
    bytes: 134
  },
  {
    path: "crates/kernels/nockchain-peek/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/nockchain-peek/Cargo.toml",
    sha256: "9b1af1095b35904b87712c7d9b330323f95cf3b60e7807818eeb685e105090b1",
    bytes: 143
  },
  {
    path: "crates/kernels/wallet/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/kernels/wallet/Cargo.toml",
    sha256: "a72f087632b2535b8bfef15adf853426349e5e117b218c6de26ed7490557ccb7",
    bytes: 135
  },
  {
    path: "crates/nockapp/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockapp/Cargo.toml",
    sha256: "606cfca0d12b1741165c56b63a789ba0456ce5fb38ffdcb9d270509e9e2ca442",
    bytes: 2474
  },
  {
    path: "crates/nockapp-grpc/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockapp-grpc/Cargo.toml",
    sha256: "4effabb8d3b40f84c59481146afc1108f52d7f4871b6ec7542685972577d0f22",
    bytes: 1545
  },
  {
    path: "crates/nockapp-grpc-proto/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockapp-grpc-proto/Cargo.toml",
    sha256: "23ba0b7f571bc69f9617e83fadeb1bbcda18f925a791ac8f06615696209d600a",
    bytes: 689
  },
  {
    path: "crates/nockchain/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain/Cargo.toml",
    sha256: "1eb966321bec38e0c3d4ffa052d75a14c0a3328b4dee6706fb38fab80a5a1b27",
    bytes: 1488
  },
  {
    path: "crates/nockchain-api/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-api/Cargo.toml",
    sha256: "c1a47b0ab4890a208e82edf9210eb2c2c94fb2c951c90edd22f2482bf7d77da6",
    bytes: 964
  },
  {
    path: "crates/nockchain-bridge-sequencer/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-bridge-sequencer/Cargo.toml",
    sha256: "a7506330525a3d3d6220968dfa61761ed9a21e1b0e12a305314b12e58a552908",
    bytes: 551
  },
  {
    path: "crates/nockchain-e2e/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-e2e/Cargo.toml",
    sha256: "48a233c888d7ef9fb11d2c00c04bef2a81ccbbf4cb8f9a2a8cd65394b78c4d02",
    bytes: 747
  },
  {
    path: "crates/nockchain-explorer-tui/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-explorer-tui/Cargo.toml",
    sha256: "9a8be4ebfaf35e60b7f30d8bf747bf98f55399280e34c6704620673c7ad4c035",
    bytes: 727
  },
  {
    path: "crates/nockchain-libp2p-io/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-libp2p-io/Cargo.toml",
    sha256: "6bd30a9547e2cb55f45d3d0cadd32236ffd9b377026b46e67ad8100060095982",
    bytes: 1737
  },
  {
    path: "crates/nockchain-math/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-math/Cargo.toml",
    sha256: "ca200009b1d002a2bb442eee5b7a0a9e723c21f76a124df28c78d7835a742298",
    bytes: 611
  },
  {
    path: "crates/nockchain-peek/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-peek/Cargo.toml",
    sha256: "b40ed55c4b807ef0f825004861cc60738fa14b61417bfb2bbed15743a8aeda1f",
    bytes: 453
  },
  {
    path: "crates/nockchain-testkit/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-testkit/Cargo.toml",
    sha256: "0127c88c3a323751ef25724936acdbf255f0058c4a4035ad59464981dc7bc6bd",
    bytes: 240
  },
  {
    path: "crates/nockchain-types/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-types/Cargo.toml",
    sha256: "8a7b0121856aa52db8e5487ace5737db0f92c86bb892cc4461e2e88566c35402",
    bytes: 712
  },
  {
    path: "crates/nockchain-wallet/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockchain-wallet/Cargo.toml",
    sha256: "2792027e73adef88737cedbe3ffbe093d64f070580151d3823406051346fc32b",
    bytes: 1035
  },
  {
    path: "crates/nockup/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockup/Cargo.toml",
    sha256: "d345fd3075bd55ead97b0cb931f445b6d44d5e6a1398f4698c0320067e7540ce",
    bytes: 1695
  },
  {
    path: "crates/nockvm/rust/ibig/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/ibig/Cargo.toml",
    sha256: "8e6e527d153966ee89dc93a83664af6fca1b58a6d08aed6e552e1630e092fad7",
    bytes: 1313
  },
  {
    path: "crates/nockvm/rust/murmur3/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/murmur3/Cargo.toml",
    sha256: "a17c09073bce2b79494bfecbc4a4810fa01ce42b32bba1459c27b68506dc544b",
    bytes: 453
  },
  {
    path: "crates/nockvm/rust/nockvm/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/nockvm/Cargo.toml",
    sha256: "8bfa272e3bbd136ad978f3635255e200cdfb7b70bfd8f1151ea69219af8113c7",
    bytes: 1820
  },
  {
    path: "crates/nockvm/rust/nockvm_macros/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/nockvm/rust/nockvm_macros/Cargo.toml",
    sha256: "09bb5f6304f23a673f570362fec59070db368c0fb941f65721e1f0d40ee0453b",
    bytes: 183
  },
  {
    path: "crates/noun-serde/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/noun-serde/Cargo.toml",
    sha256: "eaf779f7611ed656dc4dd62866e4b7285e5d5f93bacf7a61ea69737c7b920292",
    bytes: 267
  },
  {
    path: "crates/noun-serde-derive/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/noun-serde-derive/Cargo.toml",
    sha256: "137e39730b08607af971287654d46a290e9c3d19f8f2eac7b3aad52d782f3003",
    bytes: 415
  },
  {
    path: "crates/raw-tx-checker/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/raw-tx-checker/Cargo.toml",
    sha256: "34f23c76be01a880fa30ed3cd198c565e891324bb44a00d81b434c18a7121abf",
    bytes: 404
  },
  {
    path: "crates/wallet-tx-builder/Cargo.toml",
    rawUrl:
      "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/wallet-tx-builder/Cargo.toml",
    sha256: "92c5b9de43b158c934be3882a14054ae97fc742534cb97b7a4400cadc183f1f7",
    bytes: 336
  },
  {
    path: "crates/zkvm-jetpack/Cargo.toml",
    rawUrl: "https://raw.githubusercontent.com/nockchain/nockchain/master/crates/zkvm-jetpack/Cargo.toml",
    sha256: "d8236dc7d6d8b349e32d6f8a9c0bf5c7def67a0e24e6bcb9812e257b4be65b7e",
    bytes: 646
  }
] as const;

const crateManifestDriftCheck = {
  command: "npm run check:nockchain-cargo-manifests-drift -- --json",
  script: "scripts/check-nockchain-cargo-manifests-drift.mjs",
  testCommand: "npm run test:nockchain-cargo-manifests-drift-check",
  sourceUrls: [
    "https://raw.githubusercontent.com/nockchain/nockchain/master/Cargo.toml",
    "https://github.com/nockchain/nockchain/tree/master/crates"
  ],
  compareFields: ["manifestPaths", "manifestSha256", "manifestBytes", "manifestCatalogHash"],
  interpretation:
    "Compares every pinned Nockchain crate Cargo.toml hash and byte count against upstream master before crate-level roles, dependencies, targets, or evidence contracts become receipt authority."
} as const;

const cargoCrates = [
  {
    name: "nockchain",
    manifestPath: "crates/nockchain/Cargo.toml",
    role: "Primary node/miner runtime and chain-facing binary.",
    riskPosture:
      "Consensus/runtime assumptions must include commit, release, protocol track, peer/tip context, and script provenance.",
    targets: [
      { name: "nockchain", kind: "bin", source: "src/main.rs" },
      {
        name: "bench_nockchain_checkpoint_block",
        kind: "bench",
        source: "src/bin/bench_nockchain_checkpoint_block.rs"
      },
      { name: "bench_nockchain_kernel", kind: "bench", source: "src/bin/bench_nockchain_kernel.rs" }
    ],
    features: ["bazel_build", "jemalloc", "tracing-heap"],
    dependencies: [
      "chaff",
      "equix",
      "kernels-open-dumb",
      "kernels-open-miner",
      "libp2p",
      "nockapp",
      "nockapp-grpc",
      "nockchain-libp2p-io",
      "nockchain-math",
      "nockchain-types",
      "nockvm",
      "zkvm-jetpack"
    ],
    sourceFocus: [
      "crates/nockchain/src/main.rs",
      "crates/nockchain/src/mining.rs",
      "crates/nockchain/src/config.rs",
      "crates/nockchain/src/setup.rs"
    ],
    primaryCheck: "cargo check -p nockchain",
    nocksperimentalUse:
      "Anchor fakenet node/miner receipts, block-commitment diagnostics, and protocol-sensitive runtime failures."
  },
  {
    name: "nockchain-wallet",
    manifestPath: "crates/nockchain-wallet/Cargo.toml",
    role: "Wallet CLI for keys, watch-only state, note listing, and transaction creation.",
    riskPosture:
      "Wallet evidence must never include seed phrases or private keys and must record endpoint mode, address, command, output hash, commit, and build.",
    targets: [{ name: "nockchain-wallet", kind: "bin", source: "src/main.rs" }],
    features: [],
    dependencies: [
      "kernels-open-wallet",
      "nockapp",
      "nockapp-grpc",
      "nockchain-math",
      "nockchain-types",
      "nockvm",
      "wallet-tx-builder",
      "zkvm-jetpack"
    ],
    sourceFocus: [
      "crates/nockchain-wallet/src/command.rs",
      "crates/nockchain-wallet/src/connection.rs",
      "crates/nockchain-wallet/src/create_tx.rs",
      "crates/nockchain-wallet/src/recipient.rs"
    ],
    primaryCheck: "cargo check -p nockchain-wallet",
    nocksperimentalUse:
      "Ground balance, note, blob/memo, watch-only, and send-tx receipts in the upstream wallet command surface."
  },
  {
    name: "nockchain-api",
    manifestPath: "crates/nockchain-api/Cargo.toml",
    role: "Public gRPC API binary that boots NockApp runtime over a Nockchain kernel.",
    riskPosture:
      "alpha/test-grade public API; do not expose directly without access control, observability, and rate-limit posture.",
    targets: [
      { name: "nockchain-api", kind: "bin", source: "src/main.rs" },
      { name: "peek_refresh", kind: "bench", source: "benches/peek_refresh.rs" }
    ],
    features: ["default", "malloc", "tracing-heap"],
    dependencies: ["chaff", "kernels-open-dumb", "nockapp", "nockchain", "nockvm", "zkvm-jetpack"],
    sourceFocus: ["crates/nockchain-api/src/main.rs"],
    primaryCheck: "cargo check -p nockchain-api",
    nocksperimentalUse:
      "Separate public API cache/warm-up/reorg evidence from private local gRPC wallet and peek evidence."
  },
  {
    name: "nockapp",
    manifestPath: "crates/nockapp/Cargo.toml",
    role: "NockApp runtime library for kernel boot, poke/peek, drivers, persistence, event logs, and PMA-backed state.",
    riskPosture:
      "Runtime behavior changes can alter evidence meaning; source traces need exact commit, PMA policy, and receipt field mapping.",
    targets: [
      { name: "nockapp", kind: "lib", source: "src/lib.rs" },
      {
        name: "nockapp-chkjam-to-state-jam",
        kind: "bin",
        source: "src/bin/nockapp-chkjam-to-state-jam.rs"
      }
    ],
    features: [
      "default",
      "slog-tracing",
      "tracing-tracy",
      "trait-alias",
      "bazel_build",
      "pma-assert"
    ],
    dependencies: [
      "anyhow",
      "axum",
      "bincode",
      "blake3",
      "diesel",
      "gnort",
      "nockvm",
      "noun-serde",
      "opentelemetry",
      "tokio",
      "tonic"
    ],
    sourceFocus: [
      "crates/nockapp/src/lib.rs",
      "crates/nockapp/src/event_log.rs",
      "crates/nockapp/src/nockapp/export.rs",
      "crates/nockapp/src/nockapp/save.rs",
      "crates/nockapp/src/snapshot.rs"
    ],
    primaryCheck: "cargo check -p nockapp",
    nocksperimentalUse:
      "Explain poke/peek receipts, state export, PMA safety, event-log boundaries, and NockApp lab runner assumptions."
  },
  {
    name: "nockup",
    manifestPath: "crates/nockup/Cargo.toml",
    role: "Developer support CLI for NockApp project scaffolding, build/run flows, package management, and validation.",
    riskPosture:
      "Template, manifest, install-path, and run UX changes are active PR watch items and should be pinned before publishing scaffold receipts.",
    targets: [{ name: "nockup", kind: "bin", source: "src/main.rs" }],
    features: ["vendored-openssl"],
    dependencies: [
      "anyhow",
      "blake3",
      "chrono",
      "clap",
      "handlebars",
      "reqwest",
      "serde",
      "tar",
      "tokio",
      "toml"
    ],
    sourceFocus: [
      "crates/nockup/src/main.rs",
      "crates/nockup/src/cli.rs",
      "crates/nockup/src/manifest.rs",
      "crates/nockup/src/validation.rs",
      "crates/nockup/src/resolver/engine.rs"
    ],
    primaryCheck: "cargo check -p nockup",
    nocksperimentalUse:
      "Drive scaffold validation receipts, template manifest provenance, and nockup build/run evidence."
  },
  {
    name: "nockchain-bridge-sequencer",
    manifestPath: "crates/nockchain-bridge-sequencer/Cargo.toml",
    role: "Bridge sequencer service for authorization, submission, confirmation, and journaled settlement surfaces.",
    riskPosture:
      "Sequencer evidence is high-signal for bridge/settlement receipts; record config, proposal hash, journal identity, chain context, and commit.",
    targets: [{ name: "nockchain-bridge-sequencer", kind: "bin", source: "src/main.rs" }],
    features: ["default", "jemalloc", "tracing-heap"],
    dependencies: ["bridge", "nockapp", "nockchain", "nockvm", "tokio", "zkvm-jetpack"],
    sourceFocus: ["crates/nockchain-bridge-sequencer/src/main.rs"],
    primaryCheck: "cargo check -p nockchain-bridge-sequencer",
    nocksperimentalUse:
      "Attach sequencer lifecycle and journal provenance to bridge withdrawal and settlement evidence."
  },
  {
    name: "wallet-tx-builder",
    manifestPath: "crates/wallet-tx-builder/Cargo.toml",
    role: "Wallet transaction planner for fees, word count, lock resolution, determinism, note data, and withdrawal building.",
    riskPosture:
      "Transaction-builder drift can alter fees, memo/blob behavior, withdrawal payloads, and wallet evidence shape.",
    targets: [{ name: "wallet-tx-builder", kind: "lib", source: "src/lib.rs" }],
    features: [],
    dependencies: [
      "bytes",
      "nockapp",
      "nockchain-math",
      "nockchain-types",
      "nockvm",
      "noun-serde",
      "thiserror",
      "tracing"
    ],
    sourceFocus: [
      "crates/wallet-tx-builder/src/planner.rs",
      "crates/wallet-tx-builder/src/determinism.rs",
      "crates/wallet-tx-builder/src/fee.rs",
      "crates/wallet-tx-builder/src/lock_resolver.rs",
      "crates/wallet-tx-builder/src/word_count.rs"
    ],
    primaryCheck: "cargo check -p wallet-tx-builder",
    nocksperimentalUse:
      "Tie wallet and bridge withdrawal receipts to the exact planner, fee, lock, and determinism surfaces upstream uses."
  },
  {
    name: "nockchain-libp2p-io",
    manifestPath: "crates/nockchain-libp2p-io/Cargo.toml",
    role: "libp2p networking, catch-up, peer IO, routing, metrics, and gossip behavior.",
    riskPosture:
      "Peer/routing/gossip changes directly affect fakenet wrong-commitment, no-peers, and behind-tip triage.",
    targets: [{ name: "nockchain-libp2p-io", kind: "lib", source: "src/lib.rs" }],
    features: [],
    dependencies: [
      "async-trait",
      "cbor4ii",
      "dashmap",
      "equix",
      "gnort",
      "libp2p",
      "nockapp",
      "nockvm",
      "noun-serde",
      "tokio"
    ],
    sourceFocus: [
      "crates/nockchain-libp2p-io/src/catch_up.rs",
      "crates/nockchain-libp2p-io/src/p2p_state.rs",
      "crates/nockchain-libp2p-io/src/driver.rs",
      "crates/nockchain-libp2p-io/src/driver/gen2/routing.rs",
      "crates/nockchain-libp2p-io/src/metrics.rs"
    ],
    primaryCheck: "cargo check -p nockchain-libp2p-io",
    nocksperimentalUse:
      "Ground sync/gossip diagnostics, route-table receipts, peer-count evidence, and behind-tip suppression interpretation."
  },
  {
    name: "nockvm",
    manifestPath: "crates/nockvm/rust/nockvm/Cargo.toml",
    role: "Rust NockVM and PMA runtime implementation.",
    riskPosture:
      "PMA and NockVM changes affect durability, memory mapping, state export/import, and replay assumptions; do not store raw slabs.",
    targets: [
      { name: "nockvm", kind: "lib", source: "src/lib.rs" },
      { name: "hoonc_hotspots", kind: "bench", source: "benches/hoonc_hotspots.rs" },
      { name: "pma_growth", kind: "bench", source: "benches/pma_growth.rs" },
      { name: "retag_noun_tree", kind: "bench", source: "benches/retag_noun_tree.rs" }
    ],
    features: [
      "default",
      "mmap",
      "malloc",
      "pma-assert",
      "check_all",
      "check_acyclic",
      "check_forwarding",
      "check_junior",
      "no_check_oom"
    ],
    dependencies: [
      "bincode",
      "bitvec",
      "bytes",
      "ibig",
      "memmap2",
      "murmur3",
      "nockvm_crypto",
      "nockvm_macros",
      "slotmap",
      "smallvec",
      "thiserror"
    ],
    sourceFocus: [
      "crates/nockvm/rust/nockvm/Cargo.toml",
      "crates/nockvm/rust/nockvm/src/lib.rs",
      "crates/nockvm/rust/nockvm/benches/pma_growth.rs"
    ],
    primaryCheck: "cargo check -p nockvm",
    nocksperimentalUse:
      "Explain PMA/state-jam safety, NockVM runtime assumptions, memory mapping, and state replay limitations."
  }
] as const;

const dependencyRiskFamilies = [
  {
    id: "libp2p-sync",
    label: "libp2p sync and routing",
    severity: "high",
    dependencyNames: ["libp2p", "nockchain-libp2p-io"],
    targetSurfaces: ["fakenetEvidence", "nockchainSyncGossipTrace", "nockchainOperationsAtlas"],
    receiptFields: ["peerCount", "routeTableSize", "tipHeight", "blockCommitment"],
    verificationCommands: ["cargo check -p nockchain-libp2p-io", "cargo check -p nockchain"],
    reviewRule:
      "Review peer, route-table, gossip, catch-up, and wrong-commitment diagnostics before trusting fakenet mining evidence."
  },
  {
    id: "wallet-transaction",
    label: "Wallet transaction construction",
    severity: "high",
    dependencyNames: ["nockchain-wallet", "wallet-tx-builder", "nockchain-types", "nockchain-math"],
    targetSurfaces: ["balanceEvidence", "nockchainWalletAtlas", "localFakenetCommands"],
    receiptFields: ["walletAddress", "noteCount", "transactionHash", "memoHash"],
    verificationCommands: ["cargo check -p wallet-tx-builder", "cargo check -p nockchain-wallet"],
    reviewRule:
      "Review wallet planner, fee, lock resolution, memo/blob, and endpoint-mode assumptions before publishing wallet receipts."
  },
  {
    id: "nockapp-pma",
    label: "NockApp runtime and PMA",
    severity: "immediate",
    dependencyNames: ["nockapp", "nockvm", "noun-serde"],
    targetSurfaces: ["nockappEvidence", "stateJamRegistry", "localFakenetEvidence"],
    receiptFields: ["stateJamFingerprint", "pmaPolicy", "eventLogPolicy", "runtimeCommit"],
    verificationCommands: ["cargo check -p nockapp", "cargo check -p nockvm"],
    reviewRule:
      "Review poke/peek, event log, state export, memory mapping, and PMA/state-jam safety before reusing runtime evidence."
  },
  {
    id: "bridge-settlement",
    label: "Bridge settlement and sequencer",
    severity: "immediate",
    dependencyNames: ["bridge", "nockchain-bridge-sequencer", "wallet-tx-builder"],
    targetSurfaces: ["nockchainBridgeTrace", "veslEvidenceBridge", "launchEvidenceReports"],
    receiptFields: ["settlementMode", "proposalHash", "sequencerJournalId", "withdrawalTransactionHash"],
    verificationCommands: ["cargo check -p bridge", "cargo check -p nockchain-bridge-sequencer"],
    reviewRule:
      "Review authorization, proposal, journal, submission, and confirmation semantics before treating bridge receipts as settled."
  },
  {
    id: "zk-proof-compute",
    label: "ZK proof and compute",
    severity: "high",
    dependencyNames: ["zkvm-jetpack", "equix", "equix-latency"],
    targetSurfaces: ["computeBenchmarks", "solverScores", "proofEvidence"],
    receiptFields: ["verificationStatus", "hardwareProfile", "benchmarkDurationMs", "proofArtifactHash"],
    verificationCommands: ["cargo check -p zkvm-jetpack", "cargo check -p equix-latency"],
    reviewRule:
      "Review proof-adjacent and latency crates before converting benchmark or solver output into evidence."
  },
  {
    id: "noun-serialization",
    label: "Noun serialization and verifier payloads",
    severity: "high",
    dependencyNames: ["noun-serde", "noun-serde-derive", "nockchain-types"],
    targetSurfaces: ["receiptVerifiers", "generatedReports", "verificationIndex"],
    receiptFields: ["manifestSha256", "payloadHash", "nounEncoding", "verifierInputHash"],
    verificationCommands: ["cargo check -p noun-serde", "cargo check -p noun-serde-derive"],
    reviewRule:
      "Review noun encoding and derived serialization before changing receipt hashes or verifier payloads."
  }
] as const;

export function createNockchainCargoSurface() {
  const upstream = nockchainUpstreamIntelligence;
  const binaryCrates = cargoCrates
    .filter((crateDetail) => crateDetail.targets.some((target) => target.kind === "bin"))
    .map((crateDetail) => crateDetail.name);
  const libraryCrates = cargoCrates
    .filter((crateDetail) => crateDetail.targets.some((target) => target.kind === "lib"))
    .map((crateDetail) => crateDetail.name);
  const benchmarkTargets = cargoCrates.flatMap((crateDetail) =>
    crateDetail.targets.filter((target) => target.kind === "bench").map((target) => target.name)
  );
  const targetCount = cargoCrates.reduce(
    (count, crateDetail) => count + crateDetail.targets.length,
    0
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/cargo-surface`,
    generatedAt: "2026-06-06T07:25:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease
    },
    workspace: {
      rootManifest: "Cargo.toml",
      resolver: upstream.workspace.resolver,
      memberCount: workspaceManifestPaths.length,
      manifestPaths: workspaceManifestPaths,
      manifestSnapshots: crateManifestSnapshots,
      manifestCatalogHash: createManifestCatalogHash(crateManifestSnapshots),
      manifestDriftCheck: crateManifestDriftCheck
    },
    workspaceDependencyHighlights: {
      libp2p: {
        source: "https://github.com/libp2p/rust-libp2p.git",
        rev: "da0017ee887a868e231ed78c7de892779c17800d",
        features: [
          "ping",
          "kad",
          "identify",
          "quic",
          "tls",
          "dns",
          "tokio",
          "request-response",
          "cbor"
        ]
      },
      snmalloc: {
        source: "https://github.com/litlep-nibbyt/snmalloc.git",
        rev: "060d5b9fa1c5777a52deae8dbdd82da91babf35f",
        features: ["build_cc", "usewait-on-address"]
      }
    },
    dependencyRiskMatrix: createDependencyRiskMatrix(),
    crates: cargoCrates,
    targetSummary: {
      crateCount: cargoCrates.length,
      targetCount,
      binaryCrates,
      libraryCrates,
      benchmarkTargets
    },
    verificationMatrix: {
      requiredCommands: Array.from(new Set(cargoCrates.map((crateDetail) => crateDetail.primaryCheck))),
      escalationCommands: [
        "cargo test -p <crate> --release",
        "cargo fmt --check",
        "cargo clippy --all-targets -- -Dclippy::unwrap_used -Aclippy::missing_safety_doc"
      ],
      availableTooling: [
        "cargo 1.96.0",
        "cargo metadata --no-deps --format-version 1"
      ],
      localLimitations: [
        "$HOME/.cargo/bin must be present on PATH for cargo metadata and crate checks",
        "Full crate checks may still fetch or build upstream dependencies; use scratch upstream checkouts for exploratory checks."
      ]
    },
    evidenceContract: {
      requiredFields: [
        "manifestPath",
        "manifestSha256",
        "targetKind",
        "sourceFocus",
        "primaryCheck",
        "nockchainCommit",
        "nockchainRelease",
        "verificationCommand",
        "verificationStatus"
      ],
      forbiddenFields: [
        "rawPmaSlab",
        "rawStateJam",
        "rawEventLog",
        "walletSeedPhrase",
        "privateSpendKey",
        "sequencerJournalSigningKey"
      ],
      interpretationRules: [
        "Manifest, source presence, and cargo metadata identify Rust surfaces; passing crate checks still requires running the listed cargo gates.",
        "Binary target presence does not prove runtime health; pair it with command output and endpoint evidence.",
        "Bench targets are performance/investigation surfaces, not production proof by themselves."
      ]
    },
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/cargo-surface`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      knowledgeSpine: `${registryCanonicalBaseUrl}/api/nockchain/knowledge-spine`,
      syncGossip: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      wallet: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      nockappSource: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}

function createDependencyRiskMatrix() {
  const families = dependencyRiskFamilies.map((family) => {
    const impactedCrates = collectFamilyCrates(family.dependencyNames);

    return {
      ...family,
      impactedCrates,
      manifestPaths: impactedCrates.flatMap((crateName) => {
        const crateDetail = cargoCrates.find((candidate) => candidate.name === crateName);

        return crateDetail ? [crateDetail.manifestPath] : [];
      })
    };
  });

  return {
    version: "v0",
    source: "nockchain-cargo-surface",
    families,
    highestRiskFamilyIds: families
      .filter((family) => family.severity === "immediate" || family.id === "libp2p-sync")
      .map((family) => family.id),
    reviewTriggers: [
      "Any crate manifest drift in npm run check:nockchain-cargo-manifests-drift -- --json",
      "Any dependency, feature, target, or source-focus change in a high-signal crate",
      "Any receipt, verifier, fakenet, wallet, bridge, PMA, or compute surface that cites an affected crate"
    ],
    forbiddenFields: [
      "rawPmaSlab",
      "rawStateJam",
      "rawEventLog",
      "walletSeedPhrase",
      "privateSpendKey",
      "sequencerJournalSigningKey",
      "rawProofArtifact"
    ],
    interpretationRules: [
      "Dependency presence identifies a review lane, not proof that runtime behavior is correct.",
      "A changed dependency family must be paired with crate-scoped cargo checks and source provenance before evidence claims change.",
      "Manifest drift is the stale-data trigger; receipt fields and forbidden fields define what can be carried forward safely."
    ]
  };
}

function collectFamilyCrates(dependencyNames: readonly string[]) {
  return cargoCrates
    .filter(
      (crateDetail) =>
        dependencyNames.includes(crateDetail.name) ||
        crateDetail.dependencies.some((dependency) => dependencyNames.includes(dependency))
    )
    .map((crateDetail) => crateDetail.name);
}

function createManifestCatalogHash(
  manifests: readonly { path: string; sha256: string; bytes: number }[]
) {
  const normalized = manifests
    .map((manifest) => ({
      path: manifest.path,
      sha256: manifest.sha256,
      bytes: manifest.bytes
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return `sha256:${createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}
