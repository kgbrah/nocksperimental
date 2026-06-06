import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const sourceDomains = [
  {
    id: "node-runtime",
    label: "Node runtime",
    crateNames: ["nockchain"],
    nocksperimentalUse:
      "Anchor local fakenet readiness, process command provenance, data-dir policy, and node startup assumptions."
  },
  {
    id: "mining-runtime",
    label: "Mining runtime",
    crateNames: ["nockchain"],
    nocksperimentalUse:
      "Tie miner receipts to key configuration, public key hash context, mining data, and block-commitment diagnostics."
  },
  {
    id: "p2p-sync-gossip",
    label: "P2P sync and gossip",
    crateNames: ["nockchain-libp2p-io"],
    nocksperimentalUse:
      "Explain empty routing tables, no peers, quiet tx gossip, and wrong-commitment symptoms through catch-up state."
  },
  {
    id: "nockapp-runtime",
    label: "NockApp runtime",
    crateNames: ["nockapp"],
    nocksperimentalUse:
      "Ground poke, peek, effects, event-log, and NockApp lab evidence in current Rust runtime boundaries."
  },
  {
    id: "pma-durability",
    label: "PMA durability",
    crateNames: ["nockvm", "nockapp"],
    nocksperimentalUse:
      "Keep PMA/state-jam/checkpoint evidence metadata-only while recording runtime durability and recovery context."
  },
  {
    id: "runtime-stack-safety",
    label: "Runtime stack safety",
    crateNames: ["nockvm"],
    nocksperimentalUse:
      "Track issue #121 and any stack-frame safety changes that can affect replay or PMA-backed runtime evidence."
  },
  {
    id: "wallet-cli",
    label: "Wallet CLI",
    crateNames: ["nockchain-wallet"],
    nocksperimentalUse:
      "Pin wallet commands, endpoint mode, balance checks, transaction creation, and operator-facing evidence fields."
  },
  {
    id: "wallet-transaction-builder",
    label: "Wallet transaction builder",
    crateNames: ["wallet-tx-builder"],
    nocksperimentalUse:
      "Anchor create-tx and withdrawal planning, fee behavior, and bridge settlement assumptions."
  },
  {
    id: "public-api-grpc",
    label: "Public API and gRPC",
    crateNames: ["nockchain-api", "nockapp-grpc"],
    nocksperimentalUse:
      "Separate hosted public API evidence from local/private gRPC probes and wire conversion receipts."
  },
  {
    id: "bridge-withdrawal",
    label: "Bridge withdrawal",
    crateNames: ["bridge"],
    nocksperimentalUse:
      "Trace withdrawal runtime and kernel port evidence without storing raw transaction jams or bridge secrets."
  },
  {
    id: "bridge-sequencer",
    label: "Bridge sequencer",
    crateNames: ["nockchain-bridge-sequencer"],
    nocksperimentalUse:
      "Explain sequencer journals, submission state, and VESL bridge evidence while excluding signing keys."
  },
  {
    id: "nockup-scaffold",
    label: "Nockup scaffold",
    crateNames: ["nockup"],
    nocksperimentalUse:
      "Connect scaffold build/run receipts to the upstream nockup entrypoint and template UX."
  }
] as const;

const sourceTraceContract = {
  requiredFields: [
    "sourceAnchorId",
    "domainId",
    "crateName",
    "sourcePath",
    "symbol",
    "lineRange",
    "sourceCommit",
    "sourceUrl",
    "cargoGate",
    "receiptFields"
  ],
  forbiddenFields: [
    "rawPmaSlab",
    "rawStateJam",
    "rawEventLog",
    "rawTransactionJam",
    "rawGrpcPayload",
    "walletSeedPhrase",
    "privateSpendKey",
    "sequencerJournalSigningKey",
    "objectStoreSecret",
    "bridgeNodePrivateKey"
  ],
  reviewRules: [
    "Treat line ranges as implementation evidence, not protocol authority.",
    "Tie every source anchor to the exact Nockchain commit and release before accepting receipts.",
    "Use Tier 0 docs for protocol claims and these anchors for current Rust implementation boundaries.",
    "Promote an upstream change into Nocksperimental only after naming the receipt fields, forbidden fields, and validation gate."
  ]
} as const;

const sourceAnchors = [
  {
    id: "nockchain-node-main",
    domainId: "node-runtime",
    crateName: "nockchain",
    sourcePath: "crates/nockchain/src/main.rs",
    symbol: "main",
    lineRange: "L20-L80",
    cargoGate: "cargo check -p nockchain",
    receiptFields: ["nodeCommand", "dataDir", "networkId", "nockchainCommit", "nockchainBuild"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam", "walletSeedPhrase"],
    targetSurfaces: ["localFakenetReadiness", "nockchainOperationsAtlas", "nockchainWatch"],
    interpretation:
      "Node startup is the first source boundary for fakenet and operator evidence; receipts need command, network, data-dir, and build provenance."
  },
  {
    id: "mining-key-config",
    domainId: "mining-runtime",
    crateName: "nockchain",
    sourcePath: "crates/nockchain/src/mining.rs",
    symbol: "MiningKeyConfig / MiningPkhConfig",
    lineRange: "L53-L130",
    cargoGate: "cargo check -p nockchain",
    receiptFields: ["miningPublicKey", "miningPkh", "blockCommitment", "miningMode"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawPmaSlab"],
    targetSurfaces: ["nockchainOperationsAtlas", "localFakenetEvidence"],
    interpretation:
      "Mining output must carry public key context and block-commitment evidence without exposing spend keys or state artifacts."
  },
  {
    id: "libp2p-catch-up-signal",
    domainId: "p2p-sync-gossip",
    crateName: "nockchain-libp2p-io",
    sourcePath: "crates/nockchain-libp2p-io/src/catch_up.rs",
    symbol: "CatchUpSignal::is_catching_up",
    lineRange: "L77-L160",
    cargoGate: "cargo check -p nockchain-libp2p-io",
    receiptFields: ["syncMode", "tipHeight", "peerCount", "routeTableSize"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["nockchainSyncGossipTrace", "localFakenetDiagnostics"],
    interpretation:
      "Behind-tip state can make missing gossip intentional; receipts need sync mode before interpreting quiet peers as network failure."
  },
  {
    id: "libp2p-gossip-suppression",
    domainId: "p2p-sync-gossip",
    crateName: "nockchain-libp2p-io",
    sourcePath: "crates/nockchain-libp2p-io/src/p2p_state.rs",
    symbol: "P2PState::should_suppress_outgoing_gossip",
    lineRange: "L2518-L2525",
    cargoGate: "cargo check -p nockchain-libp2p-io",
    receiptFields: ["gossipSuppressedBehindTip", "syncMode", "peerCount", "routeTableSize"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["nockchainSyncGossipTrace", "nockchainOperationsAtlas"],
    interpretation:
      "This is the source anchor for interpreting tx gossip silence while the node catches up."
  },
  {
    id: "libp2p-driver-gossip-metric",
    domainId: "p2p-sync-gossip",
    crateName: "nockchain-libp2p-io",
    sourcePath: "crates/nockchain-libp2p-io/src/driver.rs",
    symbol: "gossip_suppressed_behind_tip_total",
    lineRange: "L1221-L1236",
    cargoGate: "cargo check -p nockchain-libp2p-io",
    receiptFields: ["gossipSuppressedBehindTip", "suppressionMetric"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["nockchainSyncGossipTrace"],
    interpretation:
      "Metric increments are useful support-bundle evidence when mining or tx propagation looks stalled."
  },
  {
    id: "nockapp-poke-peek",
    domainId: "nockapp-runtime",
    crateName: "nockapp",
    sourcePath: "crates/nockapp/src/nockapp/mod.rs",
    symbol: "NockApp::poke / NockApp::peek",
    lineRange: "L278-L355",
    cargoGate: "cargo check -p nockapp",
    receiptFields: ["pokeOrPeek", "kernelIdentity", "effectSummary", "stateBoundary"],
    forbiddenFields: ["rawEventLog", "rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["nockchainNockAppSourceTrace", "generatedLabReports"],
    interpretation:
      "NockApp receipts should distinguish read-only peeks from state-changing pokes and summarize effects without storing raw logs."
  },
  {
    id: "nockapp-snapshot-safety",
    domainId: "pma-durability",
    crateName: "nockapp",
    sourcePath: "crates/nockapp/src/snapshot.rs",
    symbol: "verify_snapshot / create_ready_snapshot",
    lineRange: "L291-L628",
    cargoGate: "cargo check -p nockapp",
    receiptFields: ["snapshotBoundary", "stateJamFingerprint", "checkpointHeight", "producerBuild"],
    forbiddenFields: ["rawEventLog", "rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["stateJamRegistry", "nockchainNockAppSourceTrace"],
    interpretation:
      "Snapshot and checkpoint evidence must be metadata-only and tied to the producing build and boundary."
  },
  {
    id: "pma-open-growth",
    domainId: "pma-durability",
    crateName: "nockvm",
    sourcePath: "crates/nockvm/rust/nockvm/src/pma.rs",
    symbol: "Pma::open",
    lineRange: "L617-L640",
    cargoGate: "cargo check -p nockvm",
    receiptFields: ["pmaMetadata", "pmaMinimumWords", "pmaOpenMode", "stateJamFingerprint"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam", "rawEventLog"],
    targetSurfaces: ["stateJamRegistry", "nockchainNockAppAtlas"],
    interpretation:
      "PMA open/growth behavior is implementation evidence for memory and durability claims, not a portable state artifact."
  },
  {
    id: "nockstack-frame-safety",
    domainId: "runtime-stack-safety",
    crateName: "nockvm",
    sourcePath: "crates/nockvm/rust/nockvm/src/mem.rs",
    symbol: "NockStack::is_in_frame",
    lineRange: "L1338-L1356",
    cargoGate: "cargo check -p nockvm",
    receiptFields: ["runtimeStackFrameCheck", "nockvmCommit", "stackSafetyIssue"],
    forbiddenFields: ["rawPmaSlab", "rawStateJam"],
    targetSurfaces: ["nockchainPrRadar", "nockchainWatch"],
    watchRefs: ["issue #121"],
    interpretation:
      "Stack-frame safety remains a high-signal runtime watch item because it can affect replay reliability and PMA-backed execution."
  },
  {
    id: "wallet-cli-commands",
    domainId: "wallet-cli",
    crateName: "nockchain-wallet",
    sourcePath: "crates/nockchain-wallet/src/command.rs",
    symbol: "Commands",
    lineRange: "L306-L650",
    cargoGate: "cargo check -p nockchain-wallet",
    receiptFields: ["walletCommand", "walletAddress", "walletEndpointMode", "nockchainBuild"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawGrpcPayload"],
    targetSurfaces: ["nockchainWalletAtlas", "localFakenetEvidence"],
    interpretation:
      "Wallet receipts should cite the command variant and endpoint mode while keeping seed material and private keys out of evidence."
  },
  {
    id: "wallet-create-tx-with-planner",
    domainId: "wallet-cli",
    crateName: "nockchain-wallet",
    sourcePath: "crates/nockchain-wallet/src/create_tx.rs",
    symbol: "Wallet::create_tx_with_planner",
    lineRange: "L1064-L1125",
    cargoGate: "cargo check -p nockchain-wallet",
    receiptFields: ["walletTransactionPlan", "inputNotesHash", "feeSummary", "endpointMode"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawTransactionJam"],
    targetSurfaces: ["nockchainWalletAtlas", "nockchainBridgeSourceTrace"],
    interpretation:
      "Transaction creation evidence should hash inputs and summarize planning without exposing raw transaction jams."
  },
  {
    id: "wallet-tx-planner",
    domainId: "wallet-transaction-builder",
    crateName: "wallet-tx-builder",
    sourcePath: "crates/wallet-tx-builder/src/planner.rs",
    symbol: "plan_create_tx / plan_withdrawal_tx",
    lineRange: "L1018-L1056",
    cargoGate: "cargo check -p wallet-tx-builder",
    receiptFields: ["withdrawalPlan", "feeSummary", "noteSelection", "bridgeAmount"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawTransactionJam"],
    targetSurfaces: ["nockchainBridgeSourceTrace", "veslEvidenceBridge"],
    interpretation:
      "Withdrawal planning sits between wallet evidence and bridge evidence; receipts need deterministic planner metadata."
  },
  {
    id: "wallet-bridge-fee",
    domainId: "wallet-transaction-builder",
    crateName: "wallet-tx-builder",
    sourcePath: "crates/wallet-tx-builder/src/fee.rs",
    symbol: "compute_bridge_fee / compute_minimum_fee",
    lineRange: "L28-L37",
    cargoGate: "cargo check -p wallet-tx-builder",
    receiptFields: ["feeSummary", "bridgeAmount", "nicksFeePerNock"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey"],
    targetSurfaces: ["nockchainBridgeSourceTrace", "nockchainWalletAtlas"],
    interpretation:
      "Fee receipts should record the fee inputs and result so bridge tests can compare outcomes across builds."
  },
  {
    id: "nockchain-public-api-main",
    domainId: "public-api-grpc",
    crateName: "nockchain-api",
    sourcePath: "crates/nockchain-api/src/main.rs",
    symbol: "main",
    lineRange: "L25-L50",
    cargoGate: "cargo check -p nockchain-api",
    receiptFields: ["apiEndpointMode", "apiBaseUrl", "accessControl", "probeLocation"],
    forbiddenFields: ["apiToken", "rawGrpcPayload"],
    targetSurfaces: ["nockchainWalletAtlas", "bringYourOwnFakenet"],
    interpretation:
      "Public API evidence must clearly distinguish hosted/public probes from local/private gRPC access."
  },
  {
    id: "nockapp-grpc-wire-conversion",
    domainId: "public-api-grpc",
    crateName: "nockapp-grpc",
    sourcePath: "crates/nockapp-grpc/src/wire_conversion.rs",
    symbol: "grpc_wire_to_nockapp",
    lineRange: "L7-L43",
    cargoGate: "cargo check -p nockapp-grpc",
    receiptFields: ["wireConversion", "grpcService", "endpointMode"],
    forbiddenFields: ["rawGrpcPayload", "apiToken"],
    targetSurfaces: ["localFakenetEvidence", "nockchainNockAppSourceTrace"],
    interpretation:
      "Wire conversion anchors future gRPC-native probes while receipts keep raw payloads out of persisted evidence."
  },
  {
    id: "bridge-withdrawal-runtime",
    domainId: "bridge-withdrawal",
    crateName: "bridge",
    sourcePath: "crates/bridge/src/withdrawal/runtime.rs",
    symbol: "bootstrap_runtime",
    lineRange: "L45-L108",
    cargoGate: "cargo check -p bridge",
    receiptFields: ["withdrawalRuntime", "kernelPort", "proposalHash", "confirmationState"],
    forbiddenFields: ["rawTransactionJam", "bridgeNodePrivateKey", "objectStoreSecret"],
    targetSurfaces: ["nockchainBridgeSourceTrace", "veslEvidenceBridge"],
    interpretation:
      "Withdrawal runtime receipts should preserve proposal and confirmation metadata without copying raw transactions or secrets."
  },
  {
    id: "bridge-withdrawal-effect-classifier",
    domainId: "bridge-withdrawal",
    crateName: "bridge",
    sourcePath: "crates/bridge/src/withdrawal/assembly.rs",
    symbol: "classify_withdrawal_execution_effect",
    lineRange: "L198-L220",
    cargoGate: "cargo check -p bridge",
    receiptFields: ["withdrawalEffect", "proposalHash", "kernelEffectSummary"],
    forbiddenFields: ["rawTransactionJam", "rawEventLog"],
    targetSurfaces: ["nockchainBridgeSourceTrace"],
    interpretation:
      "Effect classification helps receipts name bridge state without storing kernel event logs."
  },
  {
    id: "bridge-sequencer-journal",
    domainId: "bridge-sequencer",
    crateName: "nockchain-bridge-sequencer",
    sourcePath: "crates/nockchain-bridge-sequencer/src/main.rs",
    symbol: "build_sequencer_journal",
    lineRange: "L154-L240",
    cargoGate: "cargo check -p nockchain-bridge-sequencer",
    receiptFields: ["sequencerJournalEntry", "authorizedTransactionHash", "submissionState"],
    forbiddenFields: ["sequencerJournalSigningKey", "objectStoreSecret", "rawTransactionJam"],
    targetSurfaces: ["veslEvidenceBridge", "nockchainBridgeSourceTrace"],
    interpretation:
      "Sequencer evidence can cite journal entry metadata and submission state while keeping signing material private."
  },
  {
    id: "nockup-main",
    domainId: "nockup-scaffold",
    crateName: "nockup",
    sourcePath: "crates/nockup/src/main.rs",
    symbol: "main",
    lineRange: "L9-L40",
    cargoGate: "cargo check -p nockup",
    receiptFields: ["nockupTemplate", "scaffoldCommand", "buildCommand", "runCommand"],
    forbiddenFields: ["walletSeedPhrase", "apiToken", "rawPmaSlab"],
    targetSurfaces: ["nockupValidation", "generatedLabReports"],
    interpretation:
      "Nockup validation receipts should tie template generation and run evidence to the current upstream entrypoint."
  }
] as const;

const learningPath = [
  {
    domainId: "node-runtime",
    anchorIds: ["nockchain-node-main", "mining-key-config"],
    objective:
      "Start from node and miner entrypoints so fakenet evidence has process, key, and build context."
  },
  {
    domainId: "p2p-sync-gossip",
    anchorIds: [
      "libp2p-catch-up-signal",
      "libp2p-gossip-suppression",
      "libp2p-driver-gossip-metric"
    ],
    objective:
      "Learn sync state before diagnosing no peers, empty route tables, or wrong block commitments."
  },
  {
    domainId: "nockapp-runtime",
    anchorIds: ["nockapp-poke-peek"],
    objective:
      "Separate poke, peek, and effect evidence before interpreting NockApp lab output."
  },
  {
    domainId: "pma-durability",
    anchorIds: ["nockapp-snapshot-safety", "pma-open-growth"],
    objective:
      "Treat PMA and state jams as provenance metadata, never as raw artifacts to persist."
  },
  {
    domainId: "wallet-cli",
    anchorIds: ["wallet-cli-commands", "wallet-create-tx-with-planner", "wallet-tx-planner"],
    objective:
      "Connect wallet commands, transaction planning, and endpoint mode to balance and withdrawal receipts."
  },
  {
    domainId: "bridge-withdrawal",
    anchorIds: ["bridge-withdrawal-runtime", "bridge-sequencer-journal"],
    objective:
      "Map withdrawal lifecycle evidence into bridge and VESL receipts without leaking raw transactions or signing keys."
  },
  {
    domainId: "nockup-scaffold",
    anchorIds: ["nockup-main"],
    objective:
      "Use upstream nockup entrypoints to turn scaffold/build/run evidence into reusable NockApp fixtures."
  }
] as const;

function sourceUrl(commitSha: string, sourcePath: string, lineRange: string) {
  const match = lineRange.match(/^L(\d+)-L(\d+)$/);
  const suffix = match ? `#L${match[1]}-L${match[2]}` : "";

  return `https://github.com/nockchain/nockchain/blob/${commitSha}/${sourcePath}${suffix}`;
}

export function createNockchainRustSourceGuide() {
  const upstream = nockchainUpstreamIntelligence;
  const sourceCommit = upstream.latestCommit.sha;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/rust-source`,
    generatedAt: "2026-06-06T08:50:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: sourceCommit,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease,
      protocol: upstream.protocol.currentTrack,
      docs: upstream.docs.canonicalSpine.map((source) => source.path)
    },
    sourceDomains: [...sourceDomains],
    sourceAnchors: sourceAnchors.map((anchor) => ({
      ...anchor,
      sourceCommit,
      sourceUrl: sourceUrl(sourceCommit, anchor.sourcePath, anchor.lineRange),
      watchRefs: "watchRefs" in anchor ? [...anchor.watchRefs] : []
    })),
    sourceTraceContract,
    learningPath: [...learningPath],
    nocksperimentalImplications: [
      "Use this guide when a receipt needs exact Rust source evidence, not just crate-level provenance.",
      "Refresh anchors when the upstream commit, release, source line range, or open issue watch changes.",
      "Pair every source anchor with a cargo gate and forbidden-field guard before accepting user-connected fakenet evidence.",
      "Treat source URLs as implementation proof and Tier 0 docs as protocol authority."
    ],
    links: {
      upstream: upstream.canonicalUrl,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      nockappSource: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      syncGossip: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      bridgeSource: `${registryCanonicalBaseUrl}/api/nockchain/bridge-source`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      repository: upstream.links.repository,
      release: upstream.links.release,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
