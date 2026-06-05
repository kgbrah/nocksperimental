import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const authoritySources = [
  {
    id: "protocol-index",
    path: "PROTOCOL.md",
    role: "Canonical protocol index and active-upgrade selector.",
    authority: "tier-0-protocol-index",
    evidence:
      "If protocol guidance conflicts with workflow or crate docs, PROTOCOL.md and the linked upgrade specs win.",
    url: "https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md"
  },
  {
    id: "spec-format",
    path: "changelog/protocol/SPECIFICATION.md",
    role: "Schema, lifecycle, and required-section contract for protocol upgrade specs.",
    authority: "protocol-spec-schema",
    evidence:
      "Defines TOML frontmatter, lifecycle states, required sections, activation semantics, and maintenance expectations.",
    url: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/SPECIFICATION.md"
  },
  {
    id: "nous-013",
    path: "changelog/protocol/013-nous.md",
    role: "Next scheduled release-track upgrade: libp2p request-response generation 2.",
    authority: "specific-upgrade-spec",
    evidence:
      "Frontmatter records status final, consensus_critical false, activation_height 0, and activation_target 2026-Q2.",
    url: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/013-nous.md"
  },
  {
    id: "aletheia-014",
    path: "changelog/protocol/014-aletheia.md",
    role: "Consensus-critical ASERT, block-time, emissions, and coinbase split activation spec.",
    authority: "specific-upgrade-spec",
    evidence:
      "Frontmatter records status activated, consensus_critical true, and activation_height 65500.",
    url: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/014-aletheia.md"
  },
  {
    id: "status-drift-014",
    path: "PROTOCOL.md",
    role: "Visible status drift between the protocol index and 014 Aletheia spec frontmatter.",
    authority: "consistency-alert",
    evidence:
      "PROTOCOL.md lists 014 Aletheia as draft while changelog/protocol/014-aletheia.md frontmatter lists activated.",
    url: "https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md"
  }
] as const;

const requiredSections = [
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
] as const;

const receiptFields = [
  "docsAuthority",
  "protocolSpec",
  "protocolIndexStatus",
  "specFrontmatterStatus",
  "activationHeight",
  "activationTarget",
  "activationMode",
  "consensusCritical",
  "consensusRuleSurface",
  "nodeUpgradeRequired",
  "networkPartitionRisk",
  "validationEvidence",
  "upstreamCommit",
  "upstreamRelease",
  "zorpSource"
] as const;

export function createNockchainProtocolTrace() {
  const upstream = nockchainUpstreamIntelligence;
  const docsAtlas = createNockchainDocsAtlas();
  const nousSpec = docsAtlas.protocolSpecs.specs.find((spec) => spec.sequence === "013");
  const aletheiaSpec = docsAtlas.protocolSpecs.specs.find((spec) => spec.sequence === "014");
  const aletheiaProtocolIndexStatus: string = upstream.protocol.currentTrack.draft.status;
  const aletheiaSpecFrontmatterStatus: string = aletheiaSpec?.status ?? "activated";

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/protocol`,
    generatedAt: "2026-06-05T23:45:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      protocolAuthority: upstream.protocol.authority
    },
    authoritySources,
    lifecycleContract: {
      statuses: ["draft", "final", "activated", "superseded"],
      activationHeightZeroMeaning:
        "activation_height = 0 means no consensus height trigger is recorded: usually a historical gap or rollout-gated operational activation.",
      requiredSections,
      maintenanceRule:
        "When adding or updating any file in changelog/protocol/, PROTOCOL.md must be updated in the same change."
    },
    releaseTrack: {
      nextScheduled: {
        sequence: "013",
        codename: "Nous",
        version: nousSpec?.version ?? "1.0.0",
        status: nousSpec?.status ?? "final",
        protocolIndexStatus: upstream.protocol.currentTrack.next.status,
        consensusCritical: nousSpec?.consensusCritical ?? false,
        activationHeight: nousSpec?.activationHeight ?? 0,
        activationTarget: nousSpec?.activationTarget ?? "2026-Q2",
        activationMode: "rollout-gated",
        primaryImpact:
          "Libp2p request-response generation 2 adds batched transport and catch-up prefetch without changing consensus semantics."
      },
      previous: {
        sequence: "012",
        codename: "Bythos",
        version: "0.1.11",
        status: "final",
        consensusCritical: true,
        activationHeight: 54000,
        activationTarget: "2026-03-01"
      },
      latestConsensusCritical: {
        sequence: "014",
        codename: "Aletheia",
        version: aletheiaSpec?.version ?? "0.1.14",
        protocolIndexStatus: aletheiaProtocolIndexStatus,
        specFrontmatterStatus: aletheiaSpecFrontmatterStatus,
        statusDrift: aletheiaProtocolIndexStatus !== aletheiaSpecFrontmatterStatus,
        consensusCritical: true,
        activationHeight: aletheiaSpec?.activationHeight ?? 65500,
        activationTarget: aletheiaSpec?.activationTarget ?? "2026-05-07",
        consensusRuleSurface: [
          "ASERT per-block difficulty adjustment",
          "block-time reduction from 600s to 150s",
          "unified emissions curve",
          "post-activation 80/20 miner/protocol-fund coinbase split"
        ],
        networkPartitionRisk:
          "Nodes that do not upgrade can reject valid post-activation blocks or accept invalid legacy-target descendants."
      }
    },
    consistencyAlerts: docsAtlas.consistencyChecks.alerts,
    receiptFields,
    operatorChecklist: [
      "Do not flatten 014 Aletheia status until PROTOCOL.md and spec frontmatter agree.",
      "Treat activation_height = 0 as rollout-gated or historical-gap context, not proof of no upgrade.",
      "Attach the exact protocol spec path and upstream commit to any protocol-sensitive fakenet, Nockup, or VESL receipt.",
      "Record consensusCritical, activationHeight, and networkPartitionRisk before interpreting post-activation mining or balance evidence.",
      "Use crate READMEs only as scoped runtime/operator evidence after the Tier 0 protocol source is recorded."
    ],
    nocksperimentalImplications: [
      "Fakenet readiness should expose protocol track and active consistency alerts beside sync/peer fields.",
      "State-jam receipts should record which protocol activation height and Nockchain build produced the artifact.",
      "Nockup validation receipts should preserve whether a fixture assumes Nous gen2 networking or Aletheia post-activation consensus rules.",
      "Wallet and balance receipts should include protocol index status when activation-sensitive coinbase behavior is under test."
    ],
    links: {
      upstream: upstream.canonicalUrl,
      docsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
      syncGossipTrace: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      zorpMap: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      protocolPage: `${registryCanonicalBaseUrl}/nockchain/protocol`,
      protocolIndex: "https://github.com/nockchain/nockchain/blob/master/PROTOCOL.md",
      specFormat: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/SPECIFICATION.md",
      nous013: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/013-nous.md",
      aletheia014: "https://github.com/nockchain/nockchain/blob/master/changelog/protocol/014-aletheia.md"
    }
  };
}
