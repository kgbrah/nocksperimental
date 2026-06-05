import { createHash } from "node:crypto";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
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
  const nockchainDocsAtlas = createNockchainDocsAtlas();
  const nockchainRustAtlas = createNockchainRustAtlas();
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
    nockchainProtocolSpecs: nockchainDocsAtlas.protocolSpecs.specs.length,
    nockchainRustCrates: nockchainRustAtlas.crates.length,
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
    zorpUpstream: createSha256Root({
      scannedAt: zorpUpstream.scannedAt,
      organization: zorpUpstream.organization,
      nockchain: zorpUpstream.nockchain,
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
      nockchainDocsAtlasAvailable: nockchainDocsAtlas.protocolSpecs.specs.length > 0,
      nockchainRustAtlasAvailable: nockchainRustAtlas.crates.length > 0,
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
    nockchainRustAtlas: {
      crateCount: nockchainRustAtlas.crates.length,
      groupCount: nockchainRustAtlas.groups.length,
      validationGates: nockchainRustAtlas.workspace.validationGates,
      watchThemes: nockchainRustAtlas.watchThemes
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
      nockchainDocsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/docs-atlas`,
      nockchainRustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
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
