import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

const generatedAt = "2026-06-06T13:55:00.000Z";

const watchedSources = [
  {
    id: "zorp-github-org",
    kind: "github-org",
    url: "https://github.com/zorp-corp",
    authority: "lineage-and-authoring-signal",
    materialChanges:
      "new repos, renamed repos, archived status changes, pushedAt/updatedAt changes, or high-signal README/source changes"
  },
  {
    id: "zorp-nockchain-legacy-redirect",
    kind: "github-redirect",
    url: "https://github.com/zorp-corp/nockchain",
    authority: "legacy-redirect",
    materialChanges: "redirect target or ownership metadata changes"
  },
  {
    id: "canonical-nockchain-repository",
    kind: "github-repo",
    url: "https://github.com/nockchain/nockchain",
    authority: "canonical-protocol-authority",
    materialChanges:
      "default-branch commits, releases, tags, Tier 0 docs, protocol changelog, PMA, fakenet, wallet, API, bridge, nockup, or mining changes"
  },
  {
    id: "zorp-state-jam-drive",
    kind: "google-drive-folder",
    url: "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    authority: "state-artifact-provenance",
    materialChanges:
      "visible file additions, removals, renames, timestamp changes, manifests, hashes, network labels, or height/event-boundary metadata"
  }
] as const;

const findingSchema = {
  requiredFields: [
    "monitorRunId",
    "observedAt",
    "upstreamSourceUrl",
    "sourceAuthority",
    "sourceKind",
    "repoFullName",
    "commitShaOrArtifactHash",
    "affectedPaths",
    "changeSummary",
    "receiptImpact",
    "operatorAction",
    "nocksperimentalSurface",
    "verificationCommand",
    "rawArtifactPolicy",
    "decision"
  ],
  forbiddenFields: [
    "rawStateJam",
    "rawPmaSlab",
    "rawEventLog",
    "rawCheckpoint",
    "rawWalletExport",
    "walletSeedPhrase",
    "walletPrivateKey",
    "privateSpendKey",
    "privateGrpcPokePayload",
    "oauthToken"
  ],
  decisionValues: ["no-material-change", "docs-refresh", "code-refresh", "receipt-contract-refresh", "human-review"]
} as const;

const classificationFlow = [
  {
    id: "collect-current-state",
    label: "Collect current state",
    action:
      "Fetch Zorp repository inventory, canonical Nockchain commit/release metadata, legacy redirect state, and Drive-folder metadata visibility."
  },
  {
    id: "classify-source-authority",
    label: "Classify source authority",
    action:
      "Classify each change as canonical Nockchain authority, Zorp authoring, Zorp lineage, state-artifact provenance, or low-signal tooling."
  },
  {
    id: "compare-pinned-snapshot",
    label: "Compare pinned snapshot",
    action:
      "Compare against the pinned Nocksperimental snapshot and record whether assumptions are in-sync or require review."
  },
  {
    id: "route-to-nocksperimental-surface",
    label: "Route to Nocksperimental surface",
    action:
      "Name the specific atlas, source trace, receipt contract, runbook, or documentation surface that should change."
  },
  {
    id: "record-receipt-safe-finding",
    label: "Record receipt-safe finding",
    action:
      "Preserve source URL, repo, commit/artifact hash, affected path, impact, and verification command while excluding raw state and secrets."
  },
  {
    id: "verify-before-trust",
    label: "Verify before trust",
    action:
      "Run the narrowest affected Nocksperimental tests before treating a monitor finding as an accepted product assumption."
  }
] as const;

const routeMatrix = [
  {
    id: "canonical-nockchain-runtime",
    sourceAuthorities: ["canonical-protocol-authority", "canonical-nockchain-runtime"],
    triggers: [
      "Nockchain default branch, release, Tier 0 docs, PMA, fakenet, wallet, API, bridge, sync, mining, or nockup changes"
    ],
    targetSurfaces: [
      "nockchainWatch",
      "nockchainProtocolTrace",
      "nockchainRustAtlas",
      "nockchainRuntimeSafety",
      "nockchainMiningSourceTrace",
      "nockchainSyncGossipTrace",
      "nockchainApiSourceTrace"
    ],
    verificationCommands: [
      "npm run test:nockchain-watch",
      "npm run test:nockchain-mining-source-api",
      "npm run test:nockchain-sync-gossip-trace"
    ]
  },
  {
    id: "zorp-authoring-fixtures",
    sourceAuthorities: ["zorp-authoring-signal", "lineage-and-authoring-signal"],
    triggers: ["zorp-corp/jock-lang compiler, examples, docs, Hoon interop, or Nock authoring changes"],
    targetSurfaces: ["nockupValidation", "generatedLabReports", "fixtureDocs", "zorpUpstream"],
    verificationCommands: [
      "npm run test:zorp-upstream-api",
      "npm run test:nockup-validation",
      "npm run test:generated-reports"
    ]
  },
  {
    id: "state-jam-artifacts",
    sourceAuthorities: ["state-artifact-provenance", "zorp-state-jam-metadata"],
    triggers: ["new, renamed, removed, or replaced state-jam/checkpoint artifacts or metadata"],
    targetSurfaces: [
      "stateJamRegistry",
      "nockchainPmaSourceTrace",
      "localFakenetEvidence",
      "nockchainOperationsAtlas"
    ],
    verificationCommands: [
      "npm run test:nockchain-state-jams-api",
      "npm run test:nockchain-pma-source-api",
      "npm run test:local-fakenet-evidence-api"
    ]
  },
  {
    id: "lineage-runtime-context",
    sourceAuthorities: ["zorp-public-repo-lineage", "lineage-and-authoring-signal"],
    triggers: ["zorp-corp/nockapp, sword, knock, or sppark metadata, docs, examples, or source updates"],
    targetSurfaces: ["zorpUpstream", "nockchainNockAppAtlas", "nockchainNockAppSourceTrace", "docsResearch"],
    verificationCommands: [
      "npm run test:zorp-upstream-api",
      "npm run test:zorp-intelligence-page",
      "npm run test:nockchain-nockapp-source-api"
    ]
  }
] as const;

const monitorRunTemplates = [
  {
    id: "zorp-org-repo-update",
    sourceId: "zorp-github-org",
    requiredEvidence: ["repoFullName", "updatedAt", "pushedAt", "archived", "fork", "primarySignal"],
    defaultDecision: "human-review",
    rawArtifactPolicy: "metadata-only"
  },
  {
    id: "zorp-org-drift-check",
    sourceId: "zorp-github-org",
    requiredEvidence: ["repoFullName", "updatedAt", "pushedAt", "defaultBranch", "driftField", "operatorAction"],
    defaultDecision: "human-review",
    rawArtifactPolicy: "metadata-only"
  },
  {
    id: "canonical-nockchain-release",
    sourceId: "canonical-nockchain-repository",
    requiredEvidence: ["commitSha", "releaseTag", "publishedAt", "affectedPaths", "targetSurfaces"],
    defaultDecision: "receipt-contract-refresh",
    rawArtifactPolicy: "source-metadata-only"
  },
  {
    id: "drive-state-jam-artifact",
    sourceId: "zorp-state-jam-drive",
    requiredEvidence: ["sourceUrl", "filename", "size", "hash", "network", "heightOrEventBoundary", "producingBuild"],
    defaultDecision: "human-review",
    rawArtifactPolicy: "never-store-raw-artifact"
  }
] as const;

const localVerification = {
  status: "monitor-runbook-defined",
  recommendedCommands: [
    "node scripts/run-zorp-monitor-snapshot.mjs --json",
    "npm run check:zorp-org-drift -- --json",
    "npm run test:zorp-monitor-runbook-api",
    "npm run test:zorp-monitor-runbook-page",
    "npm run test:nockchain-watch",
    "npm run test:zorp-upstream-api"
  ],
  notes: [
    "Use the snapshot command to collect GitHub metadata; inspect the Drive folder manually or through an authenticated connector without downloading raw state artifacts.",
    "A monitor finding is not accepted product evidence until the routed Nocksperimental verification command passes."
  ]
} as const;

export function createZorpMonitorRunbook() {
  const zorp = createZorpUpstreamMap();

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/zorp/monitor`,
    generatedAt,
    automation: {
      active: zorp.monitor.active,
      automationId: zorp.monitor.automationId,
      automationName: zorp.monitor.automationName,
      interval: zorp.monitor.interval,
      executionEnvironment: "local",
      workspace: "/home/kgbrah/nocklab/nocksperimental",
      supersededAutomationIds: [
        "watch-vesl-drive-folder",
        "watch-zorp-nockchain-repos-and-state-jams",
        "zorp-nockchain-watch"
      ]
    },
    currentSnapshot: {
      zorp: {
        publicRepoCount: zorp.organization.publicRepoCount,
        latestOrgUpdateAt: zorp.monitorBrief.snapshot.latestOrgUpdateAt,
        priorityRepos: zorp.monitorBrief.priorityRepos
      },
      nockchain: {
        commit: zorp.nockchain.latestCommit,
        release: zorp.nockchain.latestRelease,
        canonicalUrl: zorp.nockchain.canonicalRelocation.canonicalUrl,
        legacyUrl: zorp.nockchain.canonicalRelocation.legacyUrl
      },
      stateJamDrive: {
        url: zorp.stateJamDrive.url,
        classification: "Zorp/Nockchain state-jam folder, not a VESL folder.",
        artifactPolicy: zorp.stateJamDrive.artifactPolicy
      }
    },
    watchedSources,
    findingSchema,
    classificationFlow,
    monitorClasses: zorp.monitorReviewContract.classes,
    routeMatrix,
    monitorRunTemplates,
    localVerification,
    nocksperimentalImplications: [
      "Monitor reports can now be converted into receipt-safe findings with explicit source authority and verification commands.",
      "The active monitor should route canonical Nockchain changes to source traces and Zorp changes to lineage/authoring surfaces before code assumptions move.",
      "Drive state-jam findings remain metadata-only and should never become raw artifacts in public APIs, support bundles, or git."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/zorp/monitor`,
      api: `${registryCanonicalBaseUrl}/api/nockchain/zorp/monitor`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
