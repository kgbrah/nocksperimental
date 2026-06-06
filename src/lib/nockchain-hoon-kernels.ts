import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const sourceCommitSha = nockchainUpstreamIntelligence.latestCommit.sha;
const sourceBlobUrl = (path: string, lineRange: string) =>
  `https://github.com/nockchain/nockchain/blob/${sourceCommitSha}/${path}#${lineRange}`;

const buildPipeline = {
  compiler: "hoonc",
  makeTargets: ["build-hoon", "build-assets", "assets/dumb.jam", "assets/wal.jam", "assets/miner.jam", "assets/peek.jam", "assets/bridge.jam"],
  sourceGlob: "hoon/**/*.hoon",
  assetTargets: [
    "assets/dumb.jam",
    "assets/miner.jam",
    "assets/wal.jam",
    "assets/peek.jam",
    "assets/bridge.jam"
  ],
  makefileSource: "Makefile",
  makefileLineRange: "L217-L275",
  interpretation:
    "All public Hoon kernels are compiled through hoonc from the hoon source tree into jam assets before Rust crates embed or execute them."
} as const;

const kernels = [
  {
    id: "dumbnet-consensus",
    label: "Dumbnet consensus kernel",
    role: "Primary Nockchain state machine for consensus, mining state, derived chain state, checkpoints, constants, and state upgrades.",
    jamAsset: "assets/dumb.jam",
    entrySource: "hoon/apps/dumbnet/outer.hoon",
    innerSource: "hoon/apps/dumbnet/inner.hoon",
    upstreamUrl: sourceBlobUrl("hoon/apps/dumbnet/inner.hoon", "L1-L180"),
    kernelCrate: "crates/kernels/dumb",
    consumerCrate: "nockchain",
    consumerEntrypoints: ["crates/nockchain/src/main.rs", "crates/nockchain/src/lib.rs"],
    stateVersion: "%9",
    imports: [
      "/apps/dumbnet/lib/types",
      "/apps/dumbnet/lib/consensus",
      "/apps/dumbnet/lib/derived",
      "/apps/dumbnet/lib/miner",
      "/common/tx-engine",
      "/common/pow",
      "/common/nock-verifier"
    ],
    interfaceArms: ["load", "poke", "peek"],
    causeTags: ["block acceptance and consensus pokes are typed in dumbnet lib/types"],
    effectTags: ["new-heaviest-chain", "new-heaviest-miner", "kernel trace spans"],
    stateUpgradeSignals: [
      "state-0-to-1",
      "state-1-to-2",
      "state-2-to-3",
      "state-3-to-4",
      "state-4-to-5",
      "state-5-to-6",
      "state-6-to-7",
      "state-7-to-8",
      "state-8-to-9"
    ],
    receiptFields: [
      "kernelId",
      "jamAsset",
      "nockchainCommit",
      "blockchainConstantsSource",
      "protocolTrack",
      "stateVersion",
      "tipStatus",
      "stateJamFingerprint"
    ],
    forbiddenFields: ["rawJamBytes", "rawKernelState", "rawPmaSlab", "rawStateJam"]
  },
  {
    id: "dumbnet-miner",
    label: "Dumbnet mining kernel",
    role: "Proof-of-work helper kernel that receives candidate header/nonce/target causes and emits mine-result effects.",
    jamAsset: "assets/miner.jam",
    entrySource: "hoon/apps/dumbnet/miner.hoon",
    innerSource: null,
    upstreamUrl: sourceBlobUrl("hoon/apps/dumbnet/miner.hoon", "L1-L70"),
    kernelCrate: "crates/kernels/miner",
    consumerCrate: "nockchain",
    consumerEntrypoints: ["crates/nockchain/src/mining.rs"],
    stateVersion: "%1",
    imports: ["/common/pow", "/common/stark/prover", "/common/zoon", "/common/zeke"],
    interfaceArms: ["load", "poke", "peek"],
    causeTags: ["%0", "%1", "%2"],
    effectTags: ["%mine-result"],
    stateUpgradeSignals: ["kernel-state [%state version=%1]", "no stateful load migration"],
    receiptFields: [
      "kernelId",
      "jamAsset",
      "miningHeader",
      "nonceDigest",
      "powDigest",
      "target",
      "mineResult"
    ],
    forbiddenFields: ["rawJamBytes", "rawKernelState", "rawProofWitness"]
  },
  {
    id: "wallet",
    label: "Wallet kernel",
    role: "Wallet state machine for keys, notes, balance sync, transaction construction, signing commands, and fakenet/mainnet wallet state checks.",
    jamAsset: "assets/wal.jam",
    entrySource: "hoon/apps/wallet/wallet.hoon",
    innerSource: null,
    upstreamUrl: sourceBlobUrl("hoon/apps/wallet/wallet.hoon", "L1-L180"),
    kernelCrate: "crates/kernels/wallet",
    consumerCrate: "nockchain-wallet",
    consumerEntrypoints: ["crates/nockchain-wallet/src/main.rs", "crates/nockchain-wallet/src/command.rs"],
    stateVersion: "%8",
    imports: [
      "/common/bip39",
      "/common/tx-engine",
      "/apps/wallet/lib/types",
      "/apps/wallet/lib/utils",
      "/apps/wallet/lib/tx-builder",
      "/apps/wallet/lib/s10",
      "/apps/bridge/types"
    ],
    interfaceArms: ["load", "poke", "peek"],
    causeTags: ["wallet command nouns", "balance sync pokes", "transaction creation pokes"],
    effectTags: ["%markdown", "%file", "%exit", "wallet driver effects"],
    stateUpgradeSignals: [
      "state-0-1",
      "state-1-2",
      "state-2-3",
      "state-3-4",
      "state-4-5",
      "state-5-6",
      "state-6-7",
      "state-7-8"
    ],
    receiptFields: [
      "kernelId",
      "jamAsset",
      "walletEndpointMode",
      "walletAddress",
      "walletStateVersion",
      "balancePeekHash",
      "txPlanHash"
    ],
    forbiddenFields: [
      "rawJamBytes",
      "rawKernelState",
      "walletSeedPhrase",
      "masterPrivateKey",
      "privateSpendKey"
    ]
  },
  {
    id: "nockchain-peek",
    label: "Nockchain peek kernel",
    role: "Read/format helper kernel for block, heaviest-chain, note, and file/markdown peek workflows.",
    jamAsset: "assets/peek.jam",
    entrySource: "hoon/apps/peek/peek.hoon",
    innerSource: null,
    upstreamUrl: sourceBlobUrl("hoon/apps/peek/peek.hoon", "L1-L150"),
    kernelCrate: "crates/kernels/nockchain-peek",
    consumerCrate: "nockchain-peek",
    consumerEntrypoints: ["crates/nockchain-peek/src/main.rs", "crates/nockchain-peek/src/lib.rs"],
    stateVersion: "kernel-state",
    imports: ["/common/tx-engine", "/common/wrapper", "/common/zoon"],
    interfaceArms: ["load", "poke", "peek"],
    causeTags: ["%born", "%grpc-bind"],
    effectTags: ["%exit", "%grpc", "%markdown", "%file"],
    stateUpgradeSignals: ["load returns kernel-state unchanged"],
    receiptFields: [
      "kernelId",
      "jamAsset",
      "peekCommand",
      "peekPath",
      "peekResultHash",
      "markdownHash",
      "writtenFileHash"
    ],
    forbiddenFields: ["rawJamBytes", "rawKernelState", "rawBlockJam"]
  },
  {
    id: "bridge",
    label: "Bridge kernel",
    role: "Bridge state machine for Base/Nock hashchain state, withdrawal coordination, signer thresholds, and kernel reconciliation.",
    jamAsset: "assets/bridge.jam",
    entrySource: "hoon/apps/bridge/bridge.hoon",
    innerSource: null,
    upstreamUrl: sourceBlobUrl("hoon/apps/bridge/bridge.hoon", "L1-L120"),
    kernelCrate: "crates/kernels/bridge",
    consumerCrate: "bridge",
    consumerEntrypoints: ["crates/bridge/src/main.rs", "crates/bridge/src/shared/runtime.rs"],
    stateVersion: "bridge-state",
    imports: [
      "/common/tx-engine",
      "/apps/bridge/base",
      "/apps/bridge/nock",
      "/apps/bridge/types",
      "/apps/wallet/lib/tx-builder",
      "/apps/wallet/lib/types",
      "/apps/dumbnet/lib/types"
    ],
    interfaceArms: ["handle-cause", "load", "poke", "peek"],
    causeTags: [
      "%cfg-load",
      "%set-constants",
      "%set-blockchain-constants",
      "%base-blocks",
      "%base-block-withdrawals-committed",
      "%nockchain-block",
      "%create-withdrawal-tx",
      "%sign-tx",
      "%proposed-nock-tx"
    ],
    effectTags: ["%stop", "bridge runtime effects", "withdrawal transaction effects"],
    stateUpgradeSignals: ["bridge-state load", "bridge stop/start recovery", "hashchain hold checks"],
    receiptFields: [
      "kernelId",
      "jamAsset",
      "withdrawalId",
      "proposalHash",
      "sequencerState",
      "kernelReconciliationStatus",
      "bridgeLockRoot"
    ],
    forbiddenFields: [
      "rawJamBytes",
      "rawKernelState",
      "sequencerJournalSigningKey",
      "bridgePrivateKey"
    ]
  }
] as const;

const rustEmbedding = {
  kernelCrates: [
    "crates/kernels/dumb",
    "crates/kernels/miner",
    "crates/kernels/wallet",
    "crates/kernels/nockchain-peek",
    "crates/kernels/bridge"
  ],
  aggregateCrate: "crates/kernels",
  consumers: [
    "crates/nockchain/src/main.rs",
    "crates/nockchain/src/mining.rs",
    "crates/nockchain-wallet/src/main.rs",
    "crates/nockchain-peek/src/main.rs",
    "crates/bridge/src/main.rs",
    "crates/nockapp/src/kernel/form.rs"
  ],
  buildScripts: [
    "crates/kernels/dumb/build.rs",
    "crates/kernels/miner/build.rs",
    "crates/kernels/wallet/build.rs",
    "crates/kernels/nockchain-peek/build.rs",
    "crates/kernels/bridge/build.rs",
    "crates/nockapp/build.rs"
  ],
  interpretation:
    "Kernel crates use include_bytes!(env!(\"KERNEL_JAM_PATH\")) or crate-specific jam env vars, so receipts should cite the Rust consumer and the jam asset identity."
} as const;

const evidenceContract = {
  requiredFields: [
    "kernelId",
    "jamAsset",
    "hoonSource",
    "kernelCrate",
    "consumerCrate",
    "nockchainCommit",
    "nockchainBuild",
    "sourceAnchor"
  ],
  forbiddenFields: [
    "rawJamBytes",
    "rawKernelState",
    "rawPmaSlab",
    "rawStateJam",
    "rawEventLog",
    "walletSeedPhrase",
    "privateSpendKey",
    "sequencerJournalSigningKey"
  ],
  interpretation:
    "Hoon and jam identity is evidence metadata. Public Nocksperimental receipts should carry source paths, hashes, build/commit context, and redacted outputs rather than raw jam, kernel state, PMA, state-jam, event-log, or key material."
} as const;

const verificationMatrix = {
  sourceCommands: [
    "make build-hoon",
    "make build-assets",
    "make assets/dumb.jam",
    "make assets/miner.jam",
    "make assets/wal.jam",
    "make assets/peek.jam",
    "make assets/bridge.jam"
  ],
  crateChecks: [
    "cargo check -p kernels-open-dumb",
    "cargo check -p kernels-open-miner",
    "cargo check -p kernels-open-wallet",
    "cargo check -p kernels-open-nockchain-peek",
    "cargo check -p kernels-open-bridge",
    "cargo check -p nockchain-peek"
  ],
  availableTooling: ["cargo 1.96.0", "hoonc"],
  localCautions: [
    "$HOME/.cargo/bin must be present on PATH for cargo and hoonc checks",
    "Full Hoon rebuilds can mutate local hoonc/NockApp data directories; use scratch upstream checkouts for exploratory compiles.",
    "Cargo metadata can be read locally, but full crate checks may still fetch/build dependencies."
  ]
} as const;

export function createNockchainHoonKernelAtlas() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/hoon-kernels`,
    generatedAt: "2026-06-06T08:10:00.000Z",
    upstream: {
      scannedAt: upstream.scannedAt,
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease
    },
    buildPipeline,
    kernels,
    rustEmbedding,
    verificationMatrix,
    evidenceContract,
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/hoon-kernels`,
      nockAppSource: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      cargoSurface: `${registryCanonicalBaseUrl}/api/nockchain/cargo-surface`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      bridgeSource: `${registryCanonicalBaseUrl}/api/nockchain/bridge-source`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
