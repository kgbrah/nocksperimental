import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const groupDefinitions = [
  {
    id: "chain-runtime",
    label: "Chain runtime",
    role: "Consensus, block handling, libp2p networking, math, and end-to-end chain validation.",
    nocksperimentalUse:
      "Use these crates to interpret fakenet receipts, peer/tip diagnostics, mining output, and protocol-sensitive test failures."
  },
  {
    id: "operator-tools",
    label: "Operator tools",
    role: "Wallet, API, explorer, peek, transaction, and operational command surfaces.",
    nocksperimentalUse:
      "Use these crates for wallet evidence, public/private endpoint posture, balance checks, and operator-facing diagnostics."
  },
  {
    id: "nockapp-runtime",
    label: "NockApp runtime",
    role: "NockApp kernel runtime, gRPC bridge, NockVM execution, poke/peek effects, and persistence boundaries.",
    nocksperimentalUse:
      "Use these crates to ground NockApp lab reports, poke/peek receipts, state replay, and live export_state watch items."
  },
  {
    id: "hoon-and-scaffolding",
    label: "Hoon and scaffolding",
    role: "Hoon compiler, kernels, and nockup application scaffolding.",
    nocksperimentalUse:
      "Use these crates for nockup build/run receipts and compiler-backed fixture generation."
  },
  {
    id: "bridge-and-proof",
    label: "Bridge and proof",
    role: "Bridge operator and proof-adjacent crates for settlement, ZK, and latency-sensitive work.",
    nocksperimentalUse:
      "Use these crates to connect VESL evidence, bridge settlement probes, and future proof/compute benchmarks."
  },
  {
    id: "serialization-support",
    label: "Serialization support",
    role: "Noun serialization, habit/chaff support, and data-shape glue used across runtime boundaries.",
    nocksperimentalUse:
      "Use these crates to reason about evidence payloads, noun encoding, and receipt-safe serialization assumptions."
  }
] as const;

const workspaceMembers = [
  "crates/bridge",
  "crates/bridge-dev",
  "crates/equix-latency",
  "crates/habit",
  "crates/hoon",
  "crates/hoonc",
  "crates/kernels",
  "crates/kernels/bridge",
  "crates/kernels/dumb",
  "crates/kernels/miner",
  "crates/kernels/nockchain-peek",
  "crates/kernels/wallet",
  "crates/nockapp",
  "crates/nockapp-grpc",
  "crates/nockapp-grpc-proto",
  "crates/nockchain",
  "crates/nockchain-api",
  "crates/nockchain-bridge-sequencer",
  "crates/nockchain-e2e",
  "crates/nockchain-explorer-tui",
  "crates/nockchain-libp2p-io",
  "crates/nockchain-math",
  "crates/nockchain-peek",
  "crates/nockchain-testkit",
  "crates/nockchain-types",
  "crates/nockchain-wallet",
  "crates/nockup",
  "crates/nockvm/rust/ibig",
  "crates/nockvm/rust/murmur3",
  "crates/nockvm/rust/nockvm",
  "crates/nockvm/rust/nockvm_macros",
  "crates/noun-serde",
  "crates/noun-serde-derive",
  "crates/raw-tx-checker",
  "crates/wallet-tx-builder",
  "crates/zkvm-jetpack"
] as const;

const nonWorkspaceTrackedCrates = ["crates/chaff"] as const;

const crateDetails = [
  {
    name: "nockchain",
    group: "chain-runtime",
    role: "Primary chain node and mining runtime.",
    nocksperimentalUse:
      "Anchor fakenet receipts, mining checks, block commitment diagnostics, and protocol-sensitive test interpretation.",
    riskPosture: "Fast-moving consensus/runtime crate; record commit, release, protocol track, peer count, and tip status.",
    primaryCheck: "cargo check -p nockchain"
  },
  {
    name: "nockchain-types",
    group: "chain-runtime",
    role: "Shared chain data types and protocol-facing structures.",
    nocksperimentalUse: "Normalize receipt fields for blocks, commitments, notes, and network metadata.",
    riskPosture: "Type changes can alter receipt shape; pin commit and protocol context.",
    primaryCheck: "cargo check -p nockchain-types"
  },
  {
    name: "nockchain-libp2p-io",
    group: "chain-runtime",
    role: "libp2p networking and peer IO.",
    nocksperimentalUse:
      "Interpret peer, route-table, gossip suppression, and behind-tip diagnostics for fakenet receipts.",
    riskPosture: "Peer behavior changes affect no-peers and wrong-commitment triage.",
    primaryCheck: "cargo check -p nockchain-libp2p-io"
  },
  {
    name: "nockchain-math",
    group: "chain-runtime",
    role: "Finite-field, polynomial, noun-shape, and math primitives used by chain/proof-facing code.",
    nocksperimentalUse:
      "Anchor finite-field and polynomial assumptions before turning proof, mining, or compute benchmarks into evidence.",
    riskPosture: "Math primitive drift is high-signal; record crate path, commit, and validation gate before relying on derived values.",
    primaryCheck: "cargo check -p nockchain-math"
  },
  {
    name: "nockchain-testkit",
    group: "chain-runtime",
    role: "Chain testing helpers and fixture support.",
    nocksperimentalUse: "Candidate source for richer local fakenet fixtures and repeatable test harnesses.",
    riskPosture: "Test-only assumptions should not be promoted to protocol claims without Tier 0 docs.",
    primaryCheck: "cargo check -p nockchain-testkit"
  },
  {
    name: "nockchain-e2e",
    group: "chain-runtime",
    role: "End-to-end chain validation.",
    nocksperimentalUse: "Model longer Nocksperimental fakenet integration scenarios.",
    riskPosture: "Run scoped checks before adapting scenarios into public evidence.",
    primaryCheck: "cargo check -p nockchain-e2e"
  },
  {
    name: "nockchain-wallet",
    group: "operator-tools",
    role: "Wallet CLI and wallet evidence surface.",
    nocksperimentalUse: "Drive wallet balance, address, note, blob, and memo receipt checks.",
    riskPosture: "Wallet CLI behavior is operator-facing; cite crate README and record endpoint mode.",
    primaryCheck: "cargo check -p nockchain-wallet"
  },
  {
    name: "wallet-tx-builder",
    group: "operator-tools",
    role: "Wallet transaction planning, fee, note, lock-resolution, determinism, and withdrawal-building support.",
    nocksperimentalUse:
      "Ground wallet and bridge withdrawal receipts in the exact transaction builder surface used upstream.",
    riskPosture: "Transaction-builder changes can alter fees, word counts, lock resolution, memo/blob behavior, and withdrawal evidence.",
    primaryCheck: "cargo check -p wallet-tx-builder"
  },
  {
    name: "raw-tx-checker",
    group: "operator-tools",
    role: "Raw transaction checker CLI.",
    nocksperimentalUse:
      "Use as a future local guard for raw transaction evidence before publishing wallet or bridge receipts.",
    riskPosture: "Raw transaction checks must be tied to Nockchain build, network, wallet source, and chain tip.",
    primaryCheck: "cargo check -p raw-tx-checker"
  },
  {
    name: "nockchain-api",
    group: "operator-tools",
    role: "Public API crate for Nockchain interactions.",
    nocksperimentalUse: "Model API-backed evidence while keeping public exposure warnings visible.",
    riskPosture:
      "alpha/test-grade; do not expose publicly without access control, observability, and rate-limit posture.",
    primaryCheck: "cargo check -p nockchain-api"
  },
  {
    name: "nockchain-peek",
    group: "operator-tools",
    role: "Peek tooling for reading app/chain state.",
    nocksperimentalUse: "Support fakenet peek evidence and command-backed probe receipts.",
    riskPosture: "Peek output must be bound to endpoint, build, network, and block context.",
    primaryCheck: "cargo check -p nockchain-peek"
  },
  {
    name: "nockchain-explorer-tui",
    group: "operator-tools",
    role: "Terminal explorer for chain state.",
    nocksperimentalUse: "Potential operator inspection companion for fakenet support bundles.",
    riskPosture: "Human-inspection UI should not become machine-verification authority by itself.",
    primaryCheck: "cargo check -p nockchain-explorer-tui"
  },
  {
    name: "nockapp",
    group: "nockapp-runtime",
    role: "NockApp runtime interface for Kernel, poke, peek, effects, logging, and persistence.",
    nocksperimentalUse: "Ground lab runner semantics, NockApp receipts, poke/peek checks, and export_state monitoring.",
    riskPosture: "Runtime changes can alter evidence meaning; use scoped README plus Tier 0 docs.",
    primaryCheck: "cargo check -p nockapp"
  },
  {
    name: "nockapp-grpc",
    group: "nockapp-runtime",
    role: "gRPC surface for NockApp interaction.",
    nocksperimentalUse: "Back local fakenet endpoint and NockApp probe modeling.",
    riskPosture: "Endpoint evidence must distinguish local/private gRPC from public API exposure.",
    primaryCheck: "cargo check -p nockapp-grpc"
  },
  {
    name: "nockapp-grpc-proto",
    group: "nockapp-runtime",
    role: "Protobuf definitions for NockApp gRPC interaction.",
    nocksperimentalUse:
      "Keep command-backed and future gRPC-native fakenet probes aligned with the upstream protobuf contract.",
    riskPosture: "Protobuf drift changes request/response evidence shape; regenerate probes only after pinning commit and schema.",
    primaryCheck: "cargo check -p nockapp-grpc-proto"
  },
  {
    name: "nockvm/rust/ibig",
    group: "nockapp-runtime",
    role: "Big-integer support crate inside the NockVM Rust workspace.",
    nocksperimentalUse: "Track low-level arithmetic assumptions that can affect NockVM execution evidence.",
    riskPosture: "Low-level runtime support should be cited as implementation evidence, not protocol authority.",
    primaryCheck: "cargo check -p ibig"
  },
  {
    name: "nockvm/rust/murmur3",
    group: "nockapp-runtime",
    role: "Murmur3 hashing support inside the NockVM Rust workspace.",
    nocksperimentalUse: "Track hashing support assumptions when evidence depends on NockVM runtime internals.",
    riskPosture: "Hash support drift can affect internal runtime behavior; keep receipt claims scoped and commit-pinned.",
    primaryCheck: "cargo check -p murmur3"
  },
  {
    name: "nockvm/rust/nockvm",
    group: "nockapp-runtime",
    role: "Rust NockVM and PMA runtime.",
    nocksperimentalUse: "Explain PMA/state-jam durability, runtime memory assumptions, and replay safety.",
    riskPosture: "Do not store raw PMA/state artifacts; record state provenance instead.",
    primaryCheck: "cargo check -p nockvm"
  },
  {
    name: "nockvm/rust/nockvm_macros",
    group: "nockapp-runtime",
    role: "NockVM macro support crate.",
    nocksperimentalUse: "Track macro-generated runtime behavior when explaining NockVM implementation changes.",
    riskPosture: "Macro support is implementation evidence only; cite generated behavior through crate-scoped checks.",
    primaryCheck: "cargo check -p nockvm_macros"
  },
  {
    name: "hoon",
    group: "hoon-and-scaffolding",
    role: "Hoon language support crate used by compiler and kernel workflows.",
    nocksperimentalUse: "Tie Hoon-backed fixture generation and compiler assumptions to the upstream crate surface.",
    riskPosture: "Hoon support changes should record source hash, compiler build, and Nockchain commit.",
    primaryCheck: "cargo check -p hoon"
  },
  {
    name: "hoonc",
    group: "hoon-and-scaffolding",
    role: "Hoon compiler workflow.",
    nocksperimentalUse: "Support compiler-backed NockApp fixture generation and Hoon source provenance.",
    riskPosture: "Compiler output should be tied to source hash and Nockchain commit.",
    primaryCheck: "cargo check -p hoonc"
  },
  {
    name: "nockup",
    group: "hoon-and-scaffolding",
    role: "NockApp project scaffold and run UX.",
    nocksperimentalUse: "Create nockup build/run receipts for app scaffold validation.",
    riskPosture: "Active UX hardening watch item; keep templates and run commands tied to upstream PR/release context.",
    primaryCheck: "cargo check -p nockup"
  },
  {
    name: "kernels",
    group: "hoon-and-scaffolding",
    role: "Kernel assets used by Nockchain and NockApps.",
    nocksperimentalUse: "Track fixture/kernel provenance for generated NockApp tests.",
    riskPosture: "Kernel assumptions must cite canonical docs or scoped crate docs.",
    primaryCheck: "cargo check -p kernels"
  },
  {
    name: "kernels-open-bridge",
    group: "hoon-and-scaffolding",
    role: "Bridge kernel package in the upstream kernels workspace.",
    nocksperimentalUse: "Record bridge kernel provenance when bridge receipts depend on kernel behavior.",
    riskPosture: "Kernel package changes must be tied to commit, source path, and protocol context.",
    primaryCheck: "cargo check -p kernels-open-bridge"
  },
  {
    name: "kernels-open-dumb",
    group: "hoon-and-scaffolding",
    role: "Minimal/dumb kernel package used for runtime and fixture scaffolding.",
    nocksperimentalUse: "Use as low-level fixture context when validating simple NockApp behavior.",
    riskPosture: "Treat fixture kernels as scoped test assets, not protocol authority.",
    primaryCheck: "cargo check -p kernels-open-dumb"
  },
  {
    name: "kernels-open-miner",
    group: "hoon-and-scaffolding",
    role: "Miner kernel package in the upstream kernels workspace.",
    nocksperimentalUse: "Tie mining and block-commitment fixture assumptions to miner kernel provenance.",
    riskPosture: "Miner kernel changes can alter mining evidence interpretation; record build and state context.",
    primaryCheck: "cargo check -p kernels-open-miner"
  },
  {
    name: "kernels-open-nockchain-peek",
    group: "hoon-and-scaffolding",
    role: "Nockchain peek kernel package.",
    nocksperimentalUse: "Anchor peek evidence to the exact kernel package used to inspect state.",
    riskPosture: "Peek kernel drift affects read-only evidence shape and must be commit-pinned.",
    primaryCheck: "cargo check -p kernels-open-nockchain-peek"
  },
  {
    name: "kernels-open-wallet",
    group: "hoon-and-scaffolding",
    role: "Wallet kernel package in the upstream kernels workspace.",
    nocksperimentalUse: "Record wallet kernel provenance when balances, notes, or wallet peeks enter receipts.",
    riskPosture: "Wallet kernel changes can alter wallet evidence and must be paired with endpoint and build context.",
    primaryCheck: "cargo check -p kernels-open-wallet"
  },
  {
    name: "bridge-dev",
    group: "bridge-and-proof",
    role: "Bridge development scenarios and tests.",
    nocksperimentalUse:
      "Use as a source of bridge fixture scenarios before promoting settlement checks into public evidence.",
    riskPosture: "Development scenarios are implementation fixtures; do not treat them as finalized protocol behavior.",
    primaryCheck: "cargo check -p bridge-dev"
  },
  {
    name: "bridge",
    group: "bridge-and-proof",
    role: "Bridge operator tooling.",
    nocksperimentalUse: "Connect VESL lifecycle receipts to Nockchain settlement evidence.",
    riskPosture: "Bridge evidence needs chain, wallet, settlement mode, and state artifact provenance.",
    primaryCheck: "cargo check -p bridge"
  },
  {
    name: "nockchain-bridge-sequencer",
    group: "bridge-and-proof",
    role: "Bridge sequencer service for authorization, submission, and confirmation surfaces.",
    nocksperimentalUse:
      "Attach sequencer configuration and commit provenance to bridge withdrawal and settlement receipts.",
    riskPosture: "Sequencer behavior is high-signal for bridge evidence; record config, endpoint, proposal hash, and journal context.",
    primaryCheck: "cargo check -p nockchain-bridge-sequencer"
  },
  {
    name: "zkvm-jetpack",
    group: "bridge-and-proof",
    role: "Proof-adjacent ZKVM support.",
    nocksperimentalUse: "Future proof/compute benchmark alignment surface.",
    riskPosture: "Treat proof performance and correctness claims as high-evidence assertions.",
    primaryCheck: "cargo check -p zkvm-jetpack"
  },
  {
    name: "equix-latency",
    group: "bridge-and-proof",
    role: "Latency-sensitive proof/compute support.",
    nocksperimentalUse: "Candidate source for compute benchmark profiles and solver scorecards.",
    riskPosture: "Benchmark results must include hardware, build, and timing provenance.",
    primaryCheck: "cargo check -p equix-latency"
  },
  {
    name: "noun-serde",
    group: "serialization-support",
    role: "Noun serialization support.",
    nocksperimentalUse: "Ground receipt-safe noun payload shape and serialization assumptions.",
    riskPosture: "Serialization changes can change evidence hashes and verifier inputs.",
    primaryCheck: "cargo check -p noun-serde"
  },
  {
    name: "noun-serde-derive",
    group: "serialization-support",
    role: "Derive macros for noun serialization support.",
    nocksperimentalUse: "Track generated noun-serialization behavior that can affect receipt payload shape.",
    riskPosture: "Derive macro drift can change serialization evidence; cite package and commit with verifier updates.",
    primaryCheck: "cargo check -p noun-serde-derive"
  },
  {
    name: "habit",
    group: "serialization-support",
    role: "Support crate in the noun/runtime ecosystem.",
    nocksperimentalUse: "Track low-level data-shape assumptions that may appear in NockApp receipts.",
    riskPosture: "Use only with source/commit provenance.",
    primaryCheck: "cargo check -p habit"
  },
  {
    name: "chaff",
    group: "serialization-support",
    role: "Support crate in the noun/runtime ecosystem.",
    nocksperimentalUse: "Track auxiliary serialization/runtime assumptions.",
    riskPosture: "Avoid elevating helper crate behavior to protocol authority.",
    primaryCheck: "cargo check -p chaff"
  }
] as const;

export function createNockchainRustAtlas() {
  const upstream = nockchainUpstreamIntelligence;
  const trackedWorkspaceMembers = [...workspaceMembers];
  const missingWorkspaceMembers: string[] = [];

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
    scannedAt: upstream.scannedAt,
    upstream: {
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease,
      protocol: upstream.protocol.currentTrack,
      docs: upstream.docs.canonicalSpine.map((source) => source.path)
    },
    workspace: {
      language: upstream.workspace.language,
      resolver: upstream.workspace.resolver,
      memberCount: workspaceMembers.length,
      coverage: {
        trackedWorkspaceMemberCount: trackedWorkspaceMembers.length,
        trackedWorkspaceMembers,
        missingWorkspaceMembers,
        nonWorkspaceTrackedCrates: [...nonWorkspaceTrackedCrates]
      },
      validationGates: upstream.workspace.validationGates
    },
    groups: groupDefinitions.map((group) => ({
      ...group,
      crates: crateDetails
        .filter((crateDetail) => crateDetail.group === group.id)
        .map((crateDetail) => crateDetail.name)
    })),
    crates: crateDetails,
    watchThemes: [
      "#125 fix(nockup): harden templates and run UX",
      "#126 nockchain-bench",
      "#116 wallet blobs and memo support",
      "#119 public NockApp::export_state",
      "#124 AI PoW Puzzle for AI Compute Network",
      "libp2p/sync behavior while behind tip",
      "PMA dynamic growth and state-jam decode hardening"
    ],
    nocksperimentalNextUses: [
      "Attach crate-level provenance to fakenet and VESL receipts.",
      "Add nockup build/run receipts for app scaffold validation.",
      "Use NockApp export_state when upstream stabilizes it for live-app snapshots.",
      "Treat wallet blob/memo support as a future receipt-field expansion."
    ],
    links: {
      upstream: upstream.canonicalUrl,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      repository: upstream.links.repository,
      release: upstream.links.release,
      research: upstream.links.research,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
