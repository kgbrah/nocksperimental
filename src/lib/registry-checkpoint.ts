import { createHash } from "node:crypto";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import { createNockchainBridgeTrace } from "@/lib/nockchain-bridge-trace";
import { createNockchainBridgeSourceTrace } from "@/lib/nockchain-bridge-source-trace";
import { createNockchainCargoSurface } from "@/lib/nockchain-cargo-surface";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { createNockchainHoonKernelAtlas } from "@/lib/nockchain-hoon-kernels";
import { createNockchainKnowledgeSpine } from "@/lib/nockchain-knowledge-spine";
import { createNockchainNockAppAtlas } from "@/lib/nockchain-nockapp-atlas";
import { createNockchainNockAppSourceTrace } from "@/lib/nockchain-nockapp-source-trace";
import { createNockchainNockupSourceTrace } from "@/lib/nockchain-nockup-source-trace";
import { createNockchainOperationsAtlas } from "@/lib/nockchain-operations-atlas";
import { createNockchainImpactQueue } from "@/lib/nockchain-impact-queue";
import { createNockchainPmaSourceTrace } from "@/lib/nockchain-pma-source-trace";
import { createNockchainPrRadar } from "@/lib/nockchain-pr-radar";
import { createNockchainProtocolTrace } from "@/lib/nockchain-protocol-trace";
import { createNockchainReleaseAssets } from "@/lib/nockchain-release-assets";
import { createNockchainRuntimeSafetyTrace } from "@/lib/nockchain-runtime-safety";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";
import { createNockchainRustSourceGuide } from "@/lib/nockchain-rust-source-guide";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createNockchainSyncGossipTrace } from "@/lib/nockchain-sync-gossip-trace";
import { createNockchainTestkitE2eTrace } from "@/lib/nockchain-testkit-e2e-trace";
import { createNockchainApiSourceTrace } from "@/lib/nockchain-api-source-trace";
import { createNockchainMiningSourceTrace } from "@/lib/nockchain-mining-source-trace";
import { createNockchainWalletAtlas } from "@/lib/nockchain-wallet-atlas";
import { createNockchainWatchBoard } from "@/lib/nockchain-watch";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";
import { createZorpMonitorRunbook } from "@/lib/zorp-monitor-runbook";
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
  const nockchainBridgeSourceTrace = createNockchainBridgeSourceTrace();
  const nockchainCargoSurface = createNockchainCargoSurface();
  const nockchainHoonKernels = createNockchainHoonKernelAtlas();
  const nockchainReleaseAssets = createNockchainReleaseAssets();
  const nockchainDocsAtlas = createNockchainDocsAtlas();
  const nockchainKnowledgeSpine = createNockchainKnowledgeSpine();
  const nockchainProtocolTrace = createNockchainProtocolTrace();
  const nockchainRustAtlas = createNockchainRustAtlas();
  const nockchainRustSourceGuide = createNockchainRustSourceGuide();
  const nockchainNockAppAtlas = createNockchainNockAppAtlas();
  const nockchainNockAppSourceTrace = createNockchainNockAppSourceTrace();
  const nockchainNockupSourceTrace = createNockchainNockupSourceTrace();
  const nockchainOperationsAtlas = createNockchainOperationsAtlas();
  const nockchainWalletAtlas = createNockchainWalletAtlas();
  const nockchainApiSourceTrace = createNockchainApiSourceTrace();
  const nockchainWatch = createNockchainWatchBoard();
  const nockchainPrRadar = createNockchainPrRadar();
  const nockchainImpactQueue = createNockchainImpactQueue();
  const nockchainPmaSourceTrace = createNockchainPmaSourceTrace();
  const nockchainRuntimeSafety = createNockchainRuntimeSafetyTrace();
  const nockchainSyncGossipTrace = createNockchainSyncGossipTrace();
  const nockchainMiningSourceTrace = createNockchainMiningSourceTrace();
  const nockchainTestkitE2e = createNockchainTestkitE2eTrace();
  const stateJamRegistry = createNockchainStateJamRegistry();
  const zorpUpstream = createZorpUpstreamMap();
  const zorpMonitorRunbook = createZorpMonitorRunbook();
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
    zorpWatchMatrixEntries: zorpUpstream.repositoryWatchMatrix.length,
    zorpMonitorReviewClasses: zorpUpstream.monitorReviewContract.classes.length,
    zorpCollaborationPhases: zorpUpstream.collaborationFlywheel.phases.length,
    zorpSourceRoutes: zorpUpstream.collaborationFlywheel.sourceRoutes.length,
    zorpMonitorRunbookClasses: zorpMonitorRunbook.monitorClasses.length,
    zorpMonitorRunbookRouteMatrixEntries: zorpMonitorRunbook.routeMatrix.length,
    nockchainBridgeSources: nockchainBridgeTrace.sourceAnchors.length,
    nockchainBridgeSequencerLifecycleStates:
      nockchainBridgeTrace.sequencerOperationalContract.lifecycleStates.length,
    nockchainBridgeSourceAnchors: nockchainBridgeSourceTrace.sourceAnchors.length,
    nockchainBridgeExecutionFlowSteps: nockchainBridgeSourceTrace.executionFlow.length,
    nockchainCargoSurfaceCrates: nockchainCargoSurface.crates.length,
    nockchainCargoSurfaceTargets: nockchainCargoSurface.targetSummary.targetCount,
    nockchainHoonKernels: nockchainHoonKernels.kernels.length,
    nockchainHoonJamAssets: nockchainHoonKernels.buildPipeline.assetTargets.length,
    nockchainReleaseAssets: nockchainReleaseAssets.assets.length,
    nockchainReleaseManifestTargets: nockchainReleaseAssets.manifest.targets.length,
    nockchainProtocolSpecs: nockchainDocsAtlas.protocolSpecs.specs.length,
    nockchainKnowledgeDocuments: nockchainKnowledgeSpine.documentFingerprints.length,
    nockchainKnowledgeCoverageDomains: nockchainKnowledgeSpine.coverageMatrix.length,
    nockchainProtocolSources: nockchainProtocolTrace.authoritySources.length,
    nockchainRustCrates: nockchainRustAtlas.crates.length,
    nockchainRustWorkspaceMembers: nockchainRustAtlas.workspace.memberCount,
    nockchainRustSourceDomains: nockchainRustSourceGuide.sourceDomains.length,
    nockchainRustSourceAnchors: nockchainRustSourceGuide.sourceAnchors.length,
    nockchainNockAppRuntimeBoundaries: nockchainNockAppAtlas.runtimeBoundaries.length,
    nockchainNockAppProbeTemplates: nockchainNockAppAtlas.probeTemplates.length,
    nockchainNockAppSourceAnchors: nockchainNockAppSourceTrace.sourceAnchors.length,
    nockchainNockAppRuntimeFlowSteps: nockchainNockAppSourceTrace.runtimeFlow.length,
    nockchainNockupSourceAnchors: nockchainNockupSourceTrace.sourceAnchors.length,
    nockchainNockupSourceCapabilities: nockchainNockupSourceTrace.nockupCapabilities.length,
    nockchainOperationsScenarios: nockchainOperationsAtlas.triageScenarios.length,
    nockchainWalletCommands: nockchainWalletAtlas.walletCommands.length,
    nockchainPublicApiEvidenceSurfaces:
      nockchainWalletAtlas.publicApiEvidenceContract.surfaces.length,
    nockchainApiSourceAnchors: nockchainApiSourceTrace.sourceAnchors.length,
    nockchainApiSourceCapabilities: nockchainApiSourceTrace.apiCapabilities.length,
    nockchainWatchItems: nockchainWatch.watchQueue.length,
    nockchainWatchChangeClasses: nockchainWatch.changeClassificationContract.classes.length,
    nockchainOpenPullRequests: nockchainPrRadar.pullRequests.length,
    nockchainOpenIssues: nockchainPrRadar.openIssues.length,
    nockchainPrRiskClasses: nockchainPrRadar.riskClasses.length,
    nockchainImpactItems: nockchainImpactQueue.impactItems.length,
    nockchainImpactActionLanes: nockchainImpactQueue.actionLanes.length,
    nockchainPmaSourceAnchors: nockchainPmaSourceTrace.sourceAnchors.length,
    nockchainPmaDurabilitySteps: nockchainPmaSourceTrace.durabilityFlow.length,
    nockchainRuntimeSafetyAnchors: nockchainRuntimeSafety.sourceAnchors.length,
    nockchainRuntimeSafetyClasses: nockchainRuntimeSafety.runtimeSafetyClasses.length,
    nockchainSyncGossipAnchors: nockchainSyncGossipTrace.sourceAnchors.length,
    nockchainMiningSourceAnchors: nockchainMiningSourceTrace.sourceAnchors.length,
    nockchainMiningSourceCapabilities: nockchainMiningSourceTrace.miningCapabilities.length,
    nockchainTestkitE2eAnchors: nockchainTestkitE2e.sourceAnchors.length,
    nockchainTestkitE2eCapabilities: nockchainTestkitE2e.scenarioCapabilities.length,
    stateJamSources: stateJamRegistry.sources.length,
    pmaSafetySourceDocs: stateJamRegistry.pmaSafety.sourceDocs.length
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
      receiptFields: nockchainBridgeTrace.receiptFields,
      sequencerOperationalContract: nockchainBridgeTrace.sequencerOperationalContract
    }),
    nockchainBridgeSourceTrace: createSha256Root({
      generatedAt: nockchainBridgeSourceTrace.generatedAt,
      upstream: nockchainBridgeSourceTrace.upstream,
      sourceAnchors: nockchainBridgeSourceTrace.sourceAnchors,
      executionFlow: nockchainBridgeSourceTrace.executionFlow,
      sourceTraceContract: nockchainBridgeSourceTrace.sourceTraceContract,
      receiptFieldMapping: nockchainBridgeSourceTrace.receiptFieldMapping,
      upstreamSignals: nockchainBridgeSourceTrace.upstreamSignals,
      operatorInvariants: nockchainBridgeSourceTrace.operatorInvariants
    }),
    nockchainCargoSurface: createSha256Root({
      generatedAt: nockchainCargoSurface.generatedAt,
      upstream: nockchainCargoSurface.upstream,
      workspace: nockchainCargoSurface.workspace,
      workspaceDependencyHighlights: nockchainCargoSurface.workspaceDependencyHighlights,
      crates: nockchainCargoSurface.crates,
      targetSummary: nockchainCargoSurface.targetSummary,
      verificationMatrix: nockchainCargoSurface.verificationMatrix,
      evidenceContract: nockchainCargoSurface.evidenceContract
    }),
    nockchainHoonKernels: createSha256Root({
      generatedAt: nockchainHoonKernels.generatedAt,
      upstream: nockchainHoonKernels.upstream,
      buildPipeline: nockchainHoonKernels.buildPipeline,
      kernels: nockchainHoonKernels.kernels,
      rustEmbedding: nockchainHoonKernels.rustEmbedding,
      verificationMatrix: nockchainHoonKernels.verificationMatrix,
      evidenceContract: nockchainHoonKernels.evidenceContract
    }),
    nockchainReleaseAssets: createSha256Root({
      generatedAt: nockchainReleaseAssets.generatedAt,
      upstream: nockchainReleaseAssets.upstream,
      release: nockchainReleaseAssets.release,
      manifest: nockchainReleaseAssets.manifest,
      assets: nockchainReleaseAssets.assets,
      assetGroups: nockchainReleaseAssets.assetGroups,
      driftCheck: nockchainReleaseAssets.driftCheck,
      provenance: nockchainReleaseAssets.provenance
    }),
    zorpUpstream: createSha256Root({
      scannedAt: zorpUpstream.scannedAt,
      organization: zorpUpstream.organization,
      nockchain: zorpUpstream.nockchain,
      sourceAuthority: zorpUpstream.sourceAuthority,
      stateJamDrive: zorpUpstream.stateJamDrive,
      repositories: zorpUpstream.repositories,
      driftCheck: zorpUpstream.driftCheck,
      layers: zorpUpstream.layers,
      repositoryWatchMatrix: zorpUpstream.repositoryWatchMatrix,
      monitorReviewContract: zorpUpstream.monitorReviewContract,
      collaborationFlywheel: zorpUpstream.collaborationFlywheel,
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
    nockchainKnowledgeSpine: createSha256Root({
      generatedAt: nockchainKnowledgeSpine.generatedAt,
      upstream: nockchainKnowledgeSpine.upstream,
      authorityReadOrder: nockchainKnowledgeSpine.authorityReadOrder,
      documentFingerprints: nockchainKnowledgeSpine.documentFingerprints,
      driftCheck: nockchainKnowledgeSpine.driftCheck,
      workspaceManifest: nockchainKnowledgeSpine.workspaceManifest,
      coverageMatrix: nockchainKnowledgeSpine.coverageMatrix,
      monitoringContract: nockchainKnowledgeSpine.monitoringContract
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
      pmaSafety: stateJamRegistry.pmaSafety,
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
    nockchainRustSourceGuide: createSha256Root({
      generatedAt: nockchainRustSourceGuide.generatedAt,
      upstream: nockchainRustSourceGuide.upstream,
      sourceDomains: nockchainRustSourceGuide.sourceDomains,
      sourceAnchors: nockchainRustSourceGuide.sourceAnchors,
      sourceTraceContract: nockchainRustSourceGuide.sourceTraceContract,
      learningPath: nockchainRustSourceGuide.learningPath
    }),
    nockchainNockAppAtlas: createSha256Root({
      scannedAt: nockchainNockAppAtlas.scannedAt,
      upstream: nockchainNockAppAtlas.upstream,
      sourceAuthority: nockchainNockAppAtlas.sourceAuthority,
      runtimeBoundaries: nockchainNockAppAtlas.runtimeBoundaries,
      probeTemplates: nockchainNockAppAtlas.probeTemplates,
      receiptContract: nockchainNockAppAtlas.receiptContract,
      safety: nockchainNockAppAtlas.safety
    }),
    nockchainNockAppSourceTrace: createSha256Root({
      generatedAt: nockchainNockAppSourceTrace.generatedAt,
      upstream: nockchainNockAppSourceTrace.upstream,
      sourceAnchors: nockchainNockAppSourceTrace.sourceAnchors,
      runtimeFlow: nockchainNockAppSourceTrace.runtimeFlow,
      sourceTraceContract: nockchainNockAppSourceTrace.sourceTraceContract,
      receiptFieldMapping: nockchainNockAppSourceTrace.receiptFieldMapping,
      pendingWatchItems: nockchainNockAppSourceTrace.pendingWatchItems,
      zorpMonitorContext: nockchainNockAppSourceTrace.zorpMonitorContext,
      stateArtifactPolicy: nockchainNockAppSourceTrace.stateArtifactPolicy
    }),
    nockchainNockupSourceTrace: createSha256Root({
      generatedAt: nockchainNockupSourceTrace.generatedAt,
      upstream: nockchainNockupSourceTrace.upstream,
      sourceAnchors: nockchainNockupSourceTrace.sourceAnchors,
      nockupCapabilities: nockchainNockupSourceTrace.nockupCapabilities,
      receiptContract: nockchainNockupSourceTrace.receiptContract,
      upstreamWatch: nockchainNockupSourceTrace.upstreamWatch,
      localVerification: nockchainNockupSourceTrace.localVerification
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
      publicApiEvidenceContract: nockchainWalletAtlas.publicApiEvidenceContract,
      localFakenetProfile: nockchainWalletAtlas.localFakenetProfile,
      balanceEvidenceContract: nockchainWalletAtlas.balanceEvidenceContract,
      safety: nockchainWalletAtlas.safety,
      triageScenarios: nockchainWalletAtlas.triageScenarios
    }),
    nockchainApiSourceTrace: createSha256Root({
      generatedAt: nockchainApiSourceTrace.generatedAt,
      upstream: nockchainApiSourceTrace.upstream,
      sourceAnchors: nockchainApiSourceTrace.sourceAnchors,
      apiCapabilities: nockchainApiSourceTrace.apiCapabilities,
      endpointModes: nockchainApiSourceTrace.endpointModes,
      receiptContract: nockchainApiSourceTrace.receiptContract,
      localVerification: nockchainApiSourceTrace.localVerification
    }),
      nockchainWatch: createSha256Root({
      observedAt: nockchainWatch.observedAt,
      status: nockchainWatch.status,
      sources: nockchainWatch.sources,
      pinned: nockchainWatch.pinned,
      observed: nockchainWatch.observed,
      drift: nockchainWatch.drift,
      changeClassificationContract: nockchainWatch.changeClassificationContract,
      watchQueue: nockchainWatch.watchQueue,
      aggregateDriftCheck: nockchainWatch.monitor.aggregateDriftCheck,
      monitor: nockchainWatch.monitor
    }),
    nockchainPrRadar: createSha256Root({
      observedAt: nockchainPrRadar.observedAt,
      upstream: nockchainPrRadar.upstream,
      snapshot: nockchainPrRadar.snapshot,
      pullRequests: nockchainPrRadar.pullRequests,
      openIssues: nockchainPrRadar.openIssues,
      riskClasses: nockchainPrRadar.riskClasses,
      reviewContract: nockchainPrRadar.reviewContract,
      driftCheck: nockchainPrRadar.driftCheck,
      operatorQueue: nockchainPrRadar.operatorQueue
    }),
    nockchainImpactQueue: createSha256Root({
      generatedAt: nockchainImpactQueue.generatedAt,
      upstream: nockchainImpactQueue.upstream,
      snapshot: nockchainImpactQueue.snapshot,
      impactItems: nockchainImpactQueue.impactItems,
      actionLanes: nockchainImpactQueue.actionLanes,
      queueContract: nockchainImpactQueue.queueContract
    }),
    nockchainPmaSourceTrace: createSha256Root({
      generatedAt: nockchainPmaSourceTrace.generatedAt,
      upstream: nockchainPmaSourceTrace.upstream,
      sourceAnchors: nockchainPmaSourceTrace.sourceAnchors,
      durabilityFlow: nockchainPmaSourceTrace.durabilityFlow,
      snapshotVerification: nockchainPmaSourceTrace.snapshotVerification,
      eventLogContract: nockchainPmaSourceTrace.eventLogContract,
      receiptContract: nockchainPmaSourceTrace.receiptContract,
      operatorGuards: nockchainPmaSourceTrace.operatorGuards
    }),
    nockchainRuntimeSafety: createSha256Root({
      generatedAt: nockchainRuntimeSafety.generatedAt,
      upstream: nockchainRuntimeSafety.upstream,
      sourceAnchors: nockchainRuntimeSafety.sourceAnchors,
      runtimeSafetyClasses: nockchainRuntimeSafety.runtimeSafetyClasses,
      receiptContract: nockchainRuntimeSafety.receiptContract,
      operatorTriage: nockchainRuntimeSafety.operatorTriage,
      localVerification: nockchainRuntimeSafety.localVerification
    }),
    nockchainTestkitE2e: createSha256Root({
      generatedAt: nockchainTestkitE2e.generatedAt,
      upstream: nockchainTestkitE2e.upstream,
      sourceAnchors: nockchainTestkitE2e.sourceAnchors,
      scenarioCapabilities: nockchainTestkitE2e.scenarioCapabilities,
      receiptContract: nockchainTestkitE2e.receiptContract,
      localVerification: nockchainTestkitE2e.localVerification
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
    nockchainMiningSourceTrace: createSha256Root({
      generatedAt: nockchainMiningSourceTrace.generatedAt,
      upstream: nockchainMiningSourceTrace.upstream,
      sourceAnchors: nockchainMiningSourceTrace.sourceAnchors,
      miningCapabilities: nockchainMiningSourceTrace.miningCapabilities,
      operationalModes: nockchainMiningSourceTrace.operationalModes,
      diagnosticScenarios: nockchainMiningSourceTrace.diagnosticScenarios,
      receiptContract: nockchainMiningSourceTrace.receiptContract,
      localVerification: nockchainMiningSourceTrace.localVerification
    }),
    zorpMonitorRunbook: createSha256Root({
      generatedAt: zorpMonitorRunbook.generatedAt,
      automation: zorpMonitorRunbook.automation,
      currentSnapshot: zorpMonitorRunbook.currentSnapshot,
      watchedSources: zorpMonitorRunbook.watchedSources,
      findingSchema: zorpMonitorRunbook.findingSchema,
      classificationFlow: zorpMonitorRunbook.classificationFlow,
      monitorClasses: zorpMonitorRunbook.monitorClasses,
      routeMatrix: zorpMonitorRunbook.routeMatrix,
      monitorRunTemplates: zorpMonitorRunbook.monitorRunTemplates,
      localVerification: zorpMonitorRunbook.localVerification
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
      nockchainBridgeSequencerContractAvailable:
        nockchainBridgeTrace.sequencerOperationalContract.serviceName ===
          "nockchain-bridge-sequencer" &&
        nockchainBridgeTrace.sequencerOperationalContract.lifecycleStates.some(
          (state) => state.id === "mempoolAccepted"
        ) &&
        nockchainBridgeTrace.sequencerOperationalContract.receiptFields.includes(
          "sequencerJournalId"
        ) &&
        nockchainBridgeTrace.sequencerOperationalContract.journal.envVars.includes(
          "WITHDRAWAL_SEQUENCER_JOURNAL_SIGNING_KEY"
        ),
      nockchainBridgeSourceTraceAvailable:
        nockchainBridgeSourceTrace.sourceAnchors.length === 12 &&
        nockchainBridgeSourceTrace.executionFlow.length === 8 &&
        nockchainBridgeSourceTrace.sourceTraceContract.requiredFields.includes(
          "confirmationEvidence"
        ) &&
        nockchainBridgeSourceTrace.sourceTraceContract.forbiddenFields.includes(
          "sequencerJournalSigningKey"
        ),
      nockchainCargoSurfaceAvailable:
        nockchainCargoSurface.crates.length === 9 &&
        nockchainCargoSurface.targetSummary.targetCount > 10 &&
        nockchainCargoSurface.targetSummary.binaryCrates.includes("nockchain-wallet") &&
        nockchainCargoSurface.crates.some(
          (crateDetail) =>
            crateDetail.name === "nockchain-libp2p-io" &&
            crateDetail.sourceFocus.includes("crates/nockchain-libp2p-io/src/catch_up.rs")
        ) &&
        nockchainCargoSurface.evidenceContract.forbiddenFields.includes("walletSeedPhrase"),
      nockchainHoonKernelsAvailable:
        nockchainHoonKernels.kernels.length === 5 &&
        nockchainHoonKernels.buildPipeline.assetTargets.length === 5 &&
        nockchainHoonKernels.kernels.some(
          (kernel) =>
            kernel.id === "bridge" &&
            kernel.jamAsset === "assets/bridge.jam" &&
            kernel.causeTags.includes("%create-withdrawal-tx")
        ) &&
        nockchainHoonKernels.kernels.some(
          (kernel) =>
            kernel.id === "nockchain-peek" &&
            kernel.kernelCrate === "crates/kernels/nockchain-peek"
        ) &&
        nockchainHoonKernels.evidenceContract.forbiddenFields.includes("rawJamBytes"),
      nockchainReleaseAssetsAvailable:
        nockchainReleaseAssets.release.assetCount === nockchainReleaseAssets.assets.length &&
        nockchainReleaseAssets.release.manifestPresent &&
        nockchainReleaseAssets.release.commitMatchesTag &&
        nockchainReleaseAssets.driftCheck.command ===
          "npm run check:nockchain-release-assets-drift -- --json",
      nockchainReleaseManifestHashesAvailable:
        nockchainReleaseAssets.manifest.coverage.hashedAssetCount ===
          nockchainReleaseAssets.manifest.targets.length &&
        nockchainReleaseAssets.manifest.hashes.hashBlake3Count ===
          nockchainReleaseAssets.manifest.targets.length &&
        nockchainReleaseAssets.manifest.hashes.hashSha1Count ===
          nockchainReleaseAssets.manifest.targets.length,
      nockchainDocsAtlasAvailable: nockchainDocsAtlas.protocolSpecs.specs.length > 0,
      nockchainKnowledgeSpineAvailable:
        nockchainKnowledgeSpine.documentFingerprints.length === 8 &&
        nockchainKnowledgeSpine.workspaceManifest.memberCount === 36 &&
        nockchainKnowledgeSpine.coverageMatrix.length === 8 &&
        nockchainKnowledgeSpine.coverageMatrix.every((entry) => entry.status === "covered") &&
        nockchainKnowledgeSpine.monitoringContract.requiredEvidence.includes(
          "documentFingerprints"
        ) &&
        nockchainKnowledgeSpine.monitoringContract.requiredEvidence.includes(
          "workspaceMemberHash"
        ) &&
        nockchainKnowledgeSpine.driftCheck.command ===
          "npm run check:nockchain-docs-drift -- --json" &&
        nockchainKnowledgeSpine.driftCheck.compareFields.includes("sha256") &&
        nockchainKnowledgeSpine.monitoringContract.forbiddenFields.includes(
          "walletSeedPhrase"
        ),
      nockchainProtocolTraceAvailable:
        nockchainProtocolTrace.authoritySources.length > 0 &&
        nockchainProtocolTrace.releaseTrack.latestConsensusCritical.statusDrift === true,
      nockchainRustAtlasAvailable: nockchainRustAtlas.crates.length > 0,
      nockchainRustWorkspaceCovered:
        nockchainRustAtlas.workspace.coverage.trackedWorkspaceMemberCount ===
          nockchainRustAtlas.workspace.memberCount &&
        nockchainRustAtlas.workspace.coverage.missingWorkspaceMembers.length === 0,
      nockchainRustWorkspaceDriftCheckAvailable:
        nockchainRustAtlas.workspace.manifest.path === "Cargo.toml" &&
        nockchainRustAtlas.workspace.manifest.sha256 ===
          "a31885eb2d77adfb4d8583a52a62b8f05289087af1c4b10af616b6376b0773f0" &&
        nockchainRustAtlas.workspace.workspaceMemberHash.startsWith("sha256:") &&
        nockchainRustAtlas.workspace.driftCheck.command ===
          "npm run check:nockchain-cargo-workspace-drift -- --json",
      nockchainCargoManifestDriftCheckAvailable:
        nockchainCargoSurface.workspace.manifestSnapshots.length ===
          nockchainCargoSurface.workspace.memberCount &&
        nockchainCargoSurface.workspace.manifestCatalogHash.startsWith("sha256:") &&
        nockchainCargoSurface.workspace.manifestDriftCheck.command ===
          "npm run check:nockchain-cargo-manifests-drift -- --json" &&
        nockchainCargoSurface.workspace.manifestDriftCheck.compareFields.includes(
          "manifestCatalogHash"
        ),
      nockchainRustSourceGuideAvailable:
        nockchainRustSourceGuide.sourceDomains.length >= 10 &&
        nockchainRustSourceGuide.sourceAnchors.length >= 15 &&
        nockchainRustSourceGuide.sourceTraceContract.requiredFields.includes("sourceAnchorId") &&
        nockchainRustSourceGuide.sourceTraceContract.forbiddenFields.includes("rawPmaSlab") &&
        nockchainRustSourceGuide.sourceTraceContract.forbiddenFields.includes(
          "walletSeedPhrase"
        ),
      nockchainNockAppAtlasAvailable:
        nockchainNockAppAtlas.runtimeBoundaries.length >= 5 &&
        nockchainNockAppAtlas.probeTemplates.length >= 4 &&
        nockchainNockAppAtlas.receiptContract.requiredFields.includes("stateJamFingerprint") &&
        nockchainNockAppAtlas.receiptContract.forbiddenFields.includes("rawPmaSlab"),
      nockchainNockAppSourceTraceAvailable:
        nockchainNockAppSourceTrace.sourceAnchors.length === 12 &&
        nockchainNockAppSourceTrace.runtimeFlow.length === 6 &&
        nockchainNockAppSourceTrace.sourceTraceContract.requiredFields.includes(
          "receiptFieldMapping"
        ) &&
        nockchainNockAppSourceTrace.sourceTraceContract.forbiddenFields.includes("rawEventLog"),
      nockchainNockupSourceTraceAvailable:
        nockchainNockupSourceTrace.sourceAnchors.length >= 10 &&
        nockchainNockupSourceTrace.nockupCapabilities.length >= 7 &&
        nockchainNockupSourceTrace.receiptContract.requiredFields.includes("templateCommit") &&
        nockchainNockupSourceTrace.receiptContract.forbiddenFields.includes("rawCompiledJam") &&
        nockchainNockupSourceTrace.localVerification.recommendedCommands.includes(
          "cargo check -p nockup"
        ),
      nockchainOperationsAtlasAvailable:
        nockchainOperationsAtlas.triageScenarios.length > 0 &&
        nockchainOperationsAtlas.scriptSources.length > 0,
      nockchainWalletAtlasAvailable:
        nockchainWalletAtlas.walletCommands.length > 0 &&
        nockchainWalletAtlas.endpointModes.length > 0,
      nockchainPublicApiEvidenceContractAvailable:
        nockchainWalletAtlas.publicApiEvidenceContract.surfaces.some(
          (surface) =>
            surface.id === "block-explorer-cache" &&
            surface.endpoints?.includes("GetBlocks") &&
            surface.limits?.some((limit) => limit.includes("newest up to 1024 blocks"))
        ) &&
        nockchainWalletAtlas.publicApiEvidenceContract.interpretationRules.includes(
          "Treat tx-accepted as node acceptance, not block inclusion."
        ),
      nockchainApiSourceTraceAvailable:
        nockchainApiSourceTrace.sourceAnchors.length >= 11 &&
        nockchainApiSourceTrace.apiCapabilities.length >= 7 &&
        nockchainApiSourceTrace.receiptContract.requiredFields.includes("apiEndpoint") &&
        nockchainApiSourceTrace.receiptContract.requiredFields.includes(
          "accessControlPosture"
        ) &&
        nockchainApiSourceTrace.receiptContract.forbiddenFields.includes("rawNounSlab") &&
        nockchainApiSourceTrace.localVerification.recommendedCommands.includes(
          "cargo check -p nockchain-api"
        ),
      nockchainWatchInSync:
        nockchainWatch.status === "in-sync" &&
        nockchainWatch.drift.commitMatchesPinned &&
        nockchainWatch.drift.releaseMatchesPinned,
      nockchainWatchChangeClassificationAvailable:
        nockchainWatch.changeClassificationContract.classes.length >= 8 &&
        nockchainWatch.changeClassificationContract.classes.some(
          (changeClass) =>
            changeClass.id === "protocol-consensus" &&
            changeClass.escalation === "immediate" &&
            changeClass.targetSurfaces.includes("nockchainProtocolTrace")
        ) &&
        nockchainWatch.changeClassificationContract.requiredEvidenceFields.includes(
          "recommendedNocksperimentalUpdates"
        ),
      nockchainWatchAggregateDriftCheckAvailable:
        nockchainWatch.monitor.aggregateDriftCheck.command ===
          "npm run check:nockchain-upstream-drift -- --json" &&
        nockchainWatch.monitor.aggregateDriftCheck.checks.length === 6 &&
        nockchainWatch.monitor.aggregateDriftCheck.checks.some(
          (check) => check.id === "cargo-workspace"
        ) &&
        nockchainWatch.monitor.aggregateDriftCheck.checks.some(
          (check) => check.id === "cargo-manifests"
        ),
      nockchainPrRadarAvailable:
        nockchainPrRadar.pullRequests.length === 35 &&
        nockchainPrRadar.openIssues.length === 1 &&
        nockchainPrRadar.riskClasses.length >= 6 &&
        nockchainPrRadar.pullRequests.some(
          (pullRequest) =>
            pullRequest.number === 116 &&
            pullRequest.riskClass === "wallet-transaction-metadata" &&
            (pullRequest.targetSurfaces as readonly string[]).includes("nockchainWalletAtlas")
        ) &&
        nockchainPrRadar.pullRequests.some(
          (pullRequest) =>
            pullRequest.number === 113 &&
            pullRequest.riskClass === "pma-runtime-persistence" &&
            (pullRequest.targetSurfaces as readonly string[]).includes("stateJamRegistry")
        ) &&
        nockchainPrRadar.pullRequests.some(
          (pullRequest) =>
            pullRequest.number === 94 &&
            pullRequest.riskClass === "jam-cue-hardening" &&
            (pullRequest.targetSurfaces as readonly string[]).includes("nockvmRuntimeSafety")
        ) &&
        nockchainPrRadar.pullRequests.some(
          (pullRequest) =>
            pullRequest.number === 93 &&
            pullRequest.riskClass === "p2p-jam-cue-hardening" &&
            (pullRequest.targetSurfaces as readonly string[]).includes("nockchainSyncGossipTrace")
        ) &&
        nockchainPrRadar.openIssues.some(
          (issue) =>
            issue.number === 121 &&
            issue.riskClass === "runtime-stack-frame-safety" &&
            (issue.targetSurfaces as readonly string[]).includes("nockvmRuntimeSafety")
        ) &&
        nockchainPrRadar.reviewContract.forbiddenFields.includes("walletSeedPhrase"),
      nockchainImpactQueueAvailable:
        nockchainImpactQueue.impactItems.length >= 8 &&
        nockchainImpactQueue.actionLanes.length >= 5 &&
        nockchainImpactQueue.impactItems.some(
          (item) =>
            item.id === "bridge-withdrawal-release" &&
            item.priority === "immediate" &&
            item.targetSurfaces.includes("bridgeReceipts")
        ) &&
        nockchainImpactQueue.impactItems.some(
          (item) =>
            item.id === "pma-state-jam-provenance" &&
            item.priority === "immediate" &&
            item.forbiddenFields.includes("rawPmaSlab")
        ) &&
        nockchainImpactQueue.impactItems.some(
          (item) =>
            item.id === "wallet-blob-memo" &&
            item.receiptFields.includes("transactionBlobHash")
        ) &&
        nockchainImpactQueue.queueContract.requiredFields.includes("verificationGates") &&
        nockchainImpactQueue.queueContract.forbiddenFields.includes("walletSeedPhrase"),
      nockchainSyncGossipTraceAvailable:
        nockchainSyncGossipTrace.sourceAnchors.length > 0 &&
        nockchainSyncGossipTrace.triageScenarios.length > 0 &&
        Boolean(nockchainSyncGossipTrace.localVerification.status),
      nockchainMiningSourceTraceAvailable:
        nockchainMiningSourceTrace.sourceAnchors.length >= 13 &&
        nockchainMiningSourceTrace.miningCapabilities.length >= 9 &&
        nockchainMiningSourceTrace.receiptContract.requiredFields.includes("miningPkh") &&
        nockchainMiningSourceTrace.receiptContract.requiredFields.includes("candidatePowLen") &&
        nockchainMiningSourceTrace.receiptContract.forbiddenFields.includes("rawPowProof") &&
        nockchainMiningSourceTrace.localVerification.recommendedCommands.includes(
          "cargo check -p nockchain"
        ),
      nockchainPmaSourceTraceAvailable:
        nockchainPmaSourceTrace.sourceAnchors.length >= 6 &&
        nockchainPmaSourceTrace.durabilityFlow.length >= 5 &&
        nockchainPmaSourceTrace.receiptContract.requiredFields.includes("pmaMetadataVersion") &&
        nockchainPmaSourceTrace.receiptContract.forbiddenFields.includes("rawEventLogSqlite"),
      nockchainRuntimeSafetyAvailable:
        nockchainRuntimeSafety.sourceAnchors.length >= 9 &&
        nockchainRuntimeSafety.runtimeSafetyClasses.length >= 5 &&
        nockchainRuntimeSafety.receiptContract.requiredFields.includes("runtimeSafetyIssue") &&
        nockchainRuntimeSafety.receiptContract.forbiddenFields.includes("rawStackMemory") &&
        nockchainRuntimeSafety.localVerification.recommendedCommands.includes(
          "cargo check -p nockvm"
        ),
      nockchainTestkitE2eAvailable:
        nockchainTestkitE2e.sourceAnchors.length >= 11 &&
        nockchainTestkitE2e.scenarioCapabilities.length >= 8 &&
        nockchainTestkitE2e.receiptContract.requiredFields.includes("stepRecords") &&
        nockchainTestkitE2e.receiptContract.forbiddenFields.includes("rawStateJam") &&
        nockchainTestkitE2e.localVerification.recommendedCommands.includes(
          "cargo check -p nockchain-e2e"
        ),
      noRawStateJamArtifactsStored:
        stateJamRegistry.policy.rawArtifactStorage === "forbidden" &&
        stateJamRegistry.sources.every((source) => source.artifactPolicy === "metadata-only"),
      pmaSafetyGuidanceAvailable:
        stateJamRegistry.pmaSafety.sourceDocs.length >= 4 &&
        stateJamRegistry.pmaSafety.bootSources.includes("checkpoint-bootstrap") &&
        stateJamRegistry.pmaSafety.bootSources.includes("pma-fast-path") &&
        stateJamRegistry.pmaSafety.forbiddenRawArtifacts.includes("pma/*.pma"),
      zorpUpstreamAvailable: zorpUpstream.repositories.length > 0,
      zorpWatchMatrixAvailable:
        zorpUpstream.repositoryWatchMatrix.length >= 5 &&
        zorpUpstream.repositoryWatchMatrix.some(
          (entry) =>
            entry.id === "canonical-runtime" &&
            entry.escalation === "immediate" &&
            entry.sources.includes("nockchain/nockchain")
        ) &&
        zorpUpstream.repositoryWatchMatrix.some(
          (entry) =>
            entry.id === "authoring-fixtures" &&
            entry.sources.includes("zorp-corp/jock-lang")
        ),
      zorpMonitorRunbookAvailable:
        zorpMonitorRunbook.automation.active &&
        zorpMonitorRunbook.watchedSources.length >= 4 &&
        zorpMonitorRunbook.findingSchema.requiredFields.includes("upstreamSourceUrl") &&
        zorpMonitorRunbook.findingSchema.requiredFields.includes("nocksperimentalSurface") &&
        zorpMonitorRunbook.findingSchema.forbiddenFields.includes("rawStateJam") &&
        zorpMonitorRunbook.routeMatrix.some((entry) =>
          (entry.targetSurfaces as readonly string[]).includes("nockchainMiningSourceTrace")
        ) &&
        zorpMonitorRunbook.localVerification.recommendedCommands.includes(
          "node scripts/run-zorp-monitor-snapshot.mjs --json"
        ) &&
        zorpMonitorRunbook.localVerification.recommendedCommands.includes(
          "npm run check:zorp-org-drift -- --json"
        ),
      zorpMonitorReviewContractAvailable:
        zorpUpstream.monitorReviewContract.classes.length === 5 &&
        zorpUpstream.monitorReviewContract.classes.some(
          (reviewClass) =>
            reviewClass.id === "canonical-nockchain" &&
            reviewClass.escalation === "immediate" &&
            reviewClass.targetSurfaces.includes("nockchainWatch")
        ) &&
        zorpUpstream.monitorReviewContract.classes.some(
          (reviewClass) =>
            reviewClass.id === "state-artifact-provenance" &&
            reviewClass.sourceAuthority === "state-artifact-provenance" &&
            reviewClass.targetSurfaces.includes("stateJamRegistry")
        ) &&
        zorpUpstream.monitorReviewContract.requiredEvidenceFields.includes(
          "nocksperimentalSurface"
        ),
      zorpCollaborationFlywheelAvailable:
        zorpUpstream.collaborationFlywheel.cycleId === "zorp-monitor-to-fixture-flywheel" &&
        zorpUpstream.collaborationFlywheel.phases.length === 5 &&
        zorpUpstream.collaborationFlywheel.phases.some(
          (phase) =>
            phase.id === "share-collab-note" &&
            phase.output === "collaborationBrief" &&
            phase.targetSurfaces.includes("docsResearch")
        ) &&
        zorpUpstream.collaborationFlywheel.sourceRoutes.some(
          (route) =>
            route.routeId === "authoring-fixture-review" &&
            route.source === "zorp-corp/jock-lang" &&
            route.targetSurfaces.includes("nockupValidation")
        ) &&
        zorpUpstream.collaborationFlywheel.requiredEvidenceFields.includes("reviewDecision") &&
        zorpUpstream.collaborationFlywheel.forbiddenFields.includes("rawStateJam"),
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
      pmaSafety: {
        sourceDocs: stateJamRegistry.pmaSafety.sourceDocs.map((source) => source.path),
        bootSources: stateJamRegistry.pmaSafety.bootSources,
        forbiddenRawArtifacts: stateJamRegistry.pmaSafety.forbiddenRawArtifacts,
        recoverySignals: stateJamRegistry.pmaSafety.recoverySignals
      },
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
      watchMatrixEntryIds: zorpUpstream.repositoryWatchMatrix.map((entry) => entry.id),
      monitorReviewClassIds: zorpUpstream.monitorReviewContract.classes.map((entry) => entry.id),
      collaborationPhaseIds: zorpUpstream.collaborationFlywheel.phases.map((phase) => phase.id),
      sourceRouteIds: zorpUpstream.collaborationFlywheel.sourceRoutes.map(
        (route) => route.routeId
      ),
      collaborationForbiddenFields: zorpUpstream.collaborationFlywheel.forbiddenFields,
      monitor: {
        active: zorpUpstream.monitor.active,
        interval: zorpUpstream.monitor.interval
      },
      driftCheck: {
        command: zorpUpstream.driftCheck.command,
        compareFields: zorpUpstream.driftCheck.compareFields,
        sourceUrls: zorpUpstream.driftCheck.sourceUrls
      }
    },
    nockchainDocsAtlas: {
      tier0Count: nockchainDocsAtlas.tier0.length,
      tier1Count: nockchainDocsAtlas.tier1.length,
      protocolSpecCount: nockchainDocsAtlas.protocolSpecs.specs.length,
      consistencyAlerts: nockchainDocsAtlas.consistencyChecks.alerts.map((alert) => alert.id)
    },
    nockchainKnowledgeSpine: {
      generatedAt: nockchainKnowledgeSpine.generatedAt,
      documentFingerprintCount: nockchainKnowledgeSpine.documentFingerprints.length,
      workspaceMemberCount: nockchainKnowledgeSpine.workspaceManifest.memberCount,
      workspaceMemberHash: nockchainKnowledgeSpine.workspaceManifest.workspaceMemberHash,
      coverageDomainIds: nockchainKnowledgeSpine.coverageMatrix.map((entry) => entry.id),
      requiredEvidence: nockchainKnowledgeSpine.monitoringContract.requiredEvidence,
      forbiddenFields: nockchainKnowledgeSpine.monitoringContract.forbiddenFields,
      driftCheck: {
        command: nockchainKnowledgeSpine.driftCheck.command,
        sourceUrls: nockchainKnowledgeSpine.driftCheck.sourceUrls,
        compareFields: nockchainKnowledgeSpine.driftCheck.compareFields,
        documentPaths: nockchainKnowledgeSpine.driftCheck.documentPaths
      }
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
      workspaceMemberHash: nockchainRustAtlas.workspace.workspaceMemberHash,
      manifest: nockchainRustAtlas.workspace.manifest,
      trackedWorkspaceMemberCount:
        nockchainRustAtlas.workspace.coverage.trackedWorkspaceMemberCount,
      missingWorkspaceMembers: nockchainRustAtlas.workspace.coverage.missingWorkspaceMembers,
      nonWorkspaceTrackedCrates: nockchainRustAtlas.workspace.coverage.nonWorkspaceTrackedCrates,
      driftCheck: {
        command: nockchainRustAtlas.workspace.driftCheck.command,
        sourceUrls: nockchainRustAtlas.workspace.driftCheck.sourceUrls,
        compareFields: nockchainRustAtlas.workspace.driftCheck.compareFields
      }
    },
    nockchainRustSourceGuide: {
      domainCount: nockchainRustSourceGuide.sourceDomains.length,
      anchorCount: nockchainRustSourceGuide.sourceAnchors.length,
      domainIds: nockchainRustSourceGuide.sourceDomains.map((domain) => domain.id),
      anchorIds: nockchainRustSourceGuide.sourceAnchors.map((anchor) => anchor.id),
      requiredFields: nockchainRustSourceGuide.sourceTraceContract.requiredFields,
      forbiddenFields: nockchainRustSourceGuide.sourceTraceContract.forbiddenFields,
      learningPathDomains: nockchainRustSourceGuide.learningPath.map((step) => step.domainId)
    },
    nockchainNockAppAtlas: {
      boundaryCount: nockchainNockAppAtlas.runtimeBoundaries.length,
      probeTemplateCount: nockchainNockAppAtlas.probeTemplates.length,
      boundaryIds: nockchainNockAppAtlas.runtimeBoundaries.map((boundary) => boundary.id),
      probeTemplateIds: nockchainNockAppAtlas.probeTemplates.map((template) => template.id),
      receiptFields: nockchainNockAppAtlas.receiptContract.requiredFields,
      forbiddenFields: nockchainNockAppAtlas.receiptContract.forbiddenFields,
      canonicalSources: nockchainNockAppAtlas.sourceAuthority.canonical.sources,
      lineageSources: nockchainNockAppAtlas.sourceAuthority.lineage.sources
    },
    nockchainNockAppSourceTrace: {
      anchorCount: nockchainNockAppSourceTrace.sourceAnchors.length,
      runtimeFlowStepCount: nockchainNockAppSourceTrace.runtimeFlow.length,
      anchorIds: nockchainNockAppSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      flowStepIds: nockchainNockAppSourceTrace.runtimeFlow.map((step) => step.id),
      receiptFields: nockchainNockAppSourceTrace.receiptFieldMapping.receiptFields,
      forbiddenFields: nockchainNockAppSourceTrace.sourceTraceContract.forbiddenFields,
      watchedPullRequests: nockchainNockAppSourceTrace.pendingWatchItems.map(
        (item) => item.prNumber
      ),
      zorpStateJamArtifactPolicy:
        nockchainNockAppSourceTrace.zorpMonitorContext.stateJamDrive.artifactPolicy
    },
    nockchainNockupSourceTrace: {
      generatedAt: nockchainNockupSourceTrace.generatedAt,
      anchorCount: nockchainNockupSourceTrace.sourceAnchors.length,
      nockupCapabilityCount: nockchainNockupSourceTrace.nockupCapabilities.length,
      sourceAnchors: nockchainNockupSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      nockupCapabilityIds: nockchainNockupSourceTrace.nockupCapabilities.map(
        (capability) => capability.id
      ),
      receiptFields: nockchainNockupSourceTrace.receiptContract.requiredFields,
      forbiddenFields: nockchainNockupSourceTrace.receiptContract.forbiddenFields,
      watchedPullRequests: nockchainNockupSourceTrace.upstreamWatch.openPullRequests,
      localVerificationStatus: nockchainNockupSourceTrace.localVerification.status
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
      publicApiEvidenceSurfaceIds:
        nockchainWalletAtlas.publicApiEvidenceContract.surfaces.map((surface) => surface.id),
      localWalletAddress: nockchainWalletAtlas.localFakenetProfile.walletAddress
    },
    nockchainApiSourceTrace: {
      generatedAt: nockchainApiSourceTrace.generatedAt,
      anchorCount: nockchainApiSourceTrace.sourceAnchors.length,
      apiCapabilityCount: nockchainApiSourceTrace.apiCapabilities.length,
      sourceAnchors: nockchainApiSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      apiCapabilityIds: nockchainApiSourceTrace.apiCapabilities.map(
        (capability) => capability.id
      ),
      endpointModeIds: nockchainApiSourceTrace.endpointModes.map((mode) => mode.id),
      receiptFields: nockchainApiSourceTrace.receiptContract.requiredFields,
      forbiddenFields: nockchainApiSourceTrace.receiptContract.forbiddenFields,
      localVerificationStatus: nockchainApiSourceTrace.localVerification.status
    },
    nockchainWatch: {
      status: nockchainWatch.status,
      observedAt: nockchainWatch.observedAt,
      watchItemCount: nockchainWatch.watchQueue.length,
      highSeverityItemIds: nockchainWatch.watchQueue
        .filter((item) => item.severity === "high")
        .map((item) => item.id),
      sourceIds: nockchainWatch.sources.map((source) => source.id),
      changeClassIds: nockchainWatch.changeClassificationContract.classes.map(
        (changeClass) => changeClass.id
      ),
      commitMatchesPinned: nockchainWatch.drift.commitMatchesPinned,
      releaseMatchesPinned: nockchainWatch.drift.releaseMatchesPinned,
      latestCommitReleased: nockchainWatch.drift.latestCommitReleased,
      defaultBranchAheadOfRelease: nockchainWatch.drift.defaultBranchAheadOfRelease,
      aggregateDriftCheck: {
        command: nockchainWatch.monitor.aggregateDriftCheck.command,
        checkIds: nockchainWatch.monitor.aggregateDriftCheck.checks.map((check) => check.id),
        targetSurfaces: nockchainWatch.monitor.aggregateDriftCheck.checks.map(
          (check) => check.targetSurface
        )
      }
    },
    nockchainPrRadar: {
      observedAt: nockchainPrRadar.observedAt,
      openPullRequestCount: nockchainPrRadar.snapshot.openPullRequestCount,
      openIssueCount: nockchainPrRadar.snapshot.openIssueCount,
      draftCount: nockchainPrRadar.snapshot.draftCount,
      highPriorityPrs: nockchainPrRadar.pullRequests
        .filter((pullRequest) => pullRequest.priority === "high")
        .map((pullRequest) => pullRequest.number),
      openIssueNumbers: nockchainPrRadar.openIssues.map((issue) => issue.number),
      riskClassIds: nockchainPrRadar.riskClasses.map((riskClass) => riskClass.id),
      targetSurfaces: Array.from(
        new Set(
          [...nockchainPrRadar.pullRequests, ...nockchainPrRadar.openIssues].flatMap(
            (item) => item.targetSurfaces
          )
        )
      ),
      forbiddenFields: nockchainPrRadar.reviewContract.forbiddenFields,
      driftCheckCommand: nockchainPrRadar.driftCheck.command,
      driftCheckSourceUrls: nockchainPrRadar.driftCheck.sourceUrls
    },
    nockchainImpactQueue: {
      generatedAt: nockchainImpactQueue.generatedAt,
      impactItemCount: nockchainImpactQueue.impactItems.length,
      actionLaneCount: nockchainImpactQueue.actionLanes.length,
      immediateItems: nockchainImpactQueue.impactItems
        .filter((item) => item.priority === "immediate")
        .map((item) => item.id),
      highPriorityItems: nockchainImpactQueue.impactItems
        .filter((item) => item.priority === "high")
        .map((item) => item.id),
      sourceTypes: nockchainImpactQueue.snapshot.sourceTypes,
      targetSurfaces: Array.from(
        new Set(nockchainImpactQueue.impactItems.flatMap((item) => item.targetSurfaces))
      ),
      forbiddenFields: nockchainImpactQueue.queueContract.forbiddenFields
    },
    nockchainPmaSourceTrace: {
      generatedAt: nockchainPmaSourceTrace.generatedAt,
      anchorCount: nockchainPmaSourceTrace.sourceAnchors.length,
      durabilityFlowStepCount: nockchainPmaSourceTrace.durabilityFlow.length,
      sourceAnchors: nockchainPmaSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      durabilityFlowStepIds: nockchainPmaSourceTrace.durabilityFlow.map((step) => step.id),
      requiredChecks: nockchainPmaSourceTrace.snapshotVerification.requiredChecks,
      eventLogReplayGuards: nockchainPmaSourceTrace.eventLogContract.replayGuards,
      receiptFields: nockchainPmaSourceTrace.receiptContract.requiredFields,
      forbiddenFields: nockchainPmaSourceTrace.receiptContract.forbiddenFields,
      operatorGuards: nockchainPmaSourceTrace.operatorGuards
    },
    nockchainRuntimeSafety: {
      generatedAt: nockchainRuntimeSafety.generatedAt,
      anchorCount: nockchainRuntimeSafety.sourceAnchors.length,
      runtimeSafetyClassCount: nockchainRuntimeSafety.runtimeSafetyClasses.length,
      sourceAnchors: nockchainRuntimeSafety.sourceAnchors.map((anchor) => anchor.id),
      runtimeSafetyClassIds: nockchainRuntimeSafety.runtimeSafetyClasses.map(
        (safetyClass) => safetyClass.id
      ),
      receiptFields: nockchainRuntimeSafety.receiptContract.requiredFields,
      forbiddenFields: nockchainRuntimeSafety.receiptContract.forbiddenFields,
      operatorTriageIds: nockchainRuntimeSafety.operatorTriage.map((item) => item.id),
      localVerificationStatus: nockchainRuntimeSafety.localVerification.status
    },
    nockchainTestkitE2e: {
      generatedAt: nockchainTestkitE2e.generatedAt,
      anchorCount: nockchainTestkitE2e.sourceAnchors.length,
      scenarioCapabilityCount: nockchainTestkitE2e.scenarioCapabilities.length,
      sourceAnchors: nockchainTestkitE2e.sourceAnchors.map((anchor) => anchor.id),
      scenarioCapabilityIds: nockchainTestkitE2e.scenarioCapabilities.map(
        (capability) => capability.id
      ),
      receiptFields: nockchainTestkitE2e.receiptContract.requiredFields,
      forbiddenFields: nockchainTestkitE2e.receiptContract.forbiddenFields,
      localVerificationStatus: nockchainTestkitE2e.localVerification.status
    },
    nockchainBridgeTrace: {
      sourceCount: nockchainBridgeTrace.sourceAnchors.length,
      sourceIds: nockchainBridgeTrace.sourceAnchors.map((source) => source.id),
      flowStepIds: nockchainBridgeTrace.withdrawalFlow.map((step) => step.id),
      sequencerLifecycleStateIds:
        nockchainBridgeTrace.sequencerOperationalContract.lifecycleStates.map(
          (state) => state.id
        ),
      latestCommitReleased: nockchainBridgeTrace.releaseDrift.latestCommitReleased,
      defaultBranchAheadOfRelease: nockchainBridgeTrace.releaseDrift.defaultBranchAheadOfRelease,
      receiptFields: nockchainBridgeTrace.receiptFields
    },
    nockchainBridgeSourceTrace: {
      anchorCount: nockchainBridgeSourceTrace.sourceAnchors.length,
      executionFlowStepCount: nockchainBridgeSourceTrace.executionFlow.length,
      anchorIds: nockchainBridgeSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      flowStepIds: nockchainBridgeSourceTrace.executionFlow.map((step) => step.id),
      receiptFields: nockchainBridgeSourceTrace.receiptFieldMapping.receiptFields,
      forbiddenFields: nockchainBridgeSourceTrace.sourceTraceContract.forbiddenFields,
      upstreamSignalPrs: nockchainBridgeSourceTrace.upstreamSignals.map(
        (signal) => signal.prNumber
      ),
      operatorInvariants: nockchainBridgeSourceTrace.operatorInvariants
    },
    nockchainCargoSurface: {
      generatedAt: nockchainCargoSurface.generatedAt,
      crateCount: nockchainCargoSurface.crates.length,
      targetCount: nockchainCargoSurface.targetSummary.targetCount,
      manifestCount: nockchainCargoSurface.workspace.manifestSnapshots.length,
      manifestCatalogHash: nockchainCargoSurface.workspace.manifestCatalogHash,
      manifestDriftCommand: nockchainCargoSurface.workspace.manifestDriftCheck.command,
      binaryCrates: nockchainCargoSurface.targetSummary.binaryCrates,
      libraryCrates: nockchainCargoSurface.targetSummary.libraryCrates,
      benchmarkTargets: nockchainCargoSurface.targetSummary.benchmarkTargets,
      requiredCommands: nockchainCargoSurface.verificationMatrix.requiredCommands,
      forbiddenFields: nockchainCargoSurface.evidenceContract.forbiddenFields
    },
    nockchainHoonKernels: {
      generatedAt: nockchainHoonKernels.generatedAt,
      kernelCount: nockchainHoonKernels.kernels.length,
      jamAssets: nockchainHoonKernels.buildPipeline.assetTargets,
      kernelIds: nockchainHoonKernels.kernels.map((kernel) => kernel.id),
      kernelCrates: nockchainHoonKernels.rustEmbedding.kernelCrates,
      requiredFields: nockchainHoonKernels.evidenceContract.requiredFields,
      forbiddenFields: nockchainHoonKernels.evidenceContract.forbiddenFields
    },
    nockchainReleaseAssets: {
      assetCount: nockchainReleaseAssets.assets.length,
      groupCount: nockchainReleaseAssets.assetGroups.length,
      platformTriples: nockchainReleaseAssets.release.platformTriples,
      manifestPresent: nockchainReleaseAssets.release.manifestPresent,
      manifestTargetCount: nockchainReleaseAssets.manifest.targets.length,
      hashCoverage: nockchainReleaseAssets.manifest.coverage,
      driftCheck: {
        command: nockchainReleaseAssets.driftCheck.command,
        sourceUrls: nockchainReleaseAssets.driftCheck.sourceUrls,
        compareFields: nockchainReleaseAssets.driftCheck.compareFields
      },
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
    nockchainMiningSourceTrace: {
      generatedAt: nockchainMiningSourceTrace.generatedAt,
      anchorCount: nockchainMiningSourceTrace.sourceAnchors.length,
      miningCapabilityCount: nockchainMiningSourceTrace.miningCapabilities.length,
      operationalModeCount: nockchainMiningSourceTrace.operationalModes.length,
      diagnosticScenarioCount: nockchainMiningSourceTrace.diagnosticScenarios.length,
      sourceAnchors: nockchainMiningSourceTrace.sourceAnchors.map((anchor) => anchor.id),
      miningCapabilityIds: nockchainMiningSourceTrace.miningCapabilities.map(
        (capability) => capability.id
      ),
      operationalModeIds: nockchainMiningSourceTrace.operationalModes.map((mode) => mode.id),
      diagnosticScenarioIds: nockchainMiningSourceTrace.diagnosticScenarios.map(
        (scenario) => scenario.id
      ),
      receiptFields: nockchainMiningSourceTrace.receiptContract.requiredFields,
      forbiddenFields: nockchainMiningSourceTrace.receiptContract.forbiddenFields,
      localVerificationStatus: nockchainMiningSourceTrace.localVerification.status
    },
    zorpMonitorRunbook: {
      generatedAt: zorpMonitorRunbook.generatedAt,
      automationId: zorpMonitorRunbook.automation.automationId,
      watchedSourceIds: zorpMonitorRunbook.watchedSources.map((source) => source.id),
      monitorClassIds: zorpMonitorRunbook.monitorClasses.map((monitorClass) => monitorClass.id),
      routeMatrixIds: zorpMonitorRunbook.routeMatrix.map((entry) => entry.id),
      requiredFields: zorpMonitorRunbook.findingSchema.requiredFields,
      forbiddenFields: zorpMonitorRunbook.findingSchema.forbiddenFields,
      localVerificationStatus: zorpMonitorRunbook.localVerification.status
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
      zorpMonitorRunbook: `${registryCanonicalBaseUrl}/api/nockchain/zorp/monitor`,
      nockchainBridgeTrace: `${registryCanonicalBaseUrl}/api/nockchain/bridge`,
      nockchainBridgeSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/bridge-source`,
      nockchainCargoSurface: `${registryCanonicalBaseUrl}/api/nockchain/cargo-surface`,
      nockchainHoonKernels: `${registryCanonicalBaseUrl}/api/nockchain/hoon-kernels`,
      nockchainReleaseAssets: `${registryCanonicalBaseUrl}/api/nockchain/release-assets`,
      nockchainDocsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
      nockchainKnowledgeSpine: `${registryCanonicalBaseUrl}/api/nockchain/knowledge-spine`,
      nockchainProtocolTrace: `${registryCanonicalBaseUrl}/api/nockchain/protocol`,
      nockchainRustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      nockchainRustSourceGuide: `${registryCanonicalBaseUrl}/api/nockchain/rust-source`,
      nockchainNockAppAtlas: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-atlas`,
      nockchainNockAppSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      nockchainOperationsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      nockchainWalletAtlas: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      nockchainApiSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/api-source`,
      nockchainWatch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      nockchainPrRadar: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
      nockchainImpactQueue: `${registryCanonicalBaseUrl}/api/nockchain/impact`,
      nockchainPmaSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/pma`,
      nockchainRuntimeSafety: `${registryCanonicalBaseUrl}/api/nockchain/runtime-safety`,
      nockchainTestkitE2e: `${registryCanonicalBaseUrl}/api/nockchain/testkit-e2e`,
      nockchainSyncGossipTrace: `${registryCanonicalBaseUrl}/api/nockchain/sync-gossip`,
      nockchainMiningSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/mining-source`,
      nockchainNockupSourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/nockup/source`,
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
