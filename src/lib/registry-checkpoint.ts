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
import { createNockchainOperationsAtlas } from "@/lib/nockchain-operations-atlas";
import { createNockchainPrRadar } from "@/lib/nockchain-pr-radar";
import { createNockchainProtocolTrace } from "@/lib/nockchain-protocol-trace";
import { createNockchainReleaseAssets } from "@/lib/nockchain-release-assets";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";
import { createNockchainRustSourceGuide } from "@/lib/nockchain-rust-source-guide";
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
  const nockchainOperationsAtlas = createNockchainOperationsAtlas();
  const nockchainWalletAtlas = createNockchainWalletAtlas();
  const nockchainWatch = createNockchainWatchBoard();
  const nockchainPrRadar = createNockchainPrRadar();
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
    zorpWatchMatrixEntries: zorpUpstream.repositoryWatchMatrix.length,
    zorpMonitorReviewClasses: zorpUpstream.monitorReviewContract.classes.length,
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
    nockchainOperationsScenarios: nockchainOperationsAtlas.triageScenarios.length,
    nockchainWalletCommands: nockchainWalletAtlas.walletCommands.length,
    nockchainPublicApiEvidenceSurfaces:
      nockchainWalletAtlas.publicApiEvidenceContract.surfaces.length,
    nockchainWatchItems: nockchainWatch.watchQueue.length,
    nockchainWatchChangeClasses: nockchainWatch.changeClassificationContract.classes.length,
    nockchainOpenPullRequests: nockchainPrRadar.pullRequests.length,
    nockchainOpenIssues: nockchainPrRadar.openIssues.length,
    nockchainPrRiskClasses: nockchainPrRadar.riskClasses.length,
    nockchainSyncGossipAnchors: nockchainSyncGossipTrace.sourceAnchors.length,
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
      repositoryWatchMatrix: zorpUpstream.repositoryWatchMatrix,
      monitorReviewContract: zorpUpstream.monitorReviewContract,
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
    nockchainWatch: createSha256Root({
      observedAt: nockchainWatch.observedAt,
      status: nockchainWatch.status,
      sources: nockchainWatch.sources,
      pinned: nockchainWatch.pinned,
      observed: nockchainWatch.observed,
      drift: nockchainWatch.drift,
      changeClassificationContract: nockchainWatch.changeClassificationContract,
      watchQueue: nockchainWatch.watchQueue,
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
      operatorQueue: nockchainPrRadar.operatorQueue
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
        nockchainReleaseAssets.release.commitMatchesTag,
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
      nockchainSyncGossipTraceAvailable:
        nockchainSyncGossipTrace.sourceAnchors.length > 0 &&
        nockchainSyncGossipTrace.triageScenarios.length > 0 &&
        Boolean(nockchainSyncGossipTrace.localVerification.status),
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
    nockchainKnowledgeSpine: {
      generatedAt: nockchainKnowledgeSpine.generatedAt,
      documentFingerprintCount: nockchainKnowledgeSpine.documentFingerprints.length,
      workspaceMemberCount: nockchainKnowledgeSpine.workspaceManifest.memberCount,
      workspaceMemberHash: nockchainKnowledgeSpine.workspaceManifest.workspaceMemberHash,
      coverageDomainIds: nockchainKnowledgeSpine.coverageMatrix.map((entry) => entry.id),
      requiredEvidence: nockchainKnowledgeSpine.monitoringContract.requiredEvidence,
      forbiddenFields: nockchainKnowledgeSpine.monitoringContract.forbiddenFields
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
      defaultBranchAheadOfRelease: nockchainWatch.drift.defaultBranchAheadOfRelease
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
      forbiddenFields: nockchainPrRadar.reviewContract.forbiddenFields
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
      nockchainWatch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      nockchainPrRadar: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
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
