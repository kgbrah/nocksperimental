import { createHash } from "node:crypto";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import { createNockchainBridgeTrace } from "@/lib/nockchain-bridge-trace";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { createNockchainOperationsAtlas } from "@/lib/nockchain-operations-atlas";
import { createNockchainProtocolTrace } from "@/lib/nockchain-protocol-trace";
import { createNockchainReleaseAssets } from "@/lib/nockchain-release-assets";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createNockchainSyncGossipTrace } from "@/lib/nockchain-sync-gossip-trace";
import { createNockchainWalletAtlas } from "@/lib/nockchain-wallet-atlas";
import { createNockchainWatchBoard } from "@/lib/nockchain-watch";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { scoreHistorySummaries } from "@/lib/trust-score-history";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import {
  badgeEmbeds,
  badgeIssuanceReceipts,
  badgeRevocations,
  computeBenchmarkProfiles,
  resolvedBadges,
  solverScorecards,
  tokenCompatibilityReports,
  trustSignals
} from "@/lib/trust-signals";

export function createRegistryCheckpoint() {
  const generatedReports = loadGeneratedLabReports();
  const localFakenetEvidence = createLocalFakenetEvidenceCapsule();
  const nockchainBridgeTrace = createNockchainBridgeTrace();
  const nockchainReleaseAssets = createNockchainReleaseAssets();
  const nockchainDocsAtlas = createNockchainDocsAtlas();
  const nockchainProtocolTrace = createNockchainProtocolTrace();
  const nockchainRustAtlas = createNockchainRustAtlas();
  const nockchainOperationsAtlas = createNockchainOperationsAtlas();
  const nockchainWalletAtlas = createNockchainWalletAtlas();
  const nockchainWatch = createNockchainWatchBoard();
  const nockchainSyncGossipTrace = createNockchainSyncGossipTrace();
  const stateJamRegistry = createNockchainStateJamRegistry();
  const zorpUpstream = createZorpUpstreamMap();
  const generatedReportEvidence = generatedReports.reports.map((report) => ({
    appSlug: report.appSlug,
    fixtureId: report.fixtureId,
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    status: report.status,
    reportHash: report.reportHash,
    snapshotRoot: report.snapshotRoot
  }));
  const counts = {
    badges: trustSignals.verifiedBadges.length,
    publicBadgeEmbeds: badgeEmbeds.length,
    badgeIssuanceReceipts: badgeIssuanceReceipts.length,
    badgeRevocations: badgeRevocations.length,
    generatedReports: generatedReports.totals.reportCount,
    localFakenetReports: localFakenetEvidence.summary.reportCount,
    trustUpdates: trustUpdateChainSummary.entryCount,
    solverScorecards: solverScorecards.length,
    tokenCompatibilityReports: tokenCompatibilityReports.length,
    computeBenchmarkProfiles: computeBenchmarkProfiles.length,
    scoreHistories: scoreHistorySummaries.length,
    trustConsumers: trustSignals.trustConsumers.length,
    zorpRepositories: zorpUpstream.repositories.length,
    nockchainBridgeSources: nockchainBridgeTrace.sourceAnchors.length,
    nockchainReleaseAssets: nockchainReleaseAssets.assets.length,
    nockchainReleaseManifestTargets: nockchainReleaseAssets.manifest.targets.length,
    nockchainProtocolSpecs: nockchainDocsAtlas.protocolSpecs.specs.length,
    nockchainProtocolSources: nockchainProtocolTrace.authoritySources.length,
    nockchainRustCrates: nockchainRustAtlas.crates.length,
    nockchainRustWorkspaceMembers: nockchainRustAtlas.workspace.memberCount,
    nockchainOperationsScenarios: nockchainOperationsAtlas.triageScenarios.length,
    nockchainWalletCommands: nockchainWalletAtlas.walletCommands.length,
    nockchainWatchItems: nockchainWatch.watchQueue.length,
    nockchainSyncGossipAnchors: nockchainSyncGossipTrace.sourceAnchors.length,
    stateJamSources: stateJamRegistry.sources.length
  };
  const roots = {
    trustSignals: createSha256Root(trustSignals),
    generatedReports: createSha256Root({
      generatedAt: generatedReports.generatedAt,
      status: generatedReports.status,
      totals: generatedReports.totals,
      reports: generatedReportEvidence
    }),
    localFakenetEvidence: createSha256Root({
      generatedAt: localFakenetEvidence.generatedAt,
      status: localFakenetEvidence.status,
      summary: localFakenetEvidence.summary,
      verifier: localFakenetEvidence.verifier
    }),
    nockchainBridgeTrace: createSha256Root({
      generatedAt: nockchainBridgeTrace.generatedAt,
      upstream: nockchainBridgeTrace.upstream,
      releaseDrift: nockchainBridgeTrace.releaseDrift,
      sourceAnchors: nockchainBridgeTrace.sourceAnchors,
      withdrawalFlow: nockchainBridgeTrace.withdrawalFlow,
      safetyInvariants: nockchainBridgeTrace.safetyInvariants,
      receiptFields: nockchainBridgeTrace.receiptFields
    }),
    nockchainReleaseAssets: createSha256Root({
      generatedAt: nockchainReleaseAssets.generatedAt,
      upstream: nockchainReleaseAssets.upstream,
      release: nockchainReleaseAssets.release,
      manifest: nockchainReleaseAssets.manifest,
      assets: nockchainReleaseAssets.assets,
      assetGroups: nockchainReleaseAssets.assetGroups,
      provenance: nockchainReleaseAssets.provenance
    }),
    zorpUpstream: createSha256Root({
      scannedAt: zorpUpstream.scannedAt,
      organization: zorpUpstream.organization,
      nockchain: zorpUpstream.nockchain,
      sourceAuthority: zorpUpstream.sourceAuthority,
      stateJamDrive: zorpUpstream.stateJamDrive,
      repositories: zorpUpstream.repositories,
      layers: zorpUpstream.layers,
      monitor: zorpUpstream.monitor
    }),
    nockchainDocsAtlas: createSha256Root({
      scannedAt: nockchainDocsAtlas.scannedAt,
      upstream: nockchainDocsAtlas.upstream,
      trustContract: nockchainDocsAtlas.trustContract,
      tier0: nockchainDocsAtlas.tier0,
      tier1: nockchainDocsAtlas.tier1,
      legacyOrExperimental: nockchainDocsAtlas.legacyOrExperimental,
      protocolSpecs: nockchainDocsAtlas.protocolSpecs,
      consistencyChecks: nockchainDocsAtlas.consistencyChecks
    }),
    nockchainProtocolTrace: createSha256Root({
      generatedAt: nockchainProtocolTrace.generatedAt,
      upstream: nockchainProtocolTrace.upstream,
      authoritySources: nockchainProtocolTrace.authoritySources,
      lifecycleContract: nockchainProtocolTrace.lifecycleContract,
      releaseTrack: nockchainProtocolTrace.releaseTrack,
      consistencyAlerts: nockchainProtocolTrace.consistencyAlerts,
      receiptFields: nockchainProtocolTrace.receiptFields
    }),
    stateJamRegistry: createSha256Root({
      generatedAt: stateJamRegistry.generatedAt,
      policy: stateJamRegistry.policy,
      requiredMetadata: stateJamRegistry.requiredMetadata,
      sources: stateJamRegistry.sources,
      upstream: stateJamRegistry.upstream
    }),
    nockchainRustAtlas: createSha256Root({
      scannedAt: nockchainRustAtlas.scannedAt,
      upstream: nockchainRustAtlas.upstream,
      workspace: nockchainRustAtlas.workspace,
      groups: nockchainRustAtlas.groups,
      crates: nockchainRustAtlas.crates,
      watchThemes: nockchainRustAtlas.watchThemes
    }),
    nockchainOperationsAtlas: createSha256Root({
      generatedAt: nockchainOperationsAtlas.generatedAt,
      upstream: nockchainOperationsAtlas.upstream,
      scriptSources: nockchainOperationsAtlas.scriptSources,
      triageScenarios: nockchainOperationsAtlas.triageScenarios,
      operatorChecklist: nockchainOperationsAtlas.operatorChecklist,
      stateArtifactSafety: nockchainOperationsAtlas.stateArtifactSafety
    }),
    nockchainWalletAtlas: createSha256Root({
      generatedAt: nockchainWalletAtlas.generatedAt,
      upstream: nockchainWalletAtlas.upstream,
      walletCommands: nockchainWalletAtlas.walletCommands,
      endpointModes: nockchainWalletAtlas.endpointModes,
      localFakenetProfile: nockchainWalletAtlas.localFakenetProfile,
      balanceEvidenceContract: nockchainWalletAtlas.balanceEvidenceContract,
      safety: nockchainWalletAtlas.safety,
      triageScenarios: nockchainWalletAtlas.triageScenarios
    }),
    nockchainWatch: createSha256Root({
      observedAt: nockchainWatch.observedAt,
      status: nockchainWatch.status,
      sources: nockchainWatch.sources,
      pinned: nockchainWatch.pinned,
      observed: nockchainWatch.observed,
      drift: nockchainWatch.drift,
      watchQueue: nockchainWatch.watchQueue,
      monitor: nockchainWatch.monitor
    }),
    nockchainSyncGossipTrace: createSha256Root({
      generatedAt: nockchainSyncGossipTrace.generatedAt,
      upstream: nockchainSyncGossipTrace.upstream,
      sourceAnchors: nockchainSyncGossipTrace.sourceAnchors,
      behaviorInvariants: nockchainSyncGossipTrace.behaviorInvariants,
      triageScenarios: nockchainSyncGossipTrace.triageScenarios,
      receiptFields: nockchainSyncGossipTrace.receiptFields,
      localVerification: nockchainSyncGossipTrace.localVerification
    }),
    trustUpdates: trustUpdateChainSummary.latestRoot
  };
  const checkpoint = {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
    counts,
    roots,
    checks: {
      appendOnlyTrustUpdates: trustUpdateChainSummary.isAppendOnly,
      validTrustUpdateSignatures:
        trustUpdateChainSummary.signedEntryCount === trustUpdateChainSummary.validSignatureCount,
      generatedReportsAvailable: generatedReports.totals.reportCount > 0,
      localFakenetEvidenceAvailable: localFakenetEvidence.summary.reportCount > 0,
      nockchainBridgeTraceAvailable:
        nockchainBridgeTrace.sourceAnchors.length > 0 &&
        nockchainBridgeTrace.withdrawalFlow.length > 0 &&
        nockchainBridgeTrace.releaseDrift.releaseCommitSha.length > 0,
      nockchainReleaseAssetsAvailable:
        nockchainReleaseAssets.release.assetCount === nockchainReleaseAssets.assets.length &&
        nockchainReleaseAssets.release.manifestPresent &&
        nockchainReleaseAssets.release.commitMatchesTag,
      nockchainReleaseManifestHashesAvailable:
        nockchainReleaseAssets.manifest.coverage.hashedAssetCount ===
          nockchainReleaseAssets.manifest.targets.length &&
        nockchainReleaseAssets.manifest.hashes.hashBlake3Count ===
          nockchainReleaseAssets.manifest.targets.length &&
        nockchainReleaseAssets.manifest.hashes.hashSha1Count ===
          nockchainReleaseAssets.manifest.targets.length,
      nockchainDocsAtlasAvailable: nockchainDocsAtlas.protocolSpecs.specs.length > 0,
      nockchainProtocolTraceAvailable:
        nockchainProtocolTrace.authoritySources.length > 0 &&
        nockchainProtocolTrace.releaseTrack.latestConsensusCritical.statusDrift === true,
      nockchainRustAtlasAvailable: nockchainRustAtlas.crates.length > 0,
      nockchainRustWorkspaceCovered:
        nockchainRustAtlas.workspace.coverage.trackedWorkspaceMemberCount ===
          nockchainRustAtlas.workspace.memberCount &&
        nockchainRustAtlas.workspace.coverage.missingWorkspaceMembers.length === 0,
      nockchainOperationsAtlasAvailable:
        nockchainOperationsAtlas.triageScenarios.length > 0 &&
        nockchainOperationsAtlas.scriptSources.length > 0,
      nockchainWalletAtlasAvailable:
        nockchainWalletAtlas.walletCommands.length > 0 &&
        nockchainWalletAtlas.endpointModes.length > 0,
      nockchainWatchInSync:
        nockchainWatch.status === "in-sync" &&
        nockchainWatch.drift.commitMatchesPinned &&
        nockchainWatch.drift.releaseMatchesPinned,
      nockchainSyncGossipTraceAvailable:
        nockchainSyncGossipTrace.sourceAnchors.length > 0 &&
        nockchainSyncGossipTrace.triageScenarios.length > 0 &&
        Boolean(nockchainSyncGossipTrace.localVerification.status),
      noRawStateJamArtifactsStored:
        stateJamRegistry.policy.rawArtifactStorage === "forbidden" &&
        stateJamRegistry.sources.every((source) => source.artifactPolicy === "metadata-only"),
      zorpUpstreamAvailable: zorpUpstream.repositories.length > 0,
      publicBadgesAvailable: badgeEmbeds.length > 0
    },
    chain: {
      entryCount: trustUpdateChainSummary.entryCount,
      latestRoot: trustUpdateChainSummary.latestRoot,
      signedEntries: trustUpdateChainSummary.signedEntryCount,
      validSignatures: trustUpdateChainSummary.validSignatureCount,
      algorithm: trustUpdateChainSummary.algorithm,
      source: trustUpdateChainSummary.source
    },
    reports: {
      status: generatedReports.status,
      generatedAt: generatedReports.generatedAt,
      reportCount: generatedReports.totals.reportCount,
      passCount: generatedReports.totals.passCount,
      warnCount: generatedReports.totals.warnCount,
      failCount: generatedReports.totals.failCount
    },
    fakenetEvidence: {
      status: localFakenetEvidence.status,
      generatedAt: localFakenetEvidence.generatedAt,
      reportCount: localFakenetEvidence.summary.reportCount,
      activeDiagnostics: localFakenetEvidence.summary.activeDiagnostics,
      verifierReady: localFakenetEvidence.verifier.ready,
      endpoint: localFakenetEvidence.summary.endpoint,
      walletAddress: localFakenetEvidence.summary.walletAddress
    },
    stateJams: {
      sourceCount: stateJamRegistry.sources.length,
      policy: stateJamRegistry.policy.mode,
      rawArtifactStorage: stateJamRegistry.policy.rawArtifactStorage,
      requiredMetadata: stateJamRegistry.requiredMetadata,
      sources: stateJamRegistry.sources.map((source) => ({
        id: source.id,
        kind: source.kind,
        custodian: source.custodian,
        status: source.status,
        artifactPolicy: source.artifactPolicy
      }))
    },
    zorpUpstream: {
      repositoryCount: zorpUpstream.repositories.length,
      activeHighSignalRepos: zorpUpstream.repositories
        .filter((repo) => !repo.archived && ["jock-lang", "sppark"].includes(repo.name))
        .map((repo) => repo.fullName),
      stateJamDrive: {
        sourceType: zorpUpstream.stateJamDrive.sourceType,
        artifactPolicy: zorpUpstream.stateJamDrive.artifactPolicy
      },
      sourceAuthorityRoles: [
        zorpUpstream.sourceAuthority.protocol.sourceRole,
        zorpUpstream.sourceAuthority.zorpOrg.sourceRole,
        zorpUpstream.sourceAuthority.stateJams.sourceRole
      ],
      monitor: {
        active: zorpUpstream.monitor.active,
        interval: zorpUpstream.monitor.interval
      }
    },
    nockchainDocsAtlas: {
      tier0Count: nockchainDocsAtlas.tier0.length,
      tier1Count: nockchainDocsAtlas.tier1.length,
      protocolSpecCount: nockchainDocsAtlas.protocolSpecs.specs.length,
      consistencyAlerts: nockchainDocsAtlas.consistencyChecks.alerts.map((alert) => alert.id)
    },
    nockchainProtocolTrace: {
      sourceCount: nockchainProtocolTrace.authoritySources.length,
      sourceIds: nockchainProtocolTrace.authoritySources.map((source) => source.id),
      nextScheduled: nockchainProtocolTrace.releaseTrack.nextScheduled.codename,
      latestConsensusCritical: nockchainProtocolTrace.releaseTrack.latestConsensusCritical.codename,
      statusDrift:
        nockchainProtocolTrace.releaseTrack.latestConsensusCritical.statusDrift,
      receiptFields: nockchainProtocolTrace.receiptFields
    },
    nockchainRustAtlas: {
      crateCount: nockchainRustAtlas.crates.length,
      groupCount: nockchainRustAtlas.groups.length,
      validationGates: nockchainRustAtlas.workspace.validationGates,
      watchThemes: nockchainRustAtlas.watchThemes,
      workspaceMemberCount: nockchainRustAtlas.workspace.memberCount,
      trackedWorkspaceMemberCount:
        nockchainRustAtlas.workspace.coverage.trackedWorkspaceMemberCount,
      missingWorkspaceMembers: nockchainRustAtlas.workspace.coverage.missingWorkspaceMembers,
      nonWorkspaceTrackedCrates: nockchainRustAtlas.workspace.coverage.nonWorkspaceTrackedCrates
    },
    nockchainOperationsAtlas: {
      scenarioCount: nockchainOperationsAtlas.triageScenarios.length,
      scriptSourceCount: nockchainOperationsAtlas.scriptSources.length,
      scenarioIds: nockchainOperationsAtlas.triageScenarios.map((scenario) => scenario.id),
      scriptSourceIds: nockchainOperationsAtlas.scriptSources.map((script) => script.id)
    },
    nockchainWalletAtlas: {
      commandCount: nockchainWalletAtlas.walletCommands.length,
      endpointModeCount: nockchainWalletAtlas.endpointModes.length,
      scenarioCount: nockchainWalletAtlas.triageScenarios.length,
      commandIds: nockchainWalletAtlas.walletCommands.map((command) => command.id),
      endpointModeIds: nockchainWalletAtlas.endpointModes.map((mode) => mode.id),
      localWalletAddress: nockchainWalletAtlas.localFakenetProfile.walletAddress
    },
    nockchainWatch: {
      status: nockchainWatch.status,
      observedAt: nockchainWatch.observedAt,
      watchItemCount: nockchainWatch.watchQueue.length,
      highSeverityItemIds: nockchainWatch.watchQueue
        .filter((item) => item.severity === "high")
        .map((item) => item.id),
      sourceIds: nockchainWatch.sources.map((source) => source.id),
      commitMatchesPinned: nockchainWatch.drift.commitMatchesPinned,
      releaseMatchesPinned: nockchainWatch.drift.releaseMatchesPinned,
      latestCommitReleased: nockchainWatch.drift.latestCommitReleased,
      defaultBranchAheadOfRelease: nockchainWatch.drift.defaultBranchAheadOfRelease
    },
    nockchainBridgeTrace: {
      sourceCount: nockchainBridgeTrace.sourceAnchors.length,
      sourceIds: nockchainBridgeTrace.sourceAnchors.map((source) => source.id),
      flowStepIds: nockchainBridgeTrace.withdrawalFlow.map((step) => step.id),
      latestCommitReleased: nockchainBridgeTrace.releaseDrift.latestCommitReleased,
      defaultBranchAheadOfRelease: nockchainBridgeTrace.releaseDrift.defaultBranchAheadOfRelease,
      receiptFields: nockchainBridgeTrace.receiptFields
    },
    nockchainReleaseAssets: {
      assetCount: nockchainReleaseAssets.assets.length,
      groupCount: nockchainReleaseAssets.assetGroups.length,
      platformTriples: nockchainReleaseAssets.release.platformTriples,
      manifestPresent: nockchainReleaseAssets.release.manifestPresent,
      manifestTargetCount: nockchainReleaseAssets.manifest.targets.length,
      hashCoverage: nockchainReleaseAssets.manifest.coverage,
      receiptFields: nockchainReleaseAssets.provenance.requiredReceiptFields
    },
    nockchainSyncGossipTrace: {
      anchorCount: nockchainSyncGossipTrace.sourceAnchors.length,
      invariantCount: nockchainSyncGossipTrace.behaviorInvariants.length,
      scenarioCount: nockchainSyncGossipTrace.triageScenarios.length,
      receiptFields: nockchainSyncGossipTrace.receiptFields,
      sourceAnchorIds: nockchainSyncGossipTrace.sourceAnchors.map((anchor) => anchor.id),
      localVerificationStatus: nockchainSyncGossipTrace.localVerification.status
    },
    badges: {
      verified: resolvedBadges.filter((badge) => badge.currentStatus === "verified").length,
      revoked: resolvedBadges.filter((badge) => badge.currentStatus === "revoked").length,
      embeddable: badgeEmbeds.length
    },
    links: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      trustFeed: `${registryCanonicalBaseUrl}/api/trust/feed`,
      trustUpdates: `${registryCanonicalBaseUrl}/api/trust/updates`,
      generatedReports: `${registryCanonicalBaseUrl}/api/reports/generated`,
      zorpUpstream: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      nockchainBridgeTrace: `${registryCanonicalBaseUrl}/api/nockchain/bridge`,
      nockchainReleaseAssets: `${registryCanonicalBaseUrl}/api/nockchain/release-assets`,
      nockchainDocsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
      nockchainProtocolTrace: `${registryCanonicalBaseUrl}/api/nockchain/protocol`,
      nockchainRustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      nockchainOperationsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      nockchainWalletAtlas: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      nockchainWatch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      nockchainSyncGossipTrace: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      fakenetEvidence: `${registryCanonicalBaseUrl}/api/fakenet/evidence`,
      fakenetEvidenceVerifier: `${registryCanonicalBaseUrl}/api/fakenet/evidence/verify`
    }
  };

  return {
    ...checkpoint,
    roots: {
      ...checkpoint.roots,
      checkpoint: createSha256Root(checkpoint)
    }
  };
}

function createSha256Root(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB)
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
