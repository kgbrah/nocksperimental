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
      manifestPaths: workspaceManifestPaths
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
