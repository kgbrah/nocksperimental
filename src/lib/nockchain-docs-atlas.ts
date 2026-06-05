import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const tier0Docs = [
  {
    path: "START_HERE.md",
    role: "Docs trust contract, canonical read order, tier rules, and conflict resolution.",
    authority: "canonical-spine",
    url: "https://github.com/nockchain/nockchain/blob/master/START_HERE.md"
  },
  {
    path: "PROTOCOL.md",
    role: "Protocol authority index and current upgrade track.",
    authority: "protocol-index",
    url: "https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md"
  },
  {
    path: "ARCHITECTURE.md",
    role: "System boundaries, global invariants, and protocol/runtime separation.",
    authority: "canonical-spine",
    url: "https://github.com/nockchain/nockchain/blob/master/ARCHITECTURE.md"
  },
  {
    path: "WORKFLOWS.md",
    role: "Operator/developer golden paths and routing table.",
    authority: "canonical-spine",
    url: "https://github.com/nockchain/nockchain/blob/master/WORKFLOWS.md"
  },
  {
    path: "DECISIONS/README.md",
    role: "ADR index for accepted documentation and protocol authority decisions.",
    authority: "canonical-spine",
    url: "https://github.com/nockchain/nockchain/blob/master/DECISIONS/README.md"
  }
] as const;

const tier1Docs = [
  {
    path: "crates/nockapp/README.md",
    scope: "NockApp runtime interface, Kernel, poke, peek, effects, logging, and persistence usage.",
    authority: "scoped-runtime-interface",
    validation: "make -C open docs-check; cargo check -p nockapp",
    riskPosture: "Do not promote runtime README details to protocol authority without Tier 0 support.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/nockapp/README.md"
  },
  {
    path: "crates/nockchain-api/README.md",
    scope: "Public API runtime/deployment guidance and alpha/test-grade API posture.",
    authority: "scoped-api-operations",
    validation: "cargo check -p nockchain-api",
    riskPosture: "Do not expose publicly without access control, observability, and rate-limit posture.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/nockchain-api/README.md"
  },
  {
    path: "crates/nockchain-wallet/README.md",
    scope: "Wallet CLI behavior, local/private endpoint usage, and operator commands.",
    authority: "scoped-wallet-operations",
    validation: "cargo check -p nockchain-wallet",
    riskPosture: "Wallet evidence must record endpoint mode, network, address, build, and command provenance.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/nockchain-wallet/README.md"
  }
] as const;

const legacyOrExperimentalDocs = [
  {
    path: "crates/nockup/README.md",
    status: "Experimental",
    canonicalStatus: "Canonical/Legacy: Legacy",
    role: "NockApp project scaffolding and development UX lineage.",
    reason:
      "Useful for Nockup validation receipts, but it should be checked against the canonical spine before it anchors protocol or architecture claims.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/nockup/README.md"
  }
] as const;

const protocolSpecs = [
  {
    sequence: "001",
    codename: "Legacy checkpoint 144",
    version: "0.1.0",
    status: "activated",
    consensusCritical: true,
    activationHeight: 144,
    path: "changelog/protocol/001-legacy-checkpoint-144.md"
  },
  {
    sequence: "002",
    codename: "Checkpoints genesis/720",
    version: "0.1.1",
    status: "activated",
    consensusCritical: true,
    activationHeight: 720,
    path: "changelog/protocol/002-checkpoints-genesis-720.md"
  },
  {
    sequence: "003",
    codename: "Checkpoint 2448",
    version: "0.1.2",
    status: "activated",
    consensusCritical: true,
    activationHeight: 2448,
    path: "changelog/protocol/003-checkpoint-2448.md"
  },
  {
    sequence: "004",
    codename: "Sign output source",
    version: "0.1.3",
    status: "activated",
    consensusCritical: true,
    activationHeight: 0,
    path: "changelog/protocol/004-sign-output-source.md"
  },
  {
    sequence: "005",
    codename: "Checkpoint 4032",
    version: "0.1.4",
    status: "activated",
    consensusCritical: true,
    activationHeight: 4032,
    path: "changelog/protocol/005-checkpoint-4032.md"
  },
  {
    sequence: "006",
    codename: "Proof v1 6750",
    version: "0.1.5",
    status: "activated",
    consensusCritical: true,
    activationHeight: 6750,
    path: "changelog/protocol/006-proof-v1-6750.md"
  },
  {
    sequence: "007",
    codename: "Proof v2 12000",
    version: "0.1.6",
    status: "activated",
    consensusCritical: true,
    activationHeight: 12000,
    path: "changelog/protocol/007-proof-v2-12000.md"
  },
  {
    sequence: "008",
    codename: "Checkpoint 16128",
    version: "0.1.7",
    status: "activated",
    consensusCritical: true,
    activationHeight: 16128,
    path: "changelog/protocol/008-checkpoint-16128.md"
  },
  {
    sequence: "009",
    codename: "SegWit cutover initial",
    version: "0.1.8",
    status: "superseded",
    consensusCritical: true,
    activationHeight: 37350,
    path: "changelog/protocol/009-segwit-cutover-initial.md"
  },
  {
    sequence: "010",
    codename: "V1 phase 39000",
    version: "0.1.9",
    status: "activated",
    consensusCritical: true,
    activationHeight: 39000,
    path: "changelog/protocol/010-v1-phase-39000.md"
  },
  {
    sequence: "011",
    codename: "LMP Axis Hotfix",
    version: "0.1.10",
    status: "activated",
    consensusCritical: true,
    activationHeight: 0,
    path: "changelog/protocol/011-lmp-axis-hotfix.md"
  },
  {
    sequence: "012",
    codename: "Bythos",
    version: "0.1.11",
    status: "final",
    consensusCritical: true,
    activationHeight: 54000,
    activationTarget: "2026-03-01",
    path: "changelog/protocol/012-bythos.md"
  },
  {
    sequence: "013",
    codename: "Nous",
    version: "1.0.0",
    status: "final",
    consensusCritical: false,
    activationHeight: 0,
    activationTarget: "2026-Q2",
    activationMode: "rollout-gated",
    path: "changelog/protocol/013-nous.md"
  },
  {
    sequence: "014",
    codename: "Aletheia",
    version: "0.1.14",
    status: "activated",
    protocolIndexStatus: "draft",
    consensusCritical: true,
    activationHeight: 65500,
    activationTarget: "2026-05-07",
    path: "changelog/protocol/014-aletheia.md"
  }
] as const;

export function createNockchainDocsAtlas() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
    scannedAt: upstream.scannedAt,
    upstream: {
      repository: {
        fullName: upstream.repository.fullName,
        defaultBranch: upstream.repository.defaultBranch,
        url: upstream.repository.url,
        lineageOrg: upstream.repository.upstreamOrg
      },
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease
    },
    trustContract: {
      readOrder: tier0Docs.map((doc) => doc.path),
      tierRule:
        "Tier 0 canonical spine and protocol specs carry global authority; promoted Tier 1 crate docs carry only scoped authority.",
      conflictRule: "Tier 0 overrides Tier 1; Tier 1 overrides legacy, historical, or unpromoted crate docs.",
      crateReadmeIsolationRule:
        "Do not trust a crate README in isolation for protocol, consensus, or architecture claims."
    },
    tier0: tier0Docs,
    tier1: tier1Docs,
    legacyOrExperimental: legacyOrExperimentalDocs,
    protocolSpecs: {
      specification: {
        path: "changelog/protocol/SPECIFICATION.md",
        role: "Canonical schema and lifecycle authority for protocol upgrade specs.",
        requiredSections: [
          "Summary",
          "Motivation",
          "Technical Specification",
          "Activation",
          "Migration",
          "Backward Compatibility",
          "Security Considerations",
          "Operational Impact",
          "Testing and Validation",
          "Reference Implementation"
        ],
        lifecycle: ["draft", "final", "activated", "superseded"],
        url: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/SPECIFICATION.md"
      },
      specs: protocolSpecs.map((spec) => ({
        ...spec,
        url: `https://github.com/nockchain/nockchain/blob/master/${spec.path}`
      }))
    },
    currentTrack: {
      protocolIndex: upstream.protocol.currentTrack,
      specFrontmatter: {
        previous: protocolSpecs.find((spec) => spec.sequence === "012"),
        next: protocolSpecs.find((spec) => spec.sequence === "013"),
        latestConsensusCritical: protocolSpecs.find((spec) => spec.sequence === "014")
      }
    },
    consistencyChecks: {
      protocolIndexMatchesSpecFrontmatter: false,
      alerts: [
        {
          id: "protocol-014-status-drift",
          severity: "attention",
          source: "PROTOCOL.md vs changelog/protocol/014-aletheia.md",
          observed:
            "PROTOCOL.md lists 014 Aletheia as draft while 014-aletheia.md frontmatter lists activated.",
          nocksperimentalAction:
            "Surface both sources in receipts and avoid flattening activation state unless the protocol index and spec frontmatter agree."
        }
      ]
    },
    nocksperimentalImplications: {
      receiptFields: [
        "docsAuthority",
        "protocolSpec",
        "protocolStatus",
        "activationHeight",
        "consensusCritical",
        "docConsistencyAlerts"
      ],
      verifierRules: [
        "Record the Tier 0 source that justified each protocol-sensitive assumption.",
        "Record the exact protocol spec path for activation-height or consensus-critical claims.",
        "Attach consistency alerts when PROTOCOL.md and spec frontmatter disagree.",
        "Treat crate README claims as scoped runtime/operator evidence, not protocol authority."
      ],
      nextProductSlices: [
        "Attach docs authority and protocol spec fields to fakenet, Nockup, and VESL receipts.",
        "Use the 014 status drift alert as a visible provenance warning in protocol-sensitive evidence.",
        "Monitor Tier 0 docs and protocol specs before accepting new Nockchain test assumptions."
      ]
    },
    links: {
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      release: upstream.links.release,
      zorp: upstream.links.zorp,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      nockupReceipts: `${registryCanonicalBaseUrl}/api/nockchain/nockup/receipts`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
