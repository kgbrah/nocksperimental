import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const scriptSources = [
  {
    id: "fakenet-node",
    path: "scripts/run_nockchain_node_fakenet.sh",
    command:
      "nockchain --fakenet --bind-public-grpc-addr 127.0.0.1:5555 --bind /ip4/127.0.0.1/udp/3006/quic-v1",
    operationalUse:
      "Start the local fakenet hub/node with public local gRPC and a fixed UDP/QUIC bind address.",
    evidenceToCapture:
      "Capture endpoint, bind multiaddr, process start time, Nockchain commit, and whether chain evidence reports peers and tip context."
  },
  {
    id: "fakenet-miner",
    path: "scripts/run_nockchain_miner_fakenet.sh",
    command:
      "nockchain --mine --fakenet --mining-pkh ${MINING_PKH} --peer /ip4/127.0.0.1/udp/3006/quic-v1 --no-default-peers",
    operationalUse:
      "Mine against the local fakenet node by explicitly peering to the hub and disabling default peers.",
    evidenceToCapture:
      "Capture MINING_PKH, peer multiaddr, wallet endpoint mode, connected peer count, height, and block commitment before interpreting mined output."
  },
  {
    id: "mainnet-node",
    path: "scripts/run_nockchain_node.sh",
    command: "nockchain",
    operationalUse:
      "Start a non-mining Nockchain node from the current environment and persisted state.",
    evidenceToCapture:
      "Capture build/release, data directory identity, peer count, height, sync mode, and PMA/state artifact provenance."
  },
  {
    id: "mainnet-miner",
    path: "scripts/run_nockchain_miner.sh",
    command: "nockchain --mining-pkh ${MINING_PKH} --mine --num-threads $num_threads",
    operationalUse:
      "Start a miner with logical CPU count minus two threads, bounded to at least one mining thread.",
    evidenceToCapture:
      "Capture MINING_PKH, computed --num-threads, CPU/thread context, connected peers, sync status, and wallet balance context."
  }
] as const;

const triageScenarios = [
  {
    id: "empty-routing-table",
    title: "Routing table is empty",
    symptom: "routing table is empty",
    interpretation:
      "The node has not discovered usable peers for the target network. On fakenet, verify the hub/miner peer multiaddrs and WSL UDP/QUIC reachability before treating mining output as evidence.",
    upstreamSignal:
      "Fakenet scripts pin the hub bind address to /ip4/127.0.0.1/udp/3006/quic-v1 and the miner peers to that address with --no-default-peers.",
    relatedCrates: ["nockchain", "nockchain-libp2p-io", "nockapp-grpc"],
    checks: [
      "Compare the running process against scripts/run_nockchain_node_fakenet.sh.",
      "Confirm the miner uses scripts/run_nockchain_miner_fakenet.sh or an equivalent explicit --peer.",
      "Check WSL firewall, localhost forwarding, and UDP/QUIC reachability."
    ],
    evidenceToCapture: ["bind multiaddr", "peer multiaddr", "peer count", "route-table status"]
  },
  {
    id: "no-connected-peers",
    title: "No connected peers",
    symptom: "No connected peers",
    interpretation:
      "Mining against zero connected peers can produce stale tip context and misleading commitment checks.",
    upstreamSignal:
      "The current fakenet miner script disables default peers, so the explicit fakenet hub peer must be reachable.",
    relatedCrates: ["nockchain", "nockchain-libp2p-io"],
    checks: [
      "Confirm peerCount is greater than zero before submitting fakenet evidence.",
      "Keep hub and miner on the same fakenet, data directory family, and peer configuration.",
      "Regenerate chain evidence immediately after peer changes."
    ],
    evidenceToCapture: ["peerCount", "height", "tip timestamp", "miner peer argument"]
  },
  {
    id: "wrong-block-commitment",
    title: "Wrong block commitment",
    symptom: "wrong block commitment",
    interpretation:
      "A wrong commitment usually means the miner, wallet, or test expectation is looking at a different fakenet tip or state artifact than the node.",
    upstreamSignal:
      "The latest Nockchain build is centered on behind-tip behavior; block commitments should only be compared after sync and state-artifact provenance are known.",
    relatedCrates: ["nockchain", "nockchain-types", "nockvm/rust/nockvm"],
    checks: [
      "Confirm the node is caught up before comparing commitments.",
      "Verify checkpoint or state-jam provenance matches network, height, event boundary, and Nockchain commit.",
      "Capture the commitment and upstream build in the same receipt."
    ],
    evidenceToCapture: ["blockCommitment", "height", "stateJamFingerprint", "Nockchain build"]
  },
  {
    id: "behind-tip-gossip-suppression",
    title: "Behind-tip gossip suppression",
    symptom: "node is syncing or appears quiet while behind tip",
    interpretation:
      "A node that is behind tip can intentionally suppress outgoing gossip while catching up; quiet gossip is not by itself proof that mining or networking is broken.",
    upstreamSignal: nockchainUpstreamIntelligence.latestCommit.message,
    relatedCrates: ["nockchain", "nockchain-libp2p-io"],
    checks: [
      "Record sync mode or tip evidence before diagnosing peer/mining symptoms.",
      "Wait for catch-up hysteresis to clear before rechecking gossip-dependent behavior.",
      "Treat no-peers plus behind-tip evidence as a sync/network triage path, not immediate test failure."
    ],
    evidenceToCapture: ["sync mode", "behind-tip estimate", "gossip suppression metric", "latest observed height"]
  },
  {
    id: "grpc-unreachable",
    title: "Local fakenet gRPC unreachable",
    symptom: "ECONNREFUSED or endpoint not reachable",
    interpretation:
      "The local evidence commands cannot reach the fakenet gRPC endpoint. Start the fakenet node, verify port 5555, then regenerate evidence.",
    upstreamSignal:
      "scripts/run_nockchain_node_fakenet.sh binds public local gRPC at 127.0.0.1:5555.",
    relatedCrates: ["nockapp-grpc", "nockchain"],
    checks: [
      "Confirm the fakenet process is running.",
      "Confirm 127.0.0.1:5555 is reachable from the shell running Nocksperimental checks.",
      "Keep public gRPC local/private unless the endpoint has explicit access controls."
    ],
    evidenceToCapture: ["endpoint", "process id", "connection error", "shell namespace"]
  },
  {
    id: "wallet-balance-unknown",
    title: "Wallet balance unknown",
    symptom: "balance check failed or wallet address context is missing",
    interpretation:
      "Wallet and miner evidence must name the address, endpoint mode, and sync context before balance or reward expectations can be trusted.",
    upstreamSignal:
      "Wallet commands are operator-facing; Nocksperimental should preserve wallet address and endpoint provenance instead of treating balance as a naked number.",
    relatedCrates: ["nockchain-wallet", "nockchain-api"],
    checks: [
      "Record wallet address, endpoint, and whether the wallet is watch-only or signing.",
      "Regenerate balance evidence after node sync changes.",
      "Never store seed phrases, private keys, wallet exports, or raw key material."
    ],
    evidenceToCapture: ["walletAddress", "endpoint", "balance output hash", "watch-only/signing mode"]
  },
  {
    id: "state-jam-provenance",
    title: "State-jam provenance required",
    symptom: "bootstrap state, checkpoint, PMA, or state jam was imported or considered",
    interpretation:
      "State artifacts are durable runtime/chain state. Treat them as metadata-only external inputs and never store raw PMA slabs, event logs, checkpoints, state jams, wallet exports, seed phrases, or private keys.",
    upstreamSignal:
      "PMA/state-jam safety policy is recorded in the Nockchain upstream intelligence and state-jam registry.",
    relatedCrates: ["nockvm/rust/nockvm", "nockchain", "noun-serde"],
    checks: [
      "Record source URL or Drive folder id, filename, size, hash, network, height/event boundary, and producing build.",
      "Verify consumer build compatibility before trusting decoded state.",
      "Keep raw state artifacts out of git and out of Nocksperimental receipts."
    ],
    evidenceToCapture: ["source URL", "hash", "checkpoint height or event boundary", "Nockchain build or commit"]
  }
] as const;

export function createNockchainOperationsAtlas() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
    generatedAt: "2026-06-05T23:40:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      protocol: upstream.protocol.currentTrack,
      docs: upstream.docs.canonicalSpine.map((source) => source.path)
    },
    scriptSources,
    triageScenarios,
    operatorChecklist: [
      "Confirm the node is caught up before mining or interpreting block commitments.",
      "Confirm fakenet node and miner use matching data dirs, bootstrap peer, bind address, and wallet endpoint mode.",
      "Verify peer multiaddrs plus UDP/QUIC ports are reachable from the laptop and WSL network namespace.",
      "Capture peer count, height, block commitment, wallet address, endpoint, and Nockchain build in the same evidence receipt.",
      "Record state-jam/checkpoint source URL, hash, height/event boundary, and Nockchain build before trusting bootstrap state.",
      "Keep raw PMA slabs, event logs, checkpoints, state jams, keys, seed phrases, and wallet exports out of git and receipts."
    ],
    stateArtifactSafety: {
      posture: upstream.safety.stateArtifacts.posture,
      doNotStore: upstream.safety.stateArtifacts.doNotStore,
      metadataToTrack: upstream.safety.stateArtifacts.metadataToTrack
    },
    links: {
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      release: upstream.links.release,
      localDiagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      fakenetRunbook: `${registryCanonicalBaseUrl}/api/fakenet/runbook.sh`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
