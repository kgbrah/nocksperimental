import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const upstreamFileBaseUrl =
  "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18";

function sourceUrl(file: string, start: number, end: number) {
  return `${upstreamFileBaseUrl}/${file}#L${start}-L${end}`;
}

const sourceAnchors = [
  {
    id: "scenario-yaml-schema",
    file: "crates/nockchain-testkit/src/scenario.rs",
    lineRange: "1-430",
    symbols: [
      "Scenario",
      "Scenario::load_from_path",
      "NodeSpec",
      "Action",
      "WalletCapture",
      "Assert"
    ],
    sourceUrls: [
      sourceUrl("crates/nockchain-testkit/src/scenario.rs", 1, 220),
      sourceUrl("crates/nockchain-testkit/src/scenario.rs", 220, 430)
    ],
    role:
      "Defines the YAML scenario grammar that upstream E2E tests use for nodes, actions, wallet captures, and assertions.",
    evidence:
      "The schema names node topology, fakenet options, wallet operations, partitions, upgrades, gRPC waits, transaction checks, and assertion contracts.",
    receiptFields: ["scenarioName", "scenarioSeed", "nodeIds", "stepRecords", "assertOutcomes"]
  },
  {
    id: "runner-scenario-lifecycle",
    file: "crates/nockchain-e2e/src/runner.rs",
    lineRange: "33-620",
    symbols: ["RunOptions", "run_scenario", "expand_node_env", "run_inner", "run_steps"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/runner.rs", 33, 125),
      sourceUrl("crates/nockchain-e2e/src/runner.rs", 200, 620)
    ],
    role:
      "Loads a scenario, seeds runtime ports and env vars, manages a run directory, executes actions/assertions, and writes the final report.",
    evidence:
      "run_scenario creates run_id/run_dir/report state, run_inner starts and shuts down nodes, and run_steps records action and assertion outcomes.",
    receiptFields: ["scenarioName", "runId", "stepRecords", "assertOutcomes", "artifactHash"]
  },
  {
    id: "node-manager-process-docker",
    file: "crates/nockchain-e2e/src/node.rs",
    lineRange: "28-230, 729-1045",
    symbols: [
      "NodeMode",
      "NodeManager",
      "NodeManager::start_nodes",
      "stop_nodes",
      "restart_nodes",
      "spawn_process_node",
      "spawn_docker_node"
    ],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/node.rs", 28, 230),
      sourceUrl("crates/nockchain-e2e/src/node.rs", 729, 1045)
    ],
    role:
      "Controls process-mode and Docker-mode Nockchain nodes with resolved public/private gRPC and p2p ports.",
    evidence:
      "NodeManager starts, stops, and restarts nodes, writes stdout/stderr logs, and maps Docker ports while keeping node ids and data directories explicit.",
    receiptFields: ["nodeIds", "nodeMode", "baseGrpcPort", "basePrivateGrpcPort", "baseP2pPort"]
  },
  {
    id: "node-command-args",
    file: "crates/nockchain-e2e/src/node.rs",
    lineRange: "826-1045",
    symbols: ["build_node_args", "build_node_args_docker", "topology_peer_arg"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/node.rs", 826, 918),
      sourceUrl("crates/nockchain-e2e/src/node.rs", 919, 1045)
    ],
    role:
      "Materializes scenario node specs into CLI args for fakenet, mining, topology peers, force peers, v1/bythos phases, and genesis/update options.",
    evidence:
      "The builder covers public/private gRPC binds, --fakenet, --new, --mine, --mining-pkh, --no-default-peers, peer flags, and phase-specific fakenet parameters.",
    receiptFields: ["nodeIds", "nodeMode", "fakenetPhase", "baseP2pPort", "miningPublicKeyHash"]
  },
  {
    id: "grpc-readiness-height",
    file: "crates/nockchain-e2e/src/grpc.rs",
    lineRange: "85-160, 262-320",
    symbols: ["wait_for_ready", "wait_for_height", "wait_for_height_private"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/grpc.rs", 85, 160),
      sourceUrl("crates/nockchain-e2e/src/grpc.rs", 262, 320)
    ],
    role:
      "Polls public/private gRPC readiness and height so a scenario can distinguish boot, sync, and endpoint failures.",
    evidence:
      "The helpers retry endpoint probes with deadlines and return observed height/readiness state instead of treating startup timing as a test result.",
    receiptFields: ["baseGrpcPort", "basePrivateGrpcPort", "finalHeights", "stepRecords"]
  },
  {
    id: "grpc-transaction-lifecycle",
    file: "crates/nockchain-e2e/src/grpc.rs",
    lineRange: "452-532, 607-625",
    symbols: ["submit_raw_tx", "transaction_accepted", "wait_for_tx_in_block"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/grpc.rs", 452, 532),
      sourceUrl("crates/nockchain-e2e/src/grpc.rs", 607, 625)
    ],
    role:
      "Separates raw transaction submission, node acceptance, and observed block inclusion.",
    evidence:
      "The code records submit ack/error, accepted transaction state, and tx-in-block waits as distinct scenario outcomes.",
    receiptFields: ["transactionHash", "transactionAccepted", "transactionBlockId", "assertOutcomes"]
  },
  {
    id: "private-poke-mining-controls",
    file: "crates/nockchain-e2e/src/grpc.rs",
    lineRange: "626-712",
    symbols: ["poke_private", "set_mining_pkh_live", "set_mining_enabled"],
    sourceUrls: [sourceUrl("crates/nockchain-e2e/src/grpc.rs", 626, 712)],
    role:
      "Exercises private gRPC pokes for live mining key and mining-enabled controls.",
    evidence:
      "The helpers send private pokes to mutate local mining behavior without making public endpoint state or wallet secrets part of the receipt.",
    receiptFields: ["basePrivateGrpcPort", "miningPublicKeyHash", "miningEnabled", "stepRecords"]
  },
  {
    id: "report-json-contract",
    file: "crates/nockchain-e2e/src/report.rs",
    lineRange: "1-155",
    symbols: ["Report", "StepRecord", "AssertOutcome", "NodeSummary", "Report::write_json"],
    sourceUrls: [sourceUrl("crates/nockchain-e2e/src/report.rs", 1, 155)],
    role:
      "Defines the upstream JSON report vocabulary for scenario status, steps, assertions, node summaries, and timestamps.",
    evidence:
      "Report::write_json persists a pretty JSON report with scenario, seed, run id, status/error, started/finished epoch fields, step records, assert outcomes, and node summaries.",
    receiptFields: ["scenarioName", "scenarioSeed", "runId", "stepRecords", "assertOutcomes", "artifactHash"]
  },
  {
    id: "peer-speedup-report",
    file: "crates/nockchain-e2e/src/peer_speedup.rs",
    lineRange: "38-120, 194-230",
    symbols: ["AssertPeerSpeedupOptions", "AssertPeerSpeedupReport", "assert_peer_speedup"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/peer_speedup.rs", 38, 120),
      sourceUrl("crates/nockchain-e2e/src/peer_speedup.rs", 194, 230)
    ],
    role:
      "Produces gen1/gen2 peer request/response comparison reports for throughput, request count, and latency ratios.",
    evidence:
      "assert_peer_speedup writes a JSON report and fails when gen2 ratios do not meet the configured threshold.",
    receiptFields: ["scenarioName", "peerSpeedupRatio", "artifactHash", "assertOutcomes"]
  },
  {
    id: "upgrade-cluster-harness",
    file: "crates/nockchain-e2e/src/upgrade.rs",
    lineRange: "1-360",
    symbols: ["UpgradeTestConfig", "NockchainCluster", "WalletClient"],
    sourceUrls: [
      sourceUrl("crates/nockchain-e2e/src/upgrade.rs", 1, 180),
      sourceUrl("crates/nockchain-e2e/src/upgrade.rs", 180, 360)
    ],
    role:
      "Builds upgrade-focused fakenet clusters and wallet clients around activation height, phase flags, mining pkh, and private wallet commands.",
    evidence:
      "The harness constructs a single-node fakenet with bythos/v1 phase settings and runs wallet commands against private gRPC ports.",
    receiptFields: ["fakenetPhase", "activationHeight", "basePrivateGrpcPort", "assertOutcomes"]
  },
  {
    id: "nous-gen2-scenarios",
    file: "tests/e2e/scenarios/nous_testnet_gen2_send.yaml",
    lineRange: "1-180",
    symbols: ["nous_testnet_gen2_send.yaml", "nous_gen2_partition_reorg.yaml"],
    sourceUrls: [
      sourceUrl("tests/e2e/scenarios/nous_testnet_gen2_send.yaml", 1, 180),
      sourceUrl("tests/e2e/scenarios/nous_gen2_partition_reorg.yaml", 1, 160)
    ],
    role:
      "Shows upstream testnet-style scenarios for gen2 request/response sends, wallet setup, partition, and reorg behavior.",
    evidence:
      "The YAML scenarios combine miners, full nodes, fakenet ports, gen2 env flags, wallet captures, mining pkh updates, block stuffer commands, and partition/reorg waits.",
    receiptFields: ["scenarioName", "fakenetPhase", "nodeIds", "stepRecords", "assertOutcomes"]
  }
] as const;

const scenarioCapabilities = [
  {
    id: "process-and-docker-nodes",
    label: "Process and Docker nodes",
    sourceAnchorIds: ["node-manager-process-docker"],
    receiptFields: ["nodeIds", "nodeMode", "baseGrpcPort", "baseP2pPort"],
    interpretation:
      "A receipt should say whether the scenario ran local processes or Docker containers before comparing ports, logs, or timing."
  },
  {
    id: "fakenet-mining-and-peer-topology",
    label: "Fakenet mining and peer topology",
    sourceAnchorIds: ["node-command-args", "private-poke-mining-controls"],
    receiptFields: ["fakenetPhase", "miningPublicKeyHash", "baseP2pPort", "stepRecords"],
    interpretation:
      "Mining and topology evidence should keep peer args, phase flags, and mining pkh metadata while excluding keys and raw node logs."
  },
  {
    id: "grpc-readiness-height-and-head-equality",
    label: "gRPC readiness, height, and heads",
    sourceAnchorIds: ["grpc-readiness-height", "runner-scenario-lifecycle"],
    receiptFields: ["baseGrpcPort", "basePrivateGrpcPort", "finalHeights", "finalBlockIds"],
    interpretation:
      "Readiness, height, and head equality checks separate node startup/sync state from application-level test failure."
  },
  {
    id: "wallet-command-capture-and-retry",
    label: "Wallet command capture and retry",
    sourceAnchorIds: ["scenario-yaml-schema", "runner-scenario-lifecycle"],
    receiptFields: ["walletAddress", "walletCommandName", "stepRecords", "artifactHash"],
    interpretation:
      "Wallet evidence belongs in summarized command/capture metadata, never raw wallet exports, seeds, or private spend keys."
  },
  {
    id: "transaction-accepted-and-in-block",
    label: "Transaction accepted and in block",
    sourceAnchorIds: ["grpc-transaction-lifecycle"],
    receiptFields: ["transactionHash", "transactionAccepted", "transactionBlockId", "assertOutcomes"],
    interpretation:
      "Accepted-by-node and included-in-block are distinct assertions and should remain distinct in Nocksperimental receipts."
  },
  {
    id: "partition-reorg-and-upgrade",
    label: "Partition, reorg, and upgrade",
    sourceAnchorIds: ["scenario-yaml-schema", "upgrade-cluster-harness", "nous-gen2-scenarios"],
    receiptFields: ["scenarioName", "fakenetPhase", "activationHeight", "finalBlockIds"],
    interpretation:
      "Partition, reorg, and upgrade scenarios need explicit phase and activation context before they inform fakenet or testnet assumptions."
  },
  {
    id: "gen2-req-res-peer-speedup",
    label: "Gen2 request/response peer speedup",
    sourceAnchorIds: ["peer-speedup-report", "nous-gen2-scenarios"],
    receiptFields: ["peerSpeedupRatio", "scenarioName", "artifactHash", "assertOutcomes"],
    interpretation:
      "Gen2 peer-speedup evidence should cite ratios and report hashes rather than raw sample dumps unless the operator keeps them local."
  },
  {
    id: "report-json-node-summaries",
    label: "Report JSON node summaries",
    sourceAnchorIds: ["report-json-contract", "runner-scenario-lifecycle"],
    receiptFields: ["runId", "stepRecords", "assertOutcomes", "finalHeights", "artifactHash"],
    interpretation:
      "Nocksperimental can treat upstream report.json as the source vocabulary, then publish summarized fields and hashes."
  }
] as const;

const receiptContract = {
  requiredFields: [
    "scenarioName",
    "scenarioSeed",
    "runId",
    "nockchainCommit",
    "nockchainBuild",
    "nodeIds",
    "nodeMode",
    "baseGrpcPort",
    "basePrivateGrpcPort",
    "baseP2pPort",
    "fakenetPhase",
    "stepRecords",
    "assertOutcomes",
    "finalHeights",
    "finalBlockIds",
    "artifactHash"
  ],
  forbiddenFields: [
    "walletSeedPhrase",
    "privateSpendKey",
    "rawWalletExport",
    "rawPmaSlab",
    "rawStateJam",
    "rawEventLog",
    "rawStdoutLog",
    "rawStderrLog",
    "rawTransactionPayload"
  ],
  reviewRules: [
    "Publish scenario names, seeds, node ids, ports, hashes, status labels, and source anchors, not raw node logs or state artifacts.",
    "Keep accepted transaction and block inclusion evidence separate because upstream models them as separate gRPC checks.",
    "Attach fakenet phase, activation height, and upstream build before using an upgrade or partition scenario as a product assumption.",
    "Hash report JSON and local artifacts before linking them to Launch Evidence, VESL, Nockup, or BYO fakenet receipts."
  ]
} as const;

const localVerification = {
  status: "source-inspected",
  inspectedSourceCommit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  recommendedCommands: [
    "cargo check -p nockchain-testkit",
    "cargo check -p nockchain-e2e",
    "cargo test -p nockchain-testkit",
    "cargo test -p nockchain-e2e --lib"
  ],
  notes: [
    "Nocksperimental currently records source-level evidence and does not claim these upstream cargo gates passed in production.",
    "Run E2E scenarios in an isolated upstream checkout before treating report hashes as release-blocking validation evidence."
  ]
} as const;

export function createNockchainTestkitE2eTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/testkit-e2e`,
    generatedAt: "2026-06-06T10:14:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url,
      crateSurfaces: ["nockchain-testkit", "nockchain-e2e"]
    },
    sourceAnchors,
    scenarioCapabilities,
    receiptContract,
    localVerification,
    nocksperimentalImplications: [
      "Nocksperimental can expose an upstream-compatible scenario and receipt vocabulary for anyone connecting a fakenet.",
      "BYO fakenets should map endpoint, wallet, node, transaction, and peer evidence to the same NodeSpec, Action, Assert, and Report concepts.",
      "Support bundles should publish report JSON summaries and artifact hashes, not raw logs, raw state jams, PMA slabs, or raw transactions.",
      "Nous/gen2 scenario semantics can shape local fakenet sync, peer, partition, reorg, and wrong-commitment diagnostics.",
      "Launch Evidence, VESL, and Nockup receipts can cite scenario capability ids before using a test result as product proof."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/testkit-e2e`,
      upstream: upstream.links.repository,
      repository: upstream.links.repository,
      operations: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      syncGossip: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      runtimeSafety: `${registryCanonicalBaseUrl}/api/nockchain/runtime-safety`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
