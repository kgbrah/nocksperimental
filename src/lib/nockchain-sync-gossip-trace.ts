import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const sourceAnchors = [
  {
    id: "catch-up-signal",
    file: "crates/nockchain-libp2p-io/src/catch_up.rs",
    symbol: "CatchUpSignal::is_catching_up",
    lineHint: 148,
    role: "Reports whether the node is in SyncMode::CatchingUp.",
    evidence:
      "Cold and Tip both return false; CatchingUp returns true and is the predicate for outgoing gossip suppression."
  },
  {
    id: "catch-up-refresh",
    file: "crates/nockchain-libp2p-io/src/catch_up.rs",
    symbol: "CatchUpSignal::refresh_mode",
    lineHint: 224,
    role: "Lets read-side traffic gates expire CatchingUp -> Tip hysteresis without waiting for a new block event.",
    evidence:
      "The upstream test refresh_exits_catching_up_after_hysteresis_without_new_input proves refresh_mode exits CatchingUp after the drained window."
  },
  {
    id: "p2p-state-gate",
    file: "crates/nockchain-libp2p-io/src/p2p_state.rs",
    symbol: "P2PState::should_suppress_outgoing_gossip",
    lineHint: 2518,
    role: "Refreshes catch-up mode and returns whether outbound gossip should be suppressed.",
    evidence:
      "The gate deliberately covers historic block rebroadcasts, tx submission gossip, and mining output while behind tip."
  },
  {
    id: "driver-gossip-effect",
    file: "crates/nockchain-libp2p-io/src/driver.rs",
    symbol: "EffectType::Gossip",
    lineHint: 1180,
    role: "Classifies kernel %gossip effects, clears heard-block serve caches, and either suppresses or fans out gossip.",
    evidence:
      "When suppression is true, the driver skips every per-peer SendRequest and increments gossip_suppressed_behind_tip_total."
  },
  {
    id: "suppression-metric",
    file: "crates/nockchain-libp2p-io/src/metrics.rs",
    symbol: "gossip_suppressed_behind_tip_total",
    lineHint: 389,
    role: "Counts kernel-emitted %gossip effects dropped while the node is catching up.",
    evidence:
      "The metric should fall to roughly zero after a node reaches Tip; nonzero values explain quiet local gossip."
  },
  {
    id: "driver-suppression-test",
    file: "crates/nockchain-libp2p-io/src/driver/tests.rs",
    symbol: "test_gossip_effect_suppresses_all_outbound_gossip_while_catching_up",
    lineHint: 8178,
    role: "Proves a catching-up node fans out zero heard-block/heard-tx gossip and increments the suppression metric.",
    evidence:
      "The test builds a deferred backlog, emits heard-block and heard-tx gossip effects, observes no swarm messages, and expects metric count 2."
  }
] as const;

const behaviorInvariants = [
  {
    id: "cold-does-not-suppress",
    rule: "Cold at boot does not suppress because the node has not yet proven it is behind tip.",
    sourceAnchorIds: ["catch-up-signal", "p2p-state-gate"]
  },
  {
    id: "catching-up-suppresses-all-gossip",
    rule: "CatchingUp suppresses every outbound gossip kind: historic block rebroadcasts, tx submission gossip, and mining output.",
    sourceAnchorIds: ["catch-up-signal", "driver-gossip-effect", "driver-suppression-test"]
  },
  {
    id: "tip-does-not-suppress",
    rule: "Tip does not suppress; once catch-up hysteresis expires, normal per-peer gossip fan-out resumes.",
    sourceAnchorIds: ["catch-up-refresh", "p2p-state-gate"]
  },
  {
    id: "hysteresis-refresh-exits-catching-up",
    rule: "refresh_mode lets the driver-side read gate move from CatchingUp to Tip after the drained hysteresis window.",
    sourceAnchorIds: ["catch-up-refresh", "p2p-state-gate"]
  }
] as const;

const triageScenarios = [
  {
    id: "wrong-block-commitment-while-catching-up",
    symptom: "wrong block commitment while a node is still catching up or consuming stale state",
    likelyMeaning:
      "A local miner or receipt may be comparing against a non-tip state, mismatched state-jam source, or suppressed gossip window.",
    firstChecks: [
      "syncMode",
      "behindTipEstimate",
      "stateJamFingerprint",
      "nockchainCommit",
      "routeTableSize"
    ],
    nextAction:
      "Do not classify the commitment as an app failure until the node is at Tip and state-jam provenance matches the intended network."
  },
  {
    id: "empty-routing-table-with-quiet-node",
    symptom: "routing table is empty and the node is quiet",
    likelyMeaning:
      "Peer discovery or local bind/peer configuration may be wrong, but a catching-up node can also intentionally avoid originating gossip.",
    firstChecks: ["connectedPeerCount", "routeTableSize", "syncMode", "fakenetBindAddr", "peerMultiaddr"],
    nextAction:
      "Separate no-peer connectivity from behind-tip quietness before restarting miners or changing state."
  },
  {
    id: "miner-output-not-gossiped",
    symptom: "mining output is produced locally but not gossiped",
    likelyMeaning:
      "The driver suppresses mining-output gossip while CatchingUp so stale or out-of-order work does not pollute peers.",
    firstChecks: ["syncMode", "gossipSuppressedBehindTipTotal", "tipStatus", "minerCommitment"],
    nextAction: "Wait for Tip or prove the fakenet is intentionally isolated before treating miner silence as a bug."
  },
  {
    id: "stale-tx-gossip-suppressed",
    symptom: "tx submission gossip does not fan out while syncing",
    likelyMeaning:
      "The same suppression gate covers heard-tx and future gossip kinds, not just heard-block rebroadcasts.",
    firstChecks: ["syncMode", "walletEndpointMode", "txAcceptedPublicApiOnly", "gossipSuppressedBehindTipTotal"],
    nextAction:
      "Use wallet/API evidence and endpoint mode to distinguish transaction status from p2p gossip suppression."
  }
] as const;

const receiptFields = [
  "syncMode",
  "behindTipEstimate",
  "gossipSuppressedBehindTipTotal",
  "routeTableSize",
  "connectedPeerCount",
  "tipStatus",
  "stateJamFingerprint",
  "nockchainCommit",
  "nockchainRelease",
  "fakenetBindAddr",
  "peerMultiaddr",
  "walletEndpointMode"
] as const;

export function createNockchainSyncGossipTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
    generatedAt: "2026-06-05T18:25:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      crate: "nockchain-libp2p-io",
      sourceCommitUrl: upstream.latestCommit.url
    },
    sourceAnchors,
    behaviorInvariants,
    triageScenarios,
    receiptFields,
    localVerification: {
      status: "source-inspected-cargo-timeout",
      attemptedCommands: ["cargo test -p nockchain-libp2p-io suppress_outgoing_gossip --lib"],
      result:
        "The narrow upstream cargo test compile exceeded the local five-minute turn budget, so Nocksperimental records source and upstream test inspection rather than claiming a local Rust test pass.",
      inspectedUpstreamTests: [
        "refresh_exits_catching_up_after_hysteresis_without_new_input",
        "is_catching_up_only_in_catching_up_mode",
        "suppress_outgoing_gossip_only_while_catching_up",
        "suppress_outgoing_gossip_refreshes_hysteresis_before_reading",
        "test_gossip_effect_suppresses_all_outbound_gossip_while_catching_up"
      ]
    },
    operatorChecklist: [
      "Do not treat quiet mining output as failure until syncMode is Tip.",
      "Record gossip_suppressed_behind_tip_total with fakenet diagnostics when available.",
      "Capture behindTipEstimate, connectedPeerCount, and routeTableSize before interpreting wrong block commitments.",
      "Keep state-jam/checkpoint provenance attached to any commitment or balance receipt.",
      "Distinguish no-peer networking faults from intentional behind-tip gossip suppression."
    ],
    nocksperimentalImplications: [
      "Fakenet readiness should expose sync mode and behind-tip estimate beside peer counts.",
      "Miner receipts should preserve whether mining output was eligible to gossip.",
      "Wallet/transaction receipts should not use tx gossip silence as acceptance evidence.",
      "Support bundles should include the upstream commit and libp2p source-trace id when diagnosing no-peers or wrong commitments."
    ],
    links: {
      upstream: upstream.canonicalUrl,
      zorpMap: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      operations: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      wallet: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      diagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      syncGossipPage: `${registryCanonicalBaseUrl}/nockchain/sync-gossip`,
      commit: upstream.latestCommit.url,
      release: upstream.latestRelease.url
    }
  };
}
