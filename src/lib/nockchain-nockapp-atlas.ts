import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";
import { zorpStateJamDriveFolderUrl } from "@/lib/nockchain-state-jams";

const runtimeBoundaries = [
  {
    id: "poke-effects",
    label: "Poke effects",
    role: "State-changing NockApp input boundary where a poke can emit effects and mutate durable state.",
    canonicalSources: ["crates/nockapp", "crates/nockapp-grpc", "crates/nockvm/rust/nockvm"],
    lineageSources: ["zorp-corp/nockapp", "zorp-corp/sword"],
    nocksperimentalUse:
      "Use this boundary for fakenet and Nockup receipts that need to explain which poke path, effect tag, and before/after state roots were observed.",
    receiptFields: [
      "pokePath",
      "effectTag",
      "stateRootBefore",
      "stateRootAfter",
      "kernel",
      "nockchainCommit"
    ],
    riskPosture:
      "A poke is not just a command transcript; bind it to kernel, commit/build, endpoint mode, state root, and effect evidence before publishing."
  },
  {
    id: "peek-reads",
    label: "Peek reads",
    role: "Read-only NockApp observation boundary for state inspection without claiming a transition occurred.",
    canonicalSources: ["crates/nockapp", "crates/nockchain-peek", "crates/kernels/nockchain-peek"],
    lineageSources: ["zorp-corp/nockapp"],
    nocksperimentalUse:
      "Use this boundary for balance, route-table, state, or app peeks where the receipt must separate observation from mutation.",
    receiptFields: ["peekPath", "stateRootAtPeek", "grpcEndpoint", "kernel", "nockchainBuild"],
    riskPosture:
      "Peek output must be tied to endpoint, block/tip context, state root, and Nockchain build before it becomes evidence."
  },
  {
    id: "pma-durability",
    label: "PMA durability",
    role: "Persistent-memory and state-artifact boundary for local durability, replay context, checkpointing, and state-jam provenance.",
    canonicalSources: ["crates/nockvm/rust/nockvm", "crates/nockapp", "crates/nockchain"],
    lineageSources: ["zorp-corp/sword"],
    nocksperimentalUse:
      "Use this boundary when a NockApp test depends on existing state, a state export, a checkpoint, or a Zorp state-jam source.",
    receiptFields: [
      "stateJamFingerprint",
      "pmaBoundary",
      "eventLogBoundary",
      "stateRootBefore",
      "stateRootAfter"
    ],
    riskPosture:
      "Record PMA and state-jam metadata only. Do not store or redistribute raw PMA slabs, event logs, checkpoints, or state jams."
  },
  {
    id: "grpc-private-endpoint",
    label: "gRPC private endpoint",
    role: "Local/private NockApp interaction surface used by probes, wallets, fakenets, and future direct runtime tests.",
    canonicalSources: ["crates/nockapp-grpc", "crates/nockapp-grpc-proto", "crates/nockchain-api"],
    lineageSources: ["zorp-corp/nockapp"],
    nocksperimentalUse:
      "Use this boundary to distinguish private local gRPC evidence from public API or explorer-derived evidence.",
    receiptFields: ["grpcEndpoint", "endpointMode", "nockchainCommit", "nockchainBuild", "networkId"],
    riskPosture:
      "Never imply an unauthenticated private endpoint is safe for public exposure; record endpoint mode and local network context."
  },
  {
    id: "nockup-fixture",
    label: "Nockup fixture",
    role: "Scaffold/build/run boundary for turning NockApp source, Hoon kernels, and Jam artifacts into reproducible fixtures.",
    canonicalSources: ["crates/nockup", "crates/hoonc", "crates/kernels", "crates/nockapp"],
    lineageSources: ["zorp-corp/jock-lang", "zorp-corp/nockapp"],
    nocksperimentalUse:
      "Use this boundary to connect Nockup validation receipts, fixture provenance, and future Jock/NockApp authoring templates.",
    receiptFields: ["nockupTemplate", "jamHash", "sourceRepo", "sourceRepoPushedAt", "kernel"],
    riskPosture:
      "A successful scaffold run is fixture evidence, not protocol authority. Keep it tied to source hash, template, build command, and Nockchain commit."
  }
] as const;

const probeTemplates = [
  {
    id: "poke-roundtrip",
    label: "Poke roundtrip",
    boundaryId: "poke-effects",
    intent:
      "Submit a state-changing poke, capture effects, and compare before/after state roots without storing raw state.",
    requiredEvidence: ["pokePath", "effectTag", "stateRootBefore", "stateRootAfter", "kernel"]
  },
  {
    id: "peek-state-read",
    label: "Peek state read",
    boundaryId: "peek-reads",
    intent:
      "Read NockApp or chain state through a peek path and bind the observation to endpoint, build, and state root.",
    requiredEvidence: ["peekPath", "stateRootAtPeek", "grpcEndpoint", "nockchainBuild"]
  },
  {
    id: "nockup-build-run",
    label: "Nockup build/run",
    boundaryId: "nockup-fixture",
    intent:
      "Record scaffold, build, run, and Jam artifact metadata for an app fixture without publishing source-private output.",
    requiredEvidence: ["nockupTemplate", "jamHash", "sourceRepo", "nockchainCommit"]
  },
  {
    id: "state-export-snapshot",
    label: "State export snapshot",
    boundaryId: "pma-durability",
    intent:
      "Publish metadata for state export, checkpoint, or state-jam context while leaving raw state artifacts out of git and receipts.",
    requiredEvidence: ["stateJamFingerprint", "pmaBoundary", "eventLogBoundary", "nockchainBuild"]
  }
] as const;

const receiptContract = {
  requiredFields: [
    "nockchainCommit",
    "nockchainBuild",
    "networkId",
    "kernel",
    "nockAppSource",
    "nockAppCrate",
    "pokePath",
    "peekPath",
    "effectTag",
    "stateRootBefore",
    "stateRootAfter",
    "jamHash",
    "stateJamFingerprint",
    "endpointMode"
  ],
  optionalFields: [
    "stateRootAtPeek",
    "grpcEndpoint",
    "nockupTemplate",
    "sourceRepo",
    "sourceRepoPushedAt",
    "lineageSource",
    "lineageInterpretation",
    "eventLogBoundary",
    "pmaBoundary"
  ],
  forbiddenFields: [
    "rawPmaSlab",
    "rawEventLog",
    "rawCheckpoint",
    "rawStateJam",
    "walletPrivateKey",
    "walletSeedPhrase",
    "apiToken"
  ],
  interpretationRules: [
    "Use nockchain/nockchain crates and Tier 0 docs for current runtime and protocol claims.",
    "Treat Zorp NockApp and Sword repositories as lineage/context, not current protocol authority.",
    "Treat the Zorp Drive folder as metadata-only state-jam provenance, not VESL evidence.",
    "Do not compare two NockApp receipts unless commit/build, kernel, endpoint mode, and state-artifact context match.",
    "Separate read-only peeks from state-changing pokes in public evidence and user-connected fakenet tests."
  ]
} as const;

export function createNockchainNockAppAtlas() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-atlas`,
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
      protocol: upstream.protocol.currentTrack
    },
    sourceAuthority: {
      canonical: {
        sourceRole: "canonical-runtime-authority",
        repository: upstream.repository.fullName,
        sources: [
          "crates/nockapp",
          "crates/nockapp-grpc",
          "crates/nockapp-grpc-proto",
          "crates/nockvm/rust/nockvm",
          "crates/nockup",
          "crates/kernels"
        ],
        docs: [
          "START_HERE.md",
          "PROTOCOL.md",
          "ARCHITECTURE.md",
          "WORKFLOWS.md",
          "crates/nockapp/README.md",
          "crates/nockapp-grpc/README.md",
          "crates/nockup/README.md"
        ],
        interpretation:
          "Current NockApp runtime evidence must cite Nockchain commit/build and current Nockchain crates before using lineage material."
      },
      lineage: {
        sourceRole: "zorp-lineage-context",
        organization: "zorp-corp",
        sources: ["zorp-corp/nockapp", "zorp-corp/sword", "zorp-corp/jock-lang"],
        interpretation:
          "Zorp lineage explains NockApp, Sword, persistence, and authoring vocabulary, but does not override current nockchain/nockchain behavior."
      },
      stateArtifacts: {
        sourceRole: "state-artifact-provenance",
        sources: [zorpStateJamDriveFolderUrl],
        artifactPolicy: "metadata-only",
        interpretation:
          "Use state-jam/checkpoint metadata to explain bootstrap or state context without storing raw state artifacts."
      }
    },
    runtimeBoundaries: runtimeBoundaries.map((boundary) => ({ ...boundary })),
    probeTemplates: probeTemplates.map((template) => ({ ...template })),
    receiptContract,
    safety: {
      neverStore: receiptContract.forbiddenFields,
      metadataOnlySources: [zorpStateJamDriveFolderUrl],
      operatorPosture:
        "NockApp evidence should preserve source, build, endpoint, kernel, and state identity while keeping raw runtime state and secrets private."
    },
    nocksperimentalNextUses: [
      "Attach the NockApp runtime boundary to fakenet, Nockup, VESL, and user-connected fakenet receipts.",
      "Add direct poke/peek probe receipts once the local fakenet adapter can call the runtime boundary consistently.",
      "Use Zorp lineage to improve fixture language without promoting archived repos to protocol authority.",
      "Add state export metadata fields to Launch Evidence without committing raw PMA, event logs, or state jams."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/nockapp`,
      upstream: `${registryCanonicalBaseUrl}/api/nockchain/upstream`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      nockupReceipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
