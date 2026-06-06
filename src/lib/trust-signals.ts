import trustSignalData from "@/data/trust-signals.json";
import {
  computeBadgeFreshness,
  type BadgeFreshness,
  type BadgeSourceAnchor
} from "@/lib/trust-badge-freshness";

export type TrustBadgeKind =
  | "app-report"
  | "solver-score"
  | "token-compatibility"
  | "compute-benchmark";
export type TrustBadgeStatus = "verified" | "watch" | "revoked" | "expired";
export type TrustConsumerCategory = "app" | "wallet" | "fund" | "provider";
export type QualifiedStatus = "qualified" | "watch" | "blocked";
export type CompatibilityStatus = "compatible" | "partial" | "incompatible";

export type VerifiedBadge = {
  id: string;
  label: string;
  kind: TrustBadgeKind;
  status: TrustBadgeStatus;
  reportSlug: string;
  fixtureId: string;
  issuedAt: string;
  expiresAt: string;
  issuer: string;
  evidence: {
    reportHash: string;
    snapshotRoot: string;
    signature: string;
    invariantPacks: string[];
  };
  sourceAnchor: BadgeSourceAnchor;
};

export type BadgeRevocation = {
  id: string;
  badgeId: string;
  statusBeforeRevocation: Exclude<TrustBadgeStatus, "revoked">;
  revokedAt: string;
  revokedBy: string;
  reason: string;
  replacementBadgeId?: string;
  evidence: {
    reportHash: string;
    snapshotRoot: string;
    signature: string;
  };
};

export type BadgeIssuanceVerificationStatus = "valid" | "invalid" | "unchecked";

export type BadgeIssuanceReceipt = {
  id: string;
  badgeId: string;
  issuedAt: string;
  issuer: string;
  issuerKeyId: string;
  payloadDigest: string;
  signature: string;
  signedPayload: {
    badgeId: string;
    status: TrustBadgeStatus;
    reportHash: string;
    snapshotRoot: string;
    issuedAt: string;
    expiresAt: string;
    sourceAnchor: BadgeSourceAnchor;
  };
  verification: {
    status: BadgeIssuanceVerificationStatus;
    algorithm: string;
    checkedAt: string;
  };
};

export type ResolvedVerifiedBadge = VerifiedBadge & {
  currentStatus: TrustBadgeStatus;
  isRevoked: boolean;
  freshness: BadgeFreshness;
  issuance?: BadgeIssuanceReceipt;
  revocation?: BadgeRevocation;
};

export type TrustBadgeEmbed = {
  badgeId: string;
  label: string;
  status: TrustBadgeStatus;
  reportSlug: string;
  fixtureId: string;
  issuanceDigest: string;
  issuerKeyId: string;
  freshness: BadgeFreshness;
  sourceCommit: string;
  verificationUrl: string;
  apiUrl: string;
  keyDiscoveryUrl: string;
  htmlSnippet: string;
  markdownSnippet: string;
};

export type SolverScorecard = {
  id: string;
  solverSlug: string;
  solverName: string;
  status: QualifiedStatus;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  reportSlug: string;
  fixtureId: string;
  metrics: {
    fillRate: number;
    failureRate: number;
    medianSettlementMs: number;
    proofLatencyMs: number;
    replayCount: number;
  };
  signals: string[];
};

export type TokenCompatibilityReport = {
  id: string;
  tokenSymbol: string;
  issuerWorkspace: string;
  status: CompatibilityStatus;
  score: number;
  reportSlug: string;
  fixtureId: string;
  badgeId: string;
  wallets: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    notes: string;
  }>;
  requirements: {
    supplyConserved: boolean;
    metadataStable: boolean;
    authorizedIssuance: boolean;
    transferCompatible: boolean;
  };
};

export type ComputeBenchmarkProfile = {
  id: string;
  providerSlug: string;
  providerName: string;
  status: QualifiedStatus;
  score: number;
  benchmarkReportSlug: string;
  badgeId: string;
  jobClasses: Array<{
    name: string;
    score: number;
    p50Ms: number;
    p95Ms: number;
    reproducibility: number;
  }>;
  sla: {
    uptime: number;
    failureRate: number;
    sampleSize: number;
  };
};

export type TrustConsumer = {
  id: string;
  name: string;
  category: TrustConsumerCategory;
  uses: Array<{
    kind: "badge" | "solver-score" | "token-compatibility" | "compute-benchmark";
    badgeId?: string;
    scorecardId?: string;
    compatibilityReportId?: string;
    benchmarkProfileId?: string;
    reportSlug?: string;
    purpose: string;
  }>;
};

export type TrustConsumerUse = TrustConsumer["uses"][number];

export type ResolvedTrustConsumerUse = TrustConsumerUse & {
  evidenceLabel?: string;
  evidenceStatus?: TrustBadgeStatus | QualifiedStatus | CompatibilityStatus;
  fixtureId?: string;
  issuanceDigest?: string;
  issuanceStatus?: BadgeIssuanceVerificationStatus;
  issuerKeyId?: string;
  reportHash?: string;
  snapshotRoot?: string;
  signature?: string;
  score?: number;
  unresolved?: boolean;
};

export type ResolvedTrustConsumer = TrustConsumer & {
  resolvedUses: ResolvedTrustConsumerUse[];
  evidenceCount: number;
  verifiedBadgeCount: number;
};

export type TrustSignalRegistry = {
  version: string;
  verifiedBadges: VerifiedBadge[];
  badgeIssuanceReceipts: BadgeIssuanceReceipt[];
  badgeRevocations: BadgeRevocation[];
  solverScorecards: SolverScorecard[];
  tokenCompatibilityReports: TokenCompatibilityReport[];
  computeBenchmarkProfiles: ComputeBenchmarkProfile[];
  trustConsumers: TrustConsumer[];
};

export const trustSignals = trustSignalData as TrustSignalRegistry;
export const verifiedBadges = trustSignals.verifiedBadges;
export const badgeIssuanceReceipts = trustSignals.badgeIssuanceReceipts;
export const badgeRevocations = trustSignals.badgeRevocations;
export const solverScorecards = trustSignals.solverScorecards;
export const tokenCompatibilityReports = trustSignals.tokenCompatibilityReports;
export const computeBenchmarkProfiles = trustSignals.computeBenchmarkProfiles;
export const trustConsumers = trustSignals.trustConsumers;
export const resolvedBadges = verifiedBadges.map(resolveBadge);
export const resolvedTrustConsumers = trustConsumers.map(resolveTrustConsumer);
export const badgeEmbeds = resolvedBadges.filter(isPublicBadge).map(createBadgeEmbed);

export const trustConsumerCategories: TrustConsumerCategory[] = [
  "app",
  "wallet",
  "fund",
  "provider"
];

export function badgeForId(id: string) {
  return verifiedBadges.find((badge) => badge.id === id);
}

export function resolvedBadgeForId(id: string) {
  return resolvedBadges.find((badge) => badge.id === id);
}

export function issuanceForBadgeId(id: string) {
  return badgeIssuanceReceipts.find((issuance) => issuance.badgeId === id);
}

export function revocationForBadgeId(id: string) {
  return badgeRevocations.find((revocation) => revocation.badgeId === id);
}

export function badgeForReport(reportSlug: string, fixtureId: string) {
  return verifiedBadges.find(
    (badge) => badge.reportSlug === reportSlug && badge.fixtureId === fixtureId
  );
}

export function badgeEmbedForId(id: string) {
  return badgeEmbeds.find((embed) => embed.badgeId === id);
}

export function trustConsumersForCategory(category: TrustConsumerCategory) {
  return trustConsumers.filter((consumer) => consumer.category === category);
}

export function resolvedTrustConsumersForCategory(category: TrustConsumerCategory) {
  return resolvedTrustConsumers.filter((consumer) => consumer.category === category);
}

function resolveBadge(badge: VerifiedBadge): ResolvedVerifiedBadge {
  const issuance = issuanceForBadgeId(badge.id);
  const revocation = revocationForBadgeId(badge.id);

  return {
    ...badge,
    currentStatus: revocation ? "revoked" : badge.status,
    isRevoked: Boolean(revocation),
    freshness: computeBadgeFreshness(badge.sourceAnchor),
    issuance,
    revocation
  };
}

function isPublicBadge(badge: ResolvedVerifiedBadge) {
  return badge.currentStatus === "verified" && badge.issuance?.verification.status === "valid";
}

function resolveTrustConsumer(consumer: TrustConsumer): ResolvedTrustConsumer {
  const resolvedUses = consumer.uses.map(resolveTrustConsumerUse);

  return {
    ...consumer,
    resolvedUses,
    evidenceCount: resolvedUses.filter((use) => !use.unresolved).length,
    verifiedBadgeCount: resolvedUses.filter((use) => use.badgeId).length
  };
}

function resolveTrustConsumerUse(use: TrustConsumerUse): ResolvedTrustConsumerUse {
  if (use.kind === "badge") {
    const badge = use.badgeId ? resolvedBadgeForId(use.badgeId) : undefined;

    return badge ? withBadgeEvidence(use, badge.label, badge.currentStatus, badge) : markUnresolved(use);
  }

  if (use.kind === "solver-score") {
    const scorecard = solverScorecards.find((score) => score.id === use.scorecardId);

    if (!scorecard) {
      return markUnresolved(use);
    }

    return {
      ...use,
      evidenceLabel: `${scorecard.solverName} scorecard`,
      evidenceStatus: scorecard.status,
      reportSlug: scorecard.reportSlug,
      fixtureId: scorecard.fixtureId,
      score: scorecard.score
    };
  }

  if (use.kind === "token-compatibility") {
    const report = tokenCompatibilityReports.find(
      (compatibility) => compatibility.id === use.compatibilityReportId
    );

    if (!report) {
      return markUnresolved(use);
    }

    return withBadgeEvidence(
      {
        ...use,
        reportSlug: report.reportSlug,
        fixtureId: report.fixtureId,
        badgeId: report.badgeId,
        score: report.score
      },
      `${report.tokenSymbol} token compatibility`,
      report.status,
      resolvedBadgeForId(report.badgeId)
    );
  }

  const profile = computeBenchmarkProfiles.find(
    (benchmark) => benchmark.id === use.benchmarkProfileId
  );

  if (!profile) {
    return markUnresolved(use);
  }

  return withBadgeEvidence(
    {
      ...use,
      reportSlug: profile.benchmarkReportSlug,
      badgeId: profile.badgeId,
      score: profile.score
    },
    `${profile.providerName} benchmark`,
    profile.status,
    resolvedBadgeForId(profile.badgeId)
  );
}

function withBadgeEvidence(
  use: ResolvedTrustConsumerUse,
  evidenceLabel: string,
  evidenceStatus: ResolvedTrustConsumerUse["evidenceStatus"],
  badge?: ResolvedVerifiedBadge
): ResolvedTrustConsumerUse {
  return {
    ...use,
    evidenceLabel,
    evidenceStatus,
    reportSlug: use.reportSlug ?? badge?.reportSlug,
    fixtureId: badge?.fixtureId,
    issuanceDigest: badge?.issuance?.payloadDigest,
    issuanceStatus: badge?.issuance?.verification.status,
    issuerKeyId: badge?.issuance?.issuerKeyId,
    reportHash: badge?.evidence.reportHash,
    snapshotRoot: badge?.evidence.snapshotRoot,
    signature: badge?.evidence.signature
  };
}

function markUnresolved(use: TrustConsumerUse): ResolvedTrustConsumerUse {
  return {
    ...use,
    unresolved: true
  };
}

function createBadgeEmbed(badge: ResolvedVerifiedBadge): TrustBadgeEmbed {
  const verificationUrl = `/trust/badges#${badge.id}`;
  const apiUrl = `/api/trust/badges/${badge.id}`;
  const issuance = badge.issuance;

  if (!issuance) {
    throw new Error(`Cannot create public embed without issuance receipt: ${badge.id}`);
  }

  return {
    badgeId: badge.id,
    label: badge.label,
    status: badge.currentStatus,
    reportSlug: badge.reportSlug,
    fixtureId: badge.fixtureId,
    issuanceDigest: issuance.payloadDigest,
    issuerKeyId: issuance.issuerKeyId,
    freshness: badge.freshness,
    sourceCommit: badge.sourceAnchor.commit,
    verificationUrl,
    apiUrl,
    keyDiscoveryUrl: "/api/trust/keys",
    htmlSnippet:
      `<a class="nocksperimental-badge" href="${verificationUrl}" ` +
      `data-nocksperimental-badge="${badge.id}" ` +
      `data-snapshot-root="${badge.evidence.snapshotRoot}" ` +
      `data-issuance-digest="${issuance.payloadDigest}" ` +
      `data-issuer-key="${issuance.issuerKeyId}" ` +
      `data-source-commit="${badge.sourceAnchor.commit}" ` +
      `data-freshness="${badge.freshness}" ` +
      `data-report-hash="${badge.evidence.reportHash}">` +
      `${badge.label} - ${badge.currentStatus}</a>`,
    markdownSnippet: `[${badge.label} (${badge.currentStatus})](${verificationUrl})`
  };
}

export function scoreLabel(score: number) {
  if (score >= 90) {
    return "Excellent";
  }
  if (score >= 80) {
    return "Strong";
  }
  if (score >= 70) {
    return "Watch";
  }
  return "At risk";
}

export function percentage(value: number) {
  return `${(value * 100).toFixed(value >= 0.99 ? 1 : 2)}%`;
}
