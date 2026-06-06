import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

const observedAt = "2026-06-05T23:59:00.000Z";

const sources = [
  {
    id: "github-nockchain-commit",
    kind: "github-api",
    url: "https://api.github.com/repos/nockchain/nockchain/commits/master",
    use: "Current canonical default-branch commit and commit-message change surface."
  },
  {
    id: "github-nockchain-release",
    kind: "github-api",
    url: "https://api.github.com/repos/nockchain/nockchain/releases/latest",
    use: "Current build release tag and published-at timestamp."
  },
  {
    id: "github-zorp-repos",
    kind: "github-api",
    url: "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated",
    use: "Zorp public repository inventory and updated/pushed timestamps."
  },
  {
    id: "zorp-state-jam-drive",
    kind: "google-drive-folder",
    url: "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    use: "Zorp/Nockchain state-jam artifact source; metadata-only handling."
  },
  {
    id: "local-upstream-clone",
    kind: "scratch-checkout",
    url: "file:///tmp/nockchain-upstream-current",
    use: "Local shallow checkout used to inspect docs, scripts, and crate surfaces."
  }
] as const;

const watchQueue = [
  {
    id: "bridge-withdrawal-execution",
    domain: "bridge-withdrawals",
    severity: "high",
    source: "nockchain/nockchain",
    latestSignal: "bridge: add end-to-end withdrawal execution (#127)",
    whyItMatters:
      "The latest public build release now includes bridge withdrawal assembly, signing, sequencer authorization, submission, confirmation polling, and journal persistence.",
    reviewTrigger:
      "Any commit or release touching crates/bridge, crates/nockchain-bridge-sequencer, wallet-tx-builder withdrawal fixtures, or hoon/apps/bridge.",
    nocksperimentalAction:
      "Keep bridge and settlement receipts explicit about commit/build provenance, sequencer authorization state, blockchain constants, proposal hashes, and confirmed inclusion."
  },
  {
    id: "libp2p-behind-tip-gossip",
    domain: "fakenet-mining",
    severity: "high",
    source: "nockchain/nockchain",
    latestSignal: "libp2p: suppress all outgoing gossip while catching up (behind tip)",
    whyItMatters:
      "Wrong block commitments, no peers, or quiet miners can be expected while a node is behind tip; receipts must capture sync mode before treating symptoms as failures.",
    reviewTrigger:
      "Any commit touching catch_up.rs, p2p_state.rs, driver.rs, metrics.rs, fakenet scripts, or mining output.",
    nocksperimentalAction:
      "Keep fakenet diagnostics, operations triage, and miner runbooks tied to tip status, peer count, route-table size, and block-commitment provenance."
  },
  {
    id: "state-jam-drive-inventory",
    domain: "state-artifacts",
    severity: "high",
    source: "Zorp state-jam Drive folder",
    latestSignal: "Drive folder is a Zorp/Nockchain state-jam folder, not a VESL evidence folder.",
    whyItMatters:
      "State jams and PMA data can bootstrap or confuse local chain state; raw artifacts must stay out of git and out of public APIs.",
    reviewTrigger: "New, renamed, or replaced state-jam/checkpoint artifacts.",
    nocksperimentalAction:
      "Inventory filename, hash, size, network, height/event boundary, producing build, and source URL before using an artifact in tests."
  },
  {
    id: "zorp-nockapp-archived-update",
    domain: "zorp-lineage",
    severity: "medium",
    source: "zorp-corp/nockapp",
    latestSignal: "zorp-corp/nockapp shows recent metadata updates while remaining archived.",
    whyItMatters:
      "NockApp lineage helps explain poke/peek/state-machine semantics, but archived repo changes are not current protocol authority.",
    reviewTrigger: "Repository metadata, docs, or examples change after an upstream scan.",
    nocksperimentalAction:
      "Treat zorp-corp/nockapp metadata changes as lineage review until a non-archived canonical repo changes."
  },
  {
    id: "jock-lang-authoring",
    domain: "fixture-authoring",
    severity: "medium",
    source: "zorp-corp/jock-lang",
    latestSignal: "Jock remains the clearest public Zorp signal for higher-level Nock authoring.",
    whyItMatters:
      "Jock language/compiler shifts can shape future NockApp fixture generation and Nocksperimental test authoring.",
    reviewTrigger: "Commits touching compiler behavior, examples, docs, or Hoon/Jock interop.",
    nocksperimentalAction:
      "Promote relevant language-authoring changes into fixture docs and nockup validation scenarios."
  },
  {
    id: "wallet-api-command-drift",
    domain: "wallet-api",
    severity: "medium",
    source: "crates/nockchain-wallet/README.md and crates/nockchain-api/README.md",
    latestSignal: "Wallet and API docs define public/private endpoints, balance commands, and alpha API risk.",
    whyItMatters:
      "Balance receipts are only meaningful when endpoint mode, watched keys, note visibility, and sync context are recorded.",
    reviewTrigger: "Wallet README, API README, public API flags, private gRPC flags, or balance/list-note commands change.",
    nocksperimentalAction:
      "Update the wallet atlas before changing fakenet balance checks or publishing wallet-derived evidence."
  },
  {
    id: "rust-workspace-drift",
    domain: "rust-workspace",
    severity: "medium",
    source: "Cargo workspace and Nockchain Tier 0 docs",
    latestSignal: "Rust workspace groups protocol runtime, operator tools, NockApp runtime, Hoon/scaffolding, bridge/proof, and serialization crates.",
    whyItMatters:
      "Crate movement changes which cargo checks prove a receipt assumption and which source file owns a behavior.",
    reviewTrigger: "Cargo.toml workspace membership, crate READMEs, validation gates, or protocol docs change.",
    nocksperimentalAction:
      "Refresh Rust atlas groups, validation gates, and operator-facing crate ownership before claiming source-level expertise."
  }
] as const;

const changeClassificationContract = {
  sourcePolicy: "source-authority-matrix",
  reviewOutputContract: [
    "Every monitor run must classify changed upstream items before recommending code, docs, receipt, or operator-runbook updates.",
    "Canonical Nockchain protocol and release changes outrank Zorp lineage or fixture-authoring signals.",
    "State-jam and PMA artifacts must stay metadata-only until filename, hash, size, network, height or event boundary, and producing build are recorded.",
    "Receipt-impacting changes must name the Nocksperimental surface that needs a follow-up test before evidence is trusted."
  ],
  requiredEvidenceFields: [
    "upstreamSourceUrl",
    "observedAt",
    "changeClassId",
    "sourceAuthority",
    "upstreamCommitOrArtifactId",
    "affectedPaths",
    "receiptRisk",
    "operatorAction",
    "recommendedNocksperimentalUpdates",
    "verificationCommand"
  ],
  classes: [
    {
      id: "protocol-consensus",
      escalation: "immediate",
      sourceAuthority: "canonical-nockchain-tier-0",
      sourceSignals: ["PROTOCOL.md", "changelog/protocol/*.md", "hoon/apps/dumbnet"],
      targetSurfaces: ["nockchainProtocolTrace", "registryCheckpoint", "receiptProvenance"],
      receiptRisk: "Consensus semantics can invalidate block, transaction, balance, or bridge evidence assumptions.",
      recommendedNocksperimentalUpdates: [
        "refresh protocol trace source anchors",
        "update registry checkpoint status-drift fields",
        "add or revise receipt provenance tests"
      ]
    },
    {
      id: "release-build",
      escalation: "immediate",
      sourceAuthority: "canonical-nockchain-release",
      sourceSignals: ["GitHub release tag", "release assets", "release manifest hashes"],
      targetSurfaces: ["nockchainReleaseAssets", "nockchainBridgeTrace", "registryCheckpoint"],
      receiptRisk: "A new build changes which binary, manifest, and commit hash a receipt can cite.",
      recommendedNocksperimentalUpdates: [
        "refresh release asset manifest",
        "record commit/build provenance",
        "smoke release-dependent pages and APIs"
      ]
    },
    {
      id: "pma-state-jam",
      escalation: "immediate",
      sourceAuthority: "zorp-state-jam-metadata",
      sourceSignals: ["State Jam Drive artifact", "PMA docs", "checkpoint bootstrap notes"],
      targetSurfaces: ["stateJamRegistry", "nockchainOperationsAtlas", "localFakenetEvidence"],
      receiptRisk: "Bootstrap artifacts can change local state, replay boundaries, and support-bundle safety.",
      recommendedNocksperimentalUpdates: [
        "inventory metadata without storing raw artifacts",
        "update PMA safety guidance",
        "require artifact provenance in fakenet support bundles"
      ]
    },
    {
      id: "libp2p-sync-mining",
      escalation: "high",
      sourceAuthority: "canonical-nockchain-runtime",
      sourceSignals: ["catch_up.rs", "p2p_state.rs", "driver.rs", "fakenet scripts"],
      targetSurfaces: [
        "nockchainSyncGossipTrace",
        "nockchainOperationsAtlas",
        "localFakenetReadiness",
        "fakenetEvidence"
      ],
      receiptRisk: "Peer, route-table, tip, and block-commitment symptoms can be misread when sync behavior changes.",
      recommendedNocksperimentalUpdates: [
        "refresh sync/gossip trace",
        "update fakenet diagnostics",
        "capture peer and tip status in evidence receipts"
      ]
    },
    {
      id: "wallet-api",
      escalation: "high",
      sourceAuthority: "canonical-nockchain-tier-1",
      sourceSignals: [
        "crates/nockchain-wallet/README.md",
        "crates/nockchain-api/README.md",
        "public/private gRPC flags"
      ],
      targetSurfaces: ["nockchainWalletAtlas", "localFakenetCommands", "balanceEvidence"],
      receiptRisk: "Balance and transaction evidence can confuse endpoint mode, watched keys, note visibility, or API cache state.",
      recommendedNocksperimentalUpdates: [
        "refresh wallet command atlas",
        "refresh public API evidence contract",
        "rerun balance and transaction evidence tests"
      ]
    },
    {
      id: "rust-workspace",
      escalation: "high",
      sourceAuthority: "canonical-nockchain-workspace",
      sourceSignals: ["Cargo.toml workspace members", "crate READMEs", "validation gates"],
      targetSurfaces: ["nockchainRustAtlas", "nockchainDocsAtlas", "validationGates"],
      receiptRisk: "Crate ownership drift changes which source files and cargo checks support an evidence claim.",
      recommendedNocksperimentalUpdates: [
        "refresh Rust crate groups",
        "update validation gates",
        "map new crates to operator-facing risks"
      ]
    },
    {
      id: "zorp-lineage",
      escalation: "medium",
      sourceAuthority: "zorp-public-repo-lineage",
      sourceSignals: ["zorp-corp/nockapp", "zorp-corp/sword", "zorp-corp/knock"],
      targetSurfaces: ["zorpUpstream", "nockchainWatch", "docsResearch"],
      receiptRisk: "Lineage updates can explain semantics but should not override canonical protocol sources.",
      recommendedNocksperimentalUpdates: [
        "update Zorp source-authority notes",
        "separate lineage findings from canonical protocol claims",
        "refresh collaboration notes when useful"
      ]
    },
    {
      id: "fixture-authoring",
      escalation: "medium",
      sourceAuthority: "zorp-authoring-signal",
      sourceSignals: ["zorp-corp/jock-lang", "nockup templates", "example apps"],
      targetSurfaces: ["nockupValidation", "generatedLabReports", "fixtureDocs"],
      receiptRisk: "Authoring-tool changes can alter how fixtures are generated, validated, or explained.",
      recommendedNocksperimentalUpdates: [
        "refresh fixture authoring assumptions",
        "add nockup validation scenarios",
        "document reusable test patterns"
      ]
    }
  ]
} as const;

export function createNockchainWatchBoard() {
  const upstream = nockchainUpstreamIntelligence;
  const zorp = createZorpUpstreamMap();
  const stateJams = createNockchainStateJamRegistry();
  const nockapp = zorp.repositories.find((repo) => repo.fullName === "zorp-corp/nockapp");
  const jock = zorp.repositories.find((repo) => repo.fullName === "zorp-corp/jock-lang");
  const commitMatchesPinned = upstream.latestCommit.shortSha === "33ba97b1e206";
  const releaseMatchesPinned =
    upstream.latestRelease.tag === "build-33ba97b1e206dd89b15c61b72b7802caf2136c18";
  const latestCommitReleased = upstream.latestRelease.tag.includes(upstream.latestCommit.sha);
  const zorpStateJamFolderClassified =
    zorp.stateJamDrive.classification.includes("not a VESL folder") &&
    stateJams.sources.every((source) => source.artifactPolicy === "metadata-only");

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
    observedAt,
    status:
      commitMatchesPinned && releaseMatchesPinned && latestCommitReleased
        ? "in-sync"
        : "review-needed",
    sources,
    pinned: {
      source: "nockchain-upstream-intelligence",
      nockchain: {
        repository: upstream.repository,
        commit: upstream.latestCommit,
        release: upstream.latestRelease,
        docsPolicy: upstream.docs.policy
      }
    },
    observed: {
      nockchain: {
        repository: upstream.repository.fullName,
        defaultBranch: upstream.repository.defaultBranch,
        commit: upstream.latestCommit,
        release: upstream.latestRelease
      },
      zorp: {
        organization: zorp.organization.slug,
        publicRepoCount: zorp.repositories.length,
        latestOrgUpdateAt: zorp.monitorBrief.snapshot.latestOrgUpdateAt,
        priorityRepos: zorp.monitorBrief.priorityRepos,
        nockapp: nockapp
          ? {
              fullName: nockapp.fullName,
              archived: nockapp.archived,
              updatedAt: nockapp.updatedAt,
              pushedAt: nockapp.pushedAt,
              primarySignal: nockapp.primarySignal
            }
          : null,
        jock: jock
          ? {
              fullName: jock.fullName,
              archived: jock.archived,
              updatedAt: jock.updatedAt,
              pushedAt: jock.pushedAt,
              primarySignal: jock.primarySignal
            }
          : null
      },
      stateJams: {
        sourceCount: stateJams.sources.length,
        rawArtifactStorage: stateJams.policy.rawArtifactStorage,
        requiredMetadata: stateJams.requiredMetadata,
        driveUrl: zorp.stateJamDrive.url
      }
    },
    drift: {
      commitMatchesPinned,
      releaseMatchesPinned,
      latestCommitReleased,
      defaultBranchAheadOfRelease: !latestCommitReleased,
      zorpStateJamFolderClassified,
      requiresHumanReview: watchQueue.some((item) => item.severity === "high"),
      requiredReviewSignals: [
        "bridge withdrawal execution is now represented by the latest public build release",
        "libp2p behind-tip gossip suppression affects fakenet mining interpretation",
        "zorp-corp/nockapp archived repo updated metadata",
        "Zorp state-jam Drive folder requires metadata inventory before trust",
        "wallet/API command surfaces need review when upstream README flags change",
        "Rust workspace ownership should be refreshed when Cargo membership changes"
      ]
    },
    changeClassificationContract,
    watchQueue,
    operatorChecklist: [
      "Compare live GitHub commit and release against the pinned Nocksperimental upstream snapshot before interpreting fakenet failures.",
      "Treat zorp-corp/nockapp metadata changes as lineage review until a non-archived canonical repo changes.",
      "Inventory the Zorp state-jam Drive folder as metadata only before trusting bootstrap artifacts.",
      "Promote new Nockchain commit, release, protocol-doc, PMA, libp2p, wallet, or fakenet changes into the relevant atlas before issuing receipts.",
      "Keep the monitor cadence and watched source list visible in registry checkpoints so stale assumptions are easy to spot."
    ],
    monitor: {
      active: zorp.monitor.active,
      automationId: zorp.monitor.automationId,
      automationName: zorp.monitor.automationName,
      interval: zorp.monitor.interval,
      watchedSources: zorp.monitor.watchedSources,
      highSignalChanges: zorp.monitor.highSignalChanges
    },
    links: {
      upstream: upstream.canonicalUrl,
      zorp: zorp.canonicalUrl,
      stateJams: stateJams.canonicalUrl,
      operations: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      wallet: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      watchPage: `${registryCanonicalBaseUrl}/nockchain/watch`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
