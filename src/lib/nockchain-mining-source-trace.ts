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
    id: "fakenet-miner-script",
    file: "scripts/run_nockchain_miner_fakenet.sh",
    lineRange: "1-6",
    symbols: ["MINING_PKH", "--mine", "--fakenet", "--mining-pkh", "--peer", "--no-default-peers"],
    sourceUrls: [sourceUrl("scripts/run_nockchain_miner_fakenet.sh", 1, 6)],
    role:
      "Defines the upstream fakenet miner command source: load .env, export MINING_PKH, mine against a local fakenet peer, and suppress default peers.",
    evidence:
      "The script runs nockchain with --mine --fakenet --mining-pkh ${MINING_PKH}, dials /ip4/127.0.0.1/udp/3006/quic-v1, and uses --no-default-peers.",
    receiptFields: ["minerCommand", "networkMode", "miningPkh", "peerMultiaddr", "noDefaultPeers"]
  },
  {
    id: "node-fakenet-script",
    file: "scripts/run_nockchain_node_fakenet.sh",
    lineRange: "1-6",
    symbols: ["MINING_PKH", "--fakenet", "--bind-public-grpc-addr", "--bind"],
    sourceUrls: [sourceUrl("scripts/run_nockchain_node_fakenet.sh", 1, 6)],
    role:
      "Defines the local fakenet hub side that binds QUIC and public gRPC for local miner and wallet/API testing.",
    evidence:
      "The node script binds public gRPC to 127.0.0.1:5555 and QUIC to /ip4/127.0.0.1/udp/3006/quic-v1 while running --fakenet.",
    receiptFields: ["networkMode", "apiEndpoint", "peerMultiaddr", "hubBindMultiaddr"]
  },
  {
    id: "mainnet-miner-script",
    file: "scripts/run_nockchain_miner.sh",
    lineRange: "1-28",
    symbols: ["MINING_PKH", "get_cpu_count", "--mine", "--num-threads"],
    sourceUrls: [sourceUrl("scripts/run_nockchain_miner.sh", 1, 28)],
    role:
      "Defines upstream operator command shape for non-fakenet mining and automatic CPU-thread selection.",
    evidence:
      "The script exports MINING_PKH, computes logical CPU count, subtracts two threads with a minimum of one, and runs nockchain --mine --num-threads.",
    receiptFields: ["minerCommand", "networkMode", "miningPkh", "numThreads"]
  },
  {
    id: "mining-cli-flags",
    file: "crates/nockchain/src/config.rs",
    lineRange: "121-194",
    symbols: [
      "mine",
      "mining_pkh",
      "mining_pkh_adv",
      "num_threads",
      "fakenet_pow_len",
      "fakenet_log_difficulty"
    ],
    sourceUrls: [sourceUrl("crates/nockchain/src/config.rs", 121, 194)],
    role:
      "Declares the operator-facing mining and fakenet PoW flags that receipts must capture before interpreting mining results.",
    evidence:
      "Mining requires --mine with --mining-pkh or --mining-pkh-adv, supports --num-threads, and exposes fakenet-only PoW length and log difficulty overrides.",
    receiptFields: ["mineFlag", "miningPkh", "miningPkhMode", "numThreads", "fakenetPowLen", "fakenetLogDifficulty"]
  },
  {
    id: "fakenet-constants-poke",
    file: "crates/nockchain/src/lib.rs",
    lineRange: "416-440",
    symbols: ["fakenet_blockchain_constants", "PokeFakenetConstants", "with_asert_phase"],
    sourceUrls: [sourceUrl("crates/nockchain/src/lib.rs", 416, 440)],
    role:
      "Pokes fakenet blockchain constants into the kernel before fakenet operation and applies optional v1/bythos/ASERT/candidate interval overrides.",
    evidence:
      "The fakenet boot path constructs fakenet_blockchain_constants from CLI PoW length/log difficulty, applies phase overrides, and sends PokeFakenetConstants.",
    receiptFields: ["networkMode", "fakenetPowLen", "fakenetLogDifficulty", "fakenetAsertPhase", "candidateUpdateInterval"]
  },
  {
    id: "fakenet-blockchain-constants",
    file: "crates/nockchain-types/src/blockchain_constants.rs",
    lineRange: "510-526",
    symbols: [
      "DEFAULT_FAKENET_POW_LEN",
      "DEFAULT_FAKENET_LOG_DIFFICULTY",
      "fakenet_blockchain_constants",
      "with_genesis_target_atom_bex",
      "with_pow_len"
    ],
    sourceUrls: [sourceUrl("crates/nockchain-types/src/blockchain_constants.rs", 510, 526)],
    role:
      "Defines relaxed fakenet mining constants derived from mainnet defaults for local testing.",
    evidence:
      "Fakenet overrides update candidate interval, PoW length, genesis target by bex difficulty, first-month coinbase minimum, timelock minimum, base fee, and early phases.",
    receiptFields: ["fakenetPowLen", "fakenetLogDifficulty", "candidateUpdateInterval", "targetBex"]
  },
  {
    id: "mining-driver-bootstrap",
    file: "crates/nockchain/src/lib.rs",
    lineRange: "481-512",
    symbols: ["MiningPkhConfig", "create_mining_driver", "add_io_driver"],
    sourceUrls: [sourceUrl("crates/nockchain/src/lib.rs", 481, 512)],
    role:
      "Installs the mining driver with parsed public-key-hash target, mine flag, and thread count before libp2p and gRPC drivers.",
    evidence:
      "The node translates --mining-pkh into share=1 PKH config, derives mine/threads, creates the mining driver, and adds it to the NockApp.",
    receiptFields: ["miningPkh", "miningShare", "mineFlag", "numThreads", "driverInstalled"]
  },
  {
    id: "mining-wire-contract",
    file: "crates/nockchain/src/mining.rs",
    lineRange: "24-50",
    symbols: ["MiningWire", "MiningWire::Mined", "MiningWire::Candidate", "MiningWire::SetPubKey", "MiningWire::Enable"],
    sourceUrls: [sourceUrl("crates/nockchain/src/mining.rs", 24, 50)],
    role:
      "Names the typed mining wire tags used for key setup, enablement, candidate work, and mined-block submission.",
    evidence:
      "MiningWire maps SetPubKey to setpubkey, Enable to enable, Candidate to candidate, and Mined to mined under wire source miner version 1.",
    receiptFields: ["wireSource", "wireVersion", "requestMethod", "miningWireTag"]
  },
  {
    id: "candidate-effect-handler",
    file: "crates/nockchain/src/mining.rs",
    lineRange: "290-378",
    symbols: ["mine", "MiningData", "pow_len", "start_mining_attempt"],
    sourceUrls: [sourceUrl("crates/nockchain/src/mining.rs", 290, 378)],
    role:
      "Receives kernel %mine effects, captures version/header/target/pow_len, starts mining threads, and cancels stale attempts when a new candidate arrives.",
    evidence:
      "The driver accepts a %mine effect payload, stores block_header/version/target/pow_len, starts SerfThread miners, and cancels old attempts when the candidate changes.",
    receiptFields: ["candidateHeader", "candidateTarget", "candidatePowLen", "numThreads", "candidateChanged"]
  },
  {
    id: "mined-pow-poke",
    file: "crates/nockchain/src/mining.rs",
    lineRange: "386-525",
    symbols: ["create_poke", "set-mining-key-advanced", "enable-mining", "start_mining_attempt"],
    sourceUrls: [sourceUrl("crates/nockchain/src/mining.rs", 386, 525)],
    role:
      "Constructs candidate proof pokes, sets mining keys, enables mining, creates random nonce cells, and submits mined PoW back to the main kernel.",
    evidence:
      "The driver builds [version header nonce target pow_len], sends set-mining-key-advanced and enable-mining commands, then pokes MiningWire::Candidate on each mining attempt.",
    receiptFields: ["candidateHeader", "candidateTarget", "candidatePowLen", "nonceDigest", "miningPkh", "mineFlag"]
  },
  {
    id: "miner-kernel-pow-check",
    file: "hoon/apps/dumbnet/miner.hoon",
    lineRange: "38-60",
    symbols: ["prove-block-inner", "check-target:mine", "%mine-result", "%command %pow"],
    sourceUrls: [sourceUrl("hoon/apps/dumbnet/miner.hoon", 38, 60)],
    role:
      "Runs the miner kernel proof attempt and emits either success with command %pow or retry with the digest.",
    evidence:
      "The miner kernel builds prover input, calls prove-block-inner, checks proof hash against target, and returns %mine-result with success/failure.",
    receiptFields: ["candidateHeader", "candidateTarget", "candidatePowLen", "nonceDigest", "minedBlockDigest"]
  },
  {
    id: "pow-library",
    file: "hoon/common/pow.hoon",
    lineRange: "5-27",
    symbols: ["check-target", "prove-block-inner", "proof-to-pow"],
    sourceUrls: [sourceUrl("hoon/common/pow.hoon", 5, 27)],
    role:
      "Defines the common PoW target check and proof-to-pow digest conversion used by the miner kernel.",
    evidence:
      "check-target compares proof hash to target atom, and prove-block-inner dispatches proof versions 0/1/2 before converting proof to PoW.",
    receiptFields: ["candidateTarget", "proofVersion", "minedBlockDigest", "verificationStatus"]
  },
  {
    id: "candidate-block-state",
    file: "hoon/apps/dumbnet/lib/miner.hoon",
    lineRange: "86-113",
    symbols: ["update-candidate-block", "candidate-block", "add-txs-to-candidate"],
    sourceUrls: [sourceUrl("hoon/apps/dumbnet/lib/miner.hoon", 86, 113)],
    role:
      "Refreshes candidate block timestamp and transaction set when the candidate update interval is reached.",
    evidence:
      "The miner library updates candidate block timestamp, logs the change, and adds transactions to the candidate block.",
    receiptFields: ["candidateHeader", "candidateUpdateInterval", "candidateTxCount", "candidateChanged"]
  },
  {
    id: "structured-miner-traces",
    file: "crates/nockchain/src/traces.rs",
    lineRange: "1-17,76-110",
    symbols: ["new_heaviest_chain", "new_heaviest_miner", "block_height", "heaviest_block_digest"],
    sourceUrls: [
      sourceUrl("crates/nockchain/src/traces.rs", 1, 17),
      sourceUrl("crates/nockchain/src/traces.rs", 76, 110)
    ],
    role:
      "Translates miner and heaviest-chain kernel spans into stdout-visible structured events used by monitoring and tests.",
    evidence:
      "The traces driver records new_heaviest_chain and new_heaviest_miner with block height and digest fields.",
    receiptFields: ["heaviestMinerHeight", "heaviestChainDigest", "minedBlockDigest", "observedAt"]
  },
  {
    id: "libp2p-request-pow-separation",
    file: "crates/nockchain-libp2p-io/src/messages.rs",
    lineRange: "807-1130",
    symbols: ["gen2_pow_preimage", "gossip_pow_preimage", "solve_pow", "verify_pow", "AuthenticatedGossip"],
    sourceUrls: [sourceUrl("crates/nockchain-libp2p-io/src/messages.rs", 807, 1130)],
    role:
      "Separates network request/gossip EquiX anti-spam PoW from block-mining PoW so diagnostics do not conflate the two.",
    evidence:
      "Libp2p request PoW uses sender/receiver/message preimages, verifies inbound request PoW, and authenticates gossip independently of miner candidate proof.",
    receiptFields: ["networkPowVerified", "requestMethod", "connectedPeerCount", "routeTableSize"]
  }
] as const;

const miningCapabilities = [
  {
    id: "operator-fakenet-miner-command",
    label: "Operator fakenet miner command",
    sourceAnchorIds: ["fakenet-miner-script", "node-fakenet-script"],
    receiptFields: ["minerCommand", "networkMode", "peerMultiaddr", "noDefaultPeers"],
    interpretation:
      "Use the upstream fakenet scripts as command authority before deciding whether a local miner is pointed at the expected hub."
  },
  {
    id: "wallet-address-reward-target",
    label: "Wallet reward target",
    sourceAnchorIds: ["mining-cli-flags", "mining-driver-bootstrap", "mined-pow-poke"],
    receiptFields: ["miningPkh", "miningPkhMode", "miningShare"],
    interpretation:
      "Mining receipts should record the public key hash target while excluding wallet seed phrases and private spend keys."
  },
  {
    id: "fakenet-difficulty-controls",
    label: "Fakenet difficulty controls",
    sourceAnchorIds: ["mining-cli-flags", "fakenet-constants-poke", "fakenet-blockchain-constants"],
    receiptFields: ["fakenetPowLen", "fakenetLogDifficulty", "targetBex", "candidateUpdateInterval"],
    interpretation:
      "Fakenet mining can be intentionally easy; receipts need the exact PoW length/log difficulty before comparing mining rates."
  },
  {
    id: "candidate-block-refresh",
    label: "Candidate block refresh",
    sourceAnchorIds: ["candidate-effect-handler", "candidate-block-state", "structured-miner-traces"],
    receiptFields: ["candidateHeader", "candidateTarget", "candidateChanged", "heaviestChainDigest"],
    interpretation:
      "Wrong block commitment symptoms need the current candidate header/target and whether a new heaviest chain invalidated old work."
  },
  {
    id: "threaded-mining-driver",
    label: "Threaded mining driver",
    sourceAnchorIds: ["mainnet-miner-script", "candidate-effect-handler", "mined-pow-poke"],
    receiptFields: ["numThreads", "candidatePowLen", "nonceDigest"],
    interpretation:
      "Thread counts explain local resource use and mining-attempt cadence but are not proof of block acceptance."
  },
  {
    id: "proof-kernel-validation",
    label: "Proof kernel validation",
    sourceAnchorIds: ["miner-kernel-pow-check", "pow-library"],
    receiptFields: ["candidateHeader", "candidateTarget", "candidatePowLen", "minedBlockDigest"],
    interpretation:
      "Block mining evidence is anchored in the miner Hoon kernel and common PoW target check, not in libp2p request PoW."
  },
  {
    id: "mined-block-submission",
    label: "Mined block submission",
    sourceAnchorIds: ["mined-pow-poke", "mining-wire-contract", "structured-miner-traces"],
    receiptFields: ["minedBlockDigest", "heaviestMinerHeight", "verificationStatus"],
    interpretation:
      "A found proof must still be poked back into the main kernel and observed through heaviest-miner/chain traces before being treated as accepted."
  },
  {
    id: "trace-and-diagnostics",
    label: "Trace and diagnostics",
    sourceAnchorIds: ["structured-miner-traces", "candidate-effect-handler"],
    receiptFields: ["heaviestMinerHeight", "heaviestChainDigest", "syncMode", "observedAt"],
    interpretation:
      "Operator evidence should pair miner output with heaviest-chain/miner traces, sync mode, peer counts, and route-table state."
  },
  {
    id: "network-pow-separation",
    label: "Network PoW separation",
    sourceAnchorIds: ["libp2p-request-pow-separation"],
    receiptFields: ["networkPowVerified", "connectedPeerCount", "routeTableSize"],
    interpretation:
      "Libp2p EquiX request/gossip PoW protects network messages; it is distinct from block-mining proof and should be diagnosed separately."
  }
] as const;

const operationalModes = [
  {
    id: "local-fakenet-hub",
    label: "Local fakenet hub",
    commandSource: "scripts/run_nockchain_node_fakenet.sh",
    expectedSignals: ["public gRPC bound to 127.0.0.1:5555", "QUIC bound to UDP 3006"],
    receiptUse:
      "Record hub bind address, public API endpoint, fakenet constants, and genesis/state provenance before attaching miner evidence."
  },
  {
    id: "local-fakenet-miner",
    label: "Local fakenet miner",
    commandSource: "scripts/run_nockchain_miner_fakenet.sh",
    expectedSignals: ["--mine", "--fakenet", "--mining-pkh", "--peer 127.0.0.1:3006"],
    receiptUse:
      "Record peer multiaddr, MINING_PKH, fakenet difficulty, sync mode, and whether default peers were disabled."
  },
  {
    id: "mainnet-miner",
    label: "Mainnet miner",
    commandSource: "scripts/run_nockchain_miner.sh",
    expectedSignals: ["--mine", "--mining-pkh", "--num-threads"],
    receiptUse:
      "Record thread count, build/release, public key hash target, and chain/network context before interpreting miner output."
  }
] as const;

const diagnosticScenarios = [
  {
    id: "wrong-block-commitment",
    symptom: "Miner reports work for the wrong block commitment or stale candidate header.",
    likelySourceAnchors: ["candidate-effect-handler", "candidate-block-state", "structured-miner-traces"],
    requiredReceiptFields: ["candidateHeader", "heaviestChainDigest", "syncMode", "candidateChanged"],
    operatorAction:
      "Compare candidateHeader and heaviestChainDigest, then restart or wait for a fresh %mine effect if the miner is still working on stale candidate data."
  },
  {
    id: "empty-routing-table",
    symptom: "Routing table is empty and connected peers are zero while fakenet miner output is quiet.",
    likelySourceAnchors: ["fakenet-miner-script", "node-fakenet-script", "libp2p-request-pow-separation"],
    requiredReceiptFields: ["peerMultiaddr", "connectedPeerCount", "routeTableSize", "noDefaultPeers"],
    operatorAction:
      "Check that the hub is bound on /ip4/127.0.0.1/udp/3006/quic-v1, the miner uses the same peer, and --no-default-peers is intentional."
  },
  {
    id: "mining-starts-before-candidate",
    symptom: "Mining process is running but no threads start because no %mine candidate effect has arrived.",
    likelySourceAnchors: ["candidate-effect-handler", "mining-driver-bootstrap"],
    requiredReceiptFields: ["mineFlag", "miningPkh", "candidateHeader", "candidatePowLen"],
    operatorAction:
      "Wait for or debug the candidate effect path before treating lack of mined blocks as a proof performance issue."
  },
  {
    id: "network-pow-confused-with-block-pow",
    symptom: "A libp2p request PoW failure is mistaken for a block-mining proof failure.",
    likelySourceAnchors: ["libp2p-request-pow-separation", "miner-kernel-pow-check", "pow-library"],
    requiredReceiptFields: ["networkPowVerified", "requestMethod", "minedBlockDigest", "verificationStatus"],
    operatorAction:
      "Separate network request/gossip EquiX verification from block candidate proof checks before updating mining assumptions."
  }
] as const;

const receiptContract = {
  requiredFields: [
    "nockchainCommit",
    "nockchainBuild",
    "networkMode",
    "minerCommand",
    "miningPkh",
    "mineFlag",
    "fakenetPowLen",
    "fakenetLogDifficulty",
    "fakenetAsertPhase",
    "peerMultiaddr",
    "noDefaultPeers",
    "numThreads",
    "candidateHeader",
    "candidateTarget",
    "candidatePowLen",
    "nonceDigest",
    "minedBlockDigest",
    "heaviestMinerHeight",
    "heaviestChainDigest",
    "syncMode",
    "routeTableSize",
    "connectedPeerCount",
    "gossipSuppressedBehindTipTotal",
    "networkPowVerified",
    "observedAt",
    "verificationStatus"
  ],
  forbiddenFields: [
    "rawMinerJam",
    "rawCandidateNoun",
    "rawPowProof",
    "rawNonce",
    "rawPmaSlab",
    "rawEventLog",
    "rawStateJam",
    "rawTransaction",
    "walletSeedPhrase",
    "walletPrivateKey",
    "privateSpendKey",
    "privateGrpcPokePayload"
  ],
  interpretationRules: [
    "A running miner is not proof that a candidate block has been accepted.",
    "A found miner-kernel proof must still be poked into the main kernel and observed in heaviest-miner or heaviest-chain traces.",
    "Fakenet PoW length and log difficulty intentionally differ from mainnet defaults and must be recorded.",
    "Libp2p request/gossip EquiX PoW is separate from block-mining proof."
  ]
} as const;

const localVerification = {
  status: "source-inspected",
  inspectedSourceCommit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  recommendedCommands: [
    "cargo check -p nockchain",
    "cargo check -p kernels-open-miner",
    "cargo test -p nockchain-libp2p-io req_res_pow",
    "cargo test -p nockchain open_prover_bench --test open_prover_bench --release"
  ],
  notes: [
    "Use crate-scoped checks first; miner kernel checks can still be expensive because they load prover/kernel assets.",
    "Do not commit PMA, state-jam, raw candidate noun, raw proof, or wallet secret material when preserving mining evidence."
  ]
} as const;

export function createNockchainMiningSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/mining-source`,
    generatedAt: "2026-06-06T12:35:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      crates: ["nockchain", "kernels-open-miner", "nockchain-types", "nockchain-libp2p-io", "equix-latency"],
      sourceCommit: {
        sha: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
        shortSha: "33ba97b1e206",
        committedAt: "2026-06-05T23:46:59Z",
        message: "bridge: add end-to-end withdrawal execution (#127)"
      }
    },
    sourceAnchors: [...sourceAnchors],
    miningCapabilities: [...miningCapabilities],
    operationalModes: [...operationalModes],
    diagnosticScenarios: [...diagnosticScenarios],
    receiptContract,
    localVerification,
    nocksperimentalImplications: [
      "Use mining source receipts when diagnosing wrong block commitments, empty route tables, or quiet local fakenet miners.",
      "Pair mining evidence with sync/gossip diagnostics before deciding whether no output is a mining failure or an upstream connectivity/sync state.",
      "Treat the configured mining public key hash as public receipt metadata and all wallet/key material as forbidden evidence."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/mining/source`,
      api: `${registryCanonicalBaseUrl}/api/nockchain/mining-source`,
      operations: `${registryCanonicalBaseUrl}/nockchain/operations`,
      syncGossip: `${registryCanonicalBaseUrl}/nockchain/sync-gossip`,
      walletAtlas: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
