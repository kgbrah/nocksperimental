import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export const nockchainUpstreamIntelligence = {
  version: "v0",
  service: registryServiceName,
  subject: registrySubject,
  canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/upstream`,
  scannedAt: "2026-06-05T18:35:00.000Z",
  repository: {
    fullName: "nockchain/nockchain",
    defaultBranch: "master",
    url: "https://github.com/nockchain/nockchain",
    upstreamOrg: "https://github.com/zorp-corp",
    description: "Nockchain protocol monorepo"
  },
  latestCommit: {
    shortSha: "5d022ced5504",
    sha: "5d022ced55040221e8b6fcfd78114189fbae91a0",
    committedAt: "2026-06-02T20:11:49Z",
    message: "libp2p: suppress all outgoing gossip while catching up (behind tip)",
    url: "https://github.com/nockchain/nockchain/commit/5d022ced55040221e8b6fcfd78114189fbae91a0",
    nocksperimentalRelevance:
      "Behind-tip nodes can intentionally suppress gossip, so fakenet/mining receipts need sync, peer, route-table, and tip context before treating no-peers or wrong-commitment symptoms as test failure."
  },
  latestRelease: {
    tag: "build-5d022ced55040221e8b6fcfd78114189fbae91a0",
    name: "Build 5d022ced55040221e8b6fcfd78114189fbae91a0",
    publishedAt: "2026-06-02T20:51:14Z",
    url: "https://github.com/nockchain/nockchain/releases/tag/build-5d022ced55040221e8b6fcfd78114189fbae91a0"
  },
  recentSignals: [
    {
      shortSha: "2601509be0da",
      message: "Nous Protocol Upgrade (#40)",
      significance: "Protocol track changed; receipts should record active upgrade context."
    },
    {
      shortSha: "0787a54906e0",
      message: "PMA dynamic growth, libp2p IP-level exclusion, bridge operator tooling",
      significance: "Runtime durability, networking policy, and bridge operations moved together."
    },
    {
      shortSha: "1a23ccdabf3f",
      message: "nockapp: harden chkjam/state-jam decode",
      significance: "State-jam/checkpoint handling should surface decode provenance and actionable operator errors."
    }
  ],
  docs: {
    policy:
      "Read START_HERE first. Tier 0 overrides Tier 1, and Tier 1 overrides legacy or historical docs. Crate READMEs are scoped authority only when promoted by the canonical spine.",
    canonicalSpine: [
      {
        path: "START_HERE.md",
        role: "docs trust contract and read order",
        url: "https://github.com/nockchain/nockchain/blob/master/START_HERE.md"
      },
      {
        path: "PROTOCOL.md",
        role: "protocol authority and upgrade index",
        url: "https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md"
      },
      {
        path: "ARCHITECTURE.md",
        role: "system boundaries and invariants",
        url: "https://github.com/nockchain/nockchain/blob/master/ARCHITECTURE.md"
      },
      {
        path: "WORKFLOWS.md",
        role: "operational routing and golden paths",
        url: "https://github.com/nockchain/nockchain/blob/master/WORKFLOWS.md"
      },
      {
        path: "DECISIONS/README.md",
        role: "decision history index",
        url: "https://github.com/nockchain/nockchain/blob/master/DECISIONS/README.md"
      }
    ],
    scopedTierOne: [
      {
        path: "crates/nockapp/README.md",
        scope: "NockApp runtime interface, Kernel, poke, peek, effects, and logging"
      },
      {
        path: "crates/nockchain-api/README.md",
        scope: "Public API runtime/deployment guidance and alpha risk posture"
      },
      {
        path: "crates/nockchain-wallet/README.md",
        scope: "Wallet CLI behavior and operational usage"
      }
    ]
  },
  protocol: {
    authority: "PROTOCOL.md plus versioned specs in changelog/protocol/",
    currentTrack: {
      draft: {
        sequence: "014",
        codename: "Aletheia",
        version: "0.1.14",
        status: "draft",
        activationHeight: 65500
      },
      next: {
        sequence: "013",
        codename: "Nous",
        version: "1.0.0",
        status: "final",
        activationTarget: "2026-Q2",
        activationHeight: 0,
        activationMode: "rollout-gated"
      },
      previous: {
        sequence: "012",
        codename: "Bythos",
        version: "0.1.11",
        status: "final",
        activationHeight: 54000
      }
    }
  },
  workspace: {
    language: "Rust",
    resolver: "2",
    crateGroups: {
      chainRuntime: [
        "nockchain",
        "nockchain-types",
        "nockchain-libp2p-io",
        "nockchain-math",
        "nockchain-testkit",
        "nockchain-e2e"
      ],
      operatorTools: [
        "nockchain-api",
        "nockchain-wallet",
        "nockchain-peek",
        "nockchain-explorer-tui",
        "raw-tx-checker",
        "wallet-tx-builder"
      ],
      nockAppRuntime: [
        "nockapp",
        "nockapp-grpc",
        "nockapp-grpc-proto",
        "nockvm/rust/nockvm",
        "nockvm/rust/nockvm_macros"
      ],
      hoonAndScaffolding: ["hoon", "hoonc", "kernels", "nockup"],
      bridgeAndProof: ["bridge", "zkvm-jetpack", "equix-latency"],
      serializationSupport: ["noun-serde", "noun-serde-derive", "habit", "chaff"]
    },
    validationGates: [
      "cargo check -p nockchain",
      "cargo check -p nockapp",
      "cargo check -p nockchain-wallet",
      "cargo test -p <crate> --release",
      "cargo fmt --check",
      "cargo clippy --all-targets -- -Dclippy::unwrap_used -Aclippy::missing_safety_doc"
    ]
  },
  operationalScripts: {
    mainnet: ["scripts/run_nockchain_node.sh", "scripts/run_nockchain_miner.sh"],
    fakenet: [
      "scripts/run_nockchain_node_fakenet.sh",
      "scripts/run_nockchain_miner_fakenet.sh"
    ],
    diagnostics: ["scripts/watch-event-log.sh", "scripts/block-poke-times.sh", "scripts/poke-times.sh"],
    docs: [
      "scripts/docs/check_docs_metadata.sh",
      "scripts/docs/check_canonical_links.sh",
      "scripts/docs/check_nous_validation_entrypoints.sh"
    ]
  },
  safety: {
    publicApi:
      "nockchain-api is alpha/test-grade; do not expose it publicly without explicit access control, observability, and acceptance of missing auth/rate-limit hardening.",
    stateArtifacts: {
      posture:
        "PMA is durable local kernel-state storage, not a disposable cache or safe raw third-party bootstrap artifact.",
      doNotStore: [
        "raw PMA slabs",
        "event logs",
        "checkpoints",
        "state jams",
        "wallet exports",
        "seed phrases",
        "private keys"
      ],
      metadataToTrack: [
        "source URL or Drive folder id",
        "filename",
        "size",
        "hash",
        "checkpoint height or event boundary",
        "network",
        "Nockchain build or commit",
        "producer identity if known"
      ]
    }
  },
  watchItems: [
    "libp2p/sync behavior while behind tip",
    "PMA dynamic growth and memory/durability changes",
    "state-jam/checkpoint decode hardening",
    "nockup template/run UX PRs",
    "wallet blob/memo transaction support",
    "public NockApp::export_state",
    "protocol specs 013-nous and 014-aletheia"
  ],
  nocksperimentalImplications: {
    receiptFields: [
      "nockchainBuild",
      "nockchainCommit",
      "protocolTrack",
      "activationHeight",
      "network",
      "stateJamFingerprint",
      "peerCount",
      "routeTableSize",
      "tipStatus",
      "walletEndpointMode"
    ],
    nextProductSlices: [
      "Expose sync/peer/tip diagnostics beside fakenet mining checks.",
      "Add state-jam registry metadata without hosting raw state artifacts.",
      "Attach canonical Nockchain doc authority to test assumptions.",
      "Add nockup build/run receipts for app scaffold validation."
    ]
  },
  links: {
    repository: "https://github.com/nockchain/nockchain",
    zorp: "https://github.com/zorp-corp",
    release: "https://github.com/nockchain/nockchain/releases/tag/build-5d022ced55040221e8b6fcfd78114189fbae91a0",
    research: `${registryCanonicalBaseUrl}/docs/research/nockchain-rust-architecture.md`,
    registry: `${registryCanonicalBaseUrl}/api/registry`,
    openApi: `${registryCanonicalBaseUrl}/openapi.json`
  }
} as const;

export function createNockchainUpstreamIntelligence() {
  return nockchainUpstreamIntelligence;
}

