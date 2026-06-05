import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";
import { zorpStateJamDriveFolderUrl } from "@/lib/nockchain-state-jams";

const zorpRepositories = [
  {
    name: "nockapp",
    fullName: "zorp-corp/nockapp",
    url: "https://github.com/zorp-corp/nockapp",
    archived: true,
    fork: false,
    language: "hoon",
    description: "A toolkit for simple functional applications with automatic persistence.",
    updatedAt: "2026-06-05T18:09:10Z",
    pushedAt: "2025-04-10T15:31:01Z",
    stars: 71,
    openIssues: 7,
    primarySignal: "nockapp-lineage",
    nocksperimentalUse:
      "NockApp runtime lineage for pure state machines, poke/peek interpretation, persistence boundaries, and receipt language."
  },
  {
    name: "jock-lang",
    fullName: "zorp-corp/jock-lang",
    url: "https://github.com/zorp-corp/jock-lang",
    archived: false,
    fork: false,
    language: "hoon",
    description: "A simple scripting language that compiles to Nock.",
    updatedAt: "2026-04-05T19:51:30Z",
    pushedAt: "2026-03-12T02:29:17Z",
    stars: 54,
    openIssues: 6,
    primarySignal: "language-authoring",
    nocksperimentalUse:
      "Track high-level Nock application authoring and compiler-facing changes that may shape future NockApp fixtures."
  },
  {
    name: "sword",
    fullName: "zorp-corp/sword",
    url: "https://github.com/zorp-corp/sword",
    archived: true,
    fork: false,
    language: "Rust",
    description: "A modern Nock runtime with automatic persistence.",
    updatedAt: "2026-02-19T13:42:24Z",
    pushedAt: "2025-01-29T02:09:46Z",
    stars: 98,
    openIssues: 39,
    primarySignal: "runtime-lineage",
    nocksperimentalUse:
      "Historical runtime persistence context only; use current nockvm/Nockchain code for operational claims."
  },
  {
    name: "knock",
    fullName: "zorp-corp/knock",
    url: "https://github.com/zorp-corp/knock",
    archived: false,
    fork: true,
    language: null,
    description: "Nock semantics in K",
    updatedAt: "2025-12-09T12:01:03Z",
    pushedAt: "2023-04-01T21:27:32Z",
    stars: 3,
    openIssues: 0,
    primarySignal: "formal-semantics",
    nocksperimentalUse:
      "Formal-semantics reference for Nock reasoning; do not treat it as current Nockchain runtime authority."
  },
  {
    name: "sppark",
    fullName: "zorp-corp/sppark",
    url: "https://github.com/zorp-corp/sppark",
    archived: false,
    fork: true,
    language: null,
    description: "Zero-knowledge template library",
    updatedAt: "2025-06-23T22:02:02Z",
    pushedAt: "2025-06-06T10:32:46Z",
    stars: 0,
    openIssues: 0,
    primarySignal: "proof-tooling",
    nocksperimentalUse:
      "Watch for proof-system and accelerator-adjacent changes that could matter to future compute/proof benchmarks."
  },
  {
    name: "setup-bazel",
    fullName: "zorp-corp/setup-bazel",
    url: "https://github.com/zorp-corp/setup-bazel",
    archived: false,
    fork: true,
    language: null,
    description: "GitHub Action to configure Bazel",
    updatedAt: "2025-05-02T01:30:09Z",
    pushedAt: "2025-04-28T00:44:58Z",
    stars: 0,
    openIssues: 0,
    primarySignal: "build-tooling",
    nocksperimentalUse:
      "Low signal unless Zorp build/deploy workflows begin to reuse Bazel action changes."
  },
  {
    name: "create-pull-request",
    fullName: "zorp-corp/create-pull-request",
    url: "https://github.com/zorp-corp/create-pull-request",
    archived: false,
    fork: true,
    language: null,
    description: "A GitHub action to create a pull request for changes to your repository in the actions workspace",
    updatedAt: "2025-04-30T18:08:29Z",
    pushedAt: "2025-04-29T12:41:35Z",
    stars: 0,
    openIssues: 0,
    primarySignal: "automation-tooling",
    nocksperimentalUse:
      "Low signal, but monitor for upstream automation patterns that affect repo sync or generated update PRs."
  },
  {
    name: "mnist-hoon",
    fullName: "zorp-corp/mnist-hoon",
    url: "https://github.com/zorp-corp/mnist-hoon",
    archived: false,
    fork: false,
    language: "hoon",
    description: null,
    updatedAt: "2024-08-24T00:26:03Z",
    pushedAt: "2024-05-31T12:31:35Z",
    stars: 16,
    openIssues: 1,
    primarySignal: "hoon-examples",
    nocksperimentalUse:
      "Old Hoon example material; useful only as a fixture inspiration source, not protocol authority."
  },
  {
    name: "rust-cache",
    fullName: "zorp-corp/rust-cache",
    url: "https://github.com/zorp-corp/rust-cache",
    archived: false,
    fork: false,
    language: "TypeScript",
    description: null,
    updatedAt: "2024-08-13T15:29:04Z",
    pushedAt: "2024-08-13T13:51:30Z",
    stars: 0,
    openIssues: 0,
    primarySignal: "ci-tooling",
    nocksperimentalUse:
      "Low signal unless Nockchain build cache behavior becomes relevant to reproducible evidence."
  },
  {
    name: "criterion-compare-action",
    fullName: "zorp-corp/criterion-compare-action",
    url: "https://github.com/zorp-corp/criterion-compare-action",
    archived: false,
    fork: false,
    language: "JavaScript",
    description: null,
    updatedAt: "2024-08-13T15:28:44Z",
    pushedAt: "2024-08-13T14:23:16Z",
    stars: 0,
    openIssues: 0,
    primarySignal: "benchmark-tooling",
    nocksperimentalUse:
      "Potential lineage for benchmark diff reporting if Nocksperimental adds performance evidence receipts."
  }
] as const;

const zorpLayers = [
  {
    id: "protocol-runtime",
    label: "Protocol and runtime",
    sources: ["nockchain/nockchain"],
    interpretation:
      "Current Nockchain behavior belongs to the canonical Nockchain monorepo, not legacy Zorp repos."
  },
  {
    id: "language-authoring",
    label: "Language authoring",
    sources: ["zorp-corp/jock-lang"],
    interpretation:
      "Jock is the clearest public signal for higher-level Nock application authoring."
  },
  {
    id: "nockapp-lineage",
    label: "NockApp lineage",
    sources: ["zorp-corp/nockapp"],
    interpretation:
      "Archived NockApp material helps explain poke/peek/state-machine concepts but is not operational authority."
  },
  {
    id: "runtime-lineage",
    label: "Runtime lineage",
    sources: ["zorp-corp/sword"],
    interpretation:
      "Sword is useful history for persistence and Nock runtime ideas; current PMA behavior lives in Nockchain."
  },
  {
    id: "formal-semantics",
    label: "Formal semantics",
    sources: ["zorp-corp/knock"],
    interpretation:
      "Knock can inform Nock semantic reasoning but should not override Nockchain Tier 0 docs."
  },
  {
    id: "proof-tooling",
    label: "Proof tooling",
    sources: ["zorp-corp/sppark"],
    interpretation:
      "Proof-adjacent changes may matter later for compute/proof benchmarks and bridge evidence."
  }
] as const;

const zorpMonitorBrief = {
  generatedAt: "2026-06-05T23:58:00.000Z",
  snapshot: {
    publicRepoCount: zorpRepositories.length,
    activeCoreRepos: zorpRepositories.filter(
      (repo) => repo.primarySignal === "language-authoring" && !repo.archived
    ).length,
    archivedLineageRepos: zorpRepositories.filter(
      (repo) => ["nockapp-lineage", "runtime-lineage"].includes(repo.primarySignal) && repo.archived
    ).length,
    latestOrgUpdateAt: zorpRepositories
      .map((repo) => repo.updatedAt)
      .sort()
      .at(-1)
  },
  priorityRepos: [
    "nockchain/nockchain",
    "zorp-corp/jock-lang",
    "zorp-corp/nockapp",
    "zorp-corp/sword"
  ],
  riskFlags: [
    "legacy-repos-are-lineage-not-authority",
    "state-jam-folder-is-metadata-only",
    "forked-tooling-is-low-signal-until-used-by-nockchain"
  ],
  operatorActions: [
    "Promote Nockchain release, protocol-doc, fakenet, PMA, wallet, or libp2p changes into receipt fields before relying on test output.",
    "Treat zorp-corp/jock-lang changes as fixture-authoring signals and zorp-corp/nockapp or zorp-corp/sword changes as historical context.",
    "Inventory Drive state-jam artifacts by source URL, filename, size, hash, network, height or event boundary, and producing Nockchain build before trusting them.",
    "Escalate new Zorp repos only when they affect Nock authoring, NockApp fixture generation, PMA/state, proofs, or Nockchain operations."
  ],
  interpretation:
    "Zorp is useful as Nockchain lineage, language-authoring signal, and state-artifact provenance. Current protocol and operational authority stays with nockchain/nockchain and its Tier 0 docs."
} as const;

export function createZorpUpstreamMap() {
  const nockchain = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
    scannedAt: "2026-06-05T20:15:00.000Z",
    organization: {
      slug: "zorp-corp",
      name: "Zorp Corp",
      publicRepoCount: zorpRepositories.length,
      links: {
        github: "https://github.com/zorp-corp",
        website: "https://zorp.io",
        social: "https://x.com/zorpzk"
      }
    },
    nockchain: {
      repository: {
        fullName: nockchain.repository.fullName,
        defaultBranch: nockchain.repository.defaultBranch,
        url: nockchain.repository.url,
        lineageOrg: "https://github.com/zorp-corp"
      },
      latestCommit: nockchain.latestCommit,
      latestRelease: nockchain.latestRelease,
      docsPolicy: nockchain.docs.policy,
      watchItems: nockchain.watchItems
    },
    stateJamDrive: {
      sourceType: "zorp-nockchain-state-jam-folder",
      url: zorpStateJamDriveFolderUrl,
      classification:
        "Zorp/Nockchain state-jam folder, not a VESL folder. Treat as chain/runtime bootstrap metadata only.",
      artifactPolicy: "metadata-only",
      neverStoreRawArtifacts: nockchain.safety.stateArtifacts.doNotStore,
      requiredMetadata: nockchain.safety.stateArtifacts.metadataToTrack
    },
    repositories: zorpRepositories,
    layers: zorpLayers,
    monitor: {
      active: true,
      automationName: "Watch Zorp/Nockchain state jams and repos",
      automationId: "watch-vesl-drive-folder",
      interval: "FREQ=HOURLY;INTERVAL=6",
      watchedSources: [
        zorpStateJamDriveFolderUrl,
        "https://github.com/zorp-corp",
        "https://github.com/nockchain/nockchain"
      ],
      highSignalChanges: [
        "Nockchain releases, build tags, stable-build tags, and default-branch commits",
        "Tier 0 doc changes in START_HERE.md, PROTOCOL.md, ARCHITECTURE.md, WORKFLOWS.md, and DECISIONS/README.md",
        "PMA/state-jam/checkpoint migration or decode changes",
        "fakenet, mining, libp2p sync, route-table, peer, wallet, and API changes",
        "Jock language/compiler changes",
        "NockApp lineage docs or examples that clarify poke/peek/state-machine semantics",
        "new or renamed state-jam artifacts in the Drive folder"
      ]
    },
    monitorBrief: zorpMonitorBrief,
    nocksperimentalImplications: {
      receiptFields: [
        "zorpSource",
        "nockchainBuild",
        "nockchainCommit",
        "protocolTrack",
        "stateJamFingerprint",
        "sourceRepo",
        "sourceRepoPushedAt"
      ],
      nextProductSlices: [
        "Expose Zorp repo and state-jam provenance beside Nockchain receipts.",
        "Attach source-layer labels to fakenet, VESL, and future nockup receipts.",
        "Let users connect their own fakenets while recording which Nockchain build and state source produced evidence.",
        "Use Jock/NockApp lineage to design higher-level NockApp fixture reports without confusing lineage with protocol authority."
      ]
    },
    links: {
      upstream: nockchain.canonicalUrl,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      zorpIntelligence: `${registryCanonicalBaseUrl}/nockchain/zorp`,
      research: `${registryCanonicalBaseUrl}/docs/research/zorp-nockchain.md`
    }
  };
}
