import { createHash } from "node:crypto";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const documentFingerprints = [
  {
    path: "START_HERE.md",
    tier: "tier0",
    authority: "docs-trust-contract",
    sha256: "61f86959050831147bebb6f350be297d7a0f2f68d476c8bfac15928efebd71aa"
  },
  {
    path: "PROTOCOL.md",
    tier: "tier0",
    authority: "protocol-authority-index",
    sha256: "b6da66218a7faf7b5e5aafaff32f717d14881255678f351160cc96f6fba922fb"
  },
  {
    path: "ARCHITECTURE.md",
    tier: "tier0",
    authority: "system-boundaries-and-invariants",
    sha256: "5a810f14ea035279417e61c91806ee4401b997bdcb799ad12e25a94f23e28bde"
  },
  {
    path: "WORKFLOWS.md",
    tier: "tier0",
    authority: "operator-and-developer-routing",
    sha256: "3bc7afe118415760a9e91100b9a9025e240d7d9a353b98ab829df0376b38aa21"
  },
  {
    path: "DECISIONS/README.md",
    tier: "tier0",
    authority: "durable-technical-decision-index",
    sha256: "8f71f573a21af6823736155df6b189aeb31875f1b622e70c2ed4ee595f516dcf"
  },
  {
    path: "crates/nockapp/README.md",
    tier: "tier1",
    authority: "scoped-nockapp-runtime-interface",
    sha256: "ae4d3949cae8823ef8cff9724b789099b19a3365f0e294c60bf98dc9bf2e6472"
  },
  {
    path: "crates/nockchain-api/README.md",
    tier: "tier1",
    authority: "scoped-public-api-operations",
    sha256: "b51e19065c20359e19c5a338debba9f468d7d4847ad01e908d6bb43f2007e5c6"
  },
  {
    path: "crates/nockchain-wallet/README.md",
    tier: "tier1",
    authority: "scoped-wallet-cli-operations",
    sha256: "d069f43e7eaad0631f78c1c3e51b68984e6a89f6182d287258225ef806e350c1"
  }
] as const;

const coverageMatrix = [
  {
    id: "docs-authority",
    upstreamAuthority: "START_HERE.md and canonical read-order policy",
    pagePath: "/nockchain",
    apiPath: "/api/nockchain/docs-atlas",
    checkpointSurface: "nockchainDocsAtlas",
    status: "covered"
  },
  {
    id: "protocol-authority",
    upstreamAuthority: "PROTOCOL.md and changelog/protocol specs",
    pagePath: "/nockchain/protocol",
    apiPath: "/api/nockchain/protocol",
    checkpointSurface: "nockchainProtocolTrace",
    status: "covered"
  },
  {
    id: "rust-workspace",
    upstreamAuthority: "Cargo.toml workspace members and crate-level validation gates",
    pagePath: "/nockchain/rust",
    apiPath: "/api/nockchain/rust-atlas",
    checkpointSurface: "nockchainRustAtlas",
    status: "covered"
  },
  {
    id: "nockapp-runtime",
    upstreamAuthority: "crates/nockapp README, NockApp source, NockVM/PMA boundaries",
    pagePath: "/nockchain/nockapp",
    apiPath: "/api/nockchain/nockapp-atlas",
    checkpointSurface: "nockchainNockAppAtlas",
    status: "covered"
  },
  {
    id: "wallet-api",
    upstreamAuthority: "crates/nockchain-wallet and crates/nockchain-api READMEs",
    pagePath: "/nockchain/wallet",
    apiPath: "/api/nockchain/wallet",
    checkpointSurface: "nockchainWalletAtlas",
    status: "covered"
  },
  {
    id: "zorp-source-monitor",
    upstreamAuthority: "Zorp org repositories plus canonical nockchain/nockchain redirect target",
    pagePath: "/nockchain/zorp",
    apiPath: "/api/nockchain/zorp",
    checkpointSurface: "zorpUpstream",
    status: "covered"
  },
  {
    id: "pull-request-radar",
    upstreamAuthority: "open Nockchain pull requests as pre-merge review signals",
    pagePath: "/nockchain/pr-radar",
    apiPath: "/api/nockchain/pr-radar",
    checkpointSurface: "nockchainPrRadar",
    status: "covered"
  },
  {
    id: "state-artifacts",
    upstreamAuthority: "Zorp state-jam folder metadata plus PMA/state safety policy",
    pagePath: "/nockchain/state-jams",
    apiPath: "/api/nockchain/state-jams",
    checkpointSurface: "stateJamRegistry",
    status: "covered"
  }
] as const;

const expertiseLadder = [
  {
    id: "orientation",
    label: "Orientation",
    requirement:
      "Start with Tier 0 docs, record document fingerprints, and cite the canonical read order before protocol-sensitive claims.",
    primarySurfaces: ["nockchainDocsAtlas", "nockchainKnowledgeSpine"]
  },
  {
    id: "rust-implementation",
    label: "Rust implementation",
    requirement:
      "Tie crate-level assumptions to workspace members, crate checks, source traces, and the exact upstream commit.",
    primarySurfaces: ["nockchainRustAtlas", "nockchainNockAppSourceTrace", "nockchainBridgeSourceTrace"]
  },
  {
    id: "operations",
    label: "Operations",
    requirement:
      "Use upstream scripts and route peer, sync, mining, API, wallet, and PMA symptoms through operational pages before interpreting failures.",
    primarySurfaces: ["nockchainOperationsAtlas", "nockchainSyncGossipTrace", "nockchainWalletAtlas"]
  },
  {
    id: "evidence-authoring",
    label: "Evidence authoring",
    requirement:
      "Publish receipts with build, commit, docs authority, workspace hash, network, endpoint, state metadata, and forbidden-field checks.",
    primarySurfaces: ["registryCheckpoint", "localFakenetEvidence", "stateJamRegistry"]
  }
] as const;

const monitoringContract = {
  requiredEvidence: [
    "documentFingerprints",
    "workspaceMemberHash",
    "canonicalCommit",
    "canonicalRelease",
    "zorpOrgScan",
    "openPullRequestReview",
    "stateArtifactMetadata",
    "verificationCommand"
  ],
  forbiddenFields: [
    "rawPmaSlab",
    "rawStateJam",
    "rawCheckpoint",
    "rawEventLog",
    "walletSeedPhrase",
    "privateSpendKey"
  ],
  updateTriggers: [
    "Nockchain default-branch commit changes",
    "latest build release changes",
    "Tier 0 or promoted Tier 1 document fingerprint changes",
    "workspace member set changes",
    "Zorp org repository map changes",
    "open PR touches protocol, wallet, API, NockApp, nockup, bridge, PMA, or libp2p surfaces"
  ],
  interpretationRules: [
    "Open pull requests are review signals, not merged behavior.",
    "Document fingerprints prove exact source identity, not semantic correctness by themselves.",
    "Crate READMEs are scoped authority only when promoted by the Tier 0 spine.",
    "State-jam and PMA artifacts remain metadata-only in public Nocksperimental records."
  ]
} as const;

export function createNockchainKnowledgeSpine() {
  const upstream = nockchainUpstreamIntelligence;
  const docsAtlas = createNockchainDocsAtlas();
  const rustAtlas = createNockchainRustAtlas();
  const workspaceMembers = rustAtlas.workspace.coverage.trackedWorkspaceMembers;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/knowledge-spine`,
    generatedAt: "2026-06-06T06:40:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease,
      sources: {
        repository: upstream.links.repository,
        zorp: upstream.links.zorp,
        release: upstream.links.release
      }
    },
    authorityReadOrder: [
      ...docsAtlas.trustContract.readOrder,
      ...docsAtlas.tier1.map((doc) => doc.path)
    ],
    documentFingerprints: documentFingerprints.map((doc) => ({
      ...doc,
      commit: upstream.latestCommit.sha,
      url: `${upstream.links.repository}/blob/${upstream.repository.defaultBranch}/${doc.path}`
    })),
    workspaceManifest: {
      language: rustAtlas.workspace.language,
      resolver: rustAtlas.workspace.resolver,
      memberCount: rustAtlas.workspace.memberCount,
      workspaceMemberHash: createSha256Root(workspaceMembers),
      members: workspaceMembers,
      validationGates: rustAtlas.workspace.validationGates,
      nonWorkspaceTrackedCrates: rustAtlas.workspace.coverage.nonWorkspaceTrackedCrates
    },
    coverageMatrix,
    expertiseLadder,
    monitoringContract,
    nocksperimentalImplications: {
      receiptFields: [
        "docsAuthority",
        "documentFingerprintRoot",
        "workspaceMemberHash",
        "nockchainCommit",
        "nockchainRelease",
        "upstreamSurface",
        "checkpointSurface",
        "sourceMonitorStatus"
      ],
      nextProductSlices: [
        "Compare documentFingerprintRoot against the live upstream clone during monitor runs.",
        "Add workspace-member drift alerts when Cargo.toml changes upstream.",
        "Attach knowledge-spine identity to fakenet, Nockup, wallet, and VESL evidence receipts."
      ]
    },
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/knowledge-spine`,
      docsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      prRadar: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
      registry: `${registryCanonicalBaseUrl}/api/registry`
    }
  };
}

function createSha256Root(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
