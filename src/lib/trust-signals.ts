import trustSignalData from "@/data/trust-signals.json";

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

export type TrustSignalRegistry = {
  version: string;
  verifiedBadges: VerifiedBadge[];
  solverScorecards: SolverScorecard[];
  tokenCompatibilityReports: TokenCompatibilityReport[];
  computeBenchmarkProfiles: ComputeBenchmarkProfile[];
  trustConsumers: TrustConsumer[];
};

export const trustSignals = trustSignalData as TrustSignalRegistry;
export const verifiedBadges = trustSignals.verifiedBadges;
export const solverScorecards = trustSignals.solverScorecards;
export const tokenCompatibilityReports = trustSignals.tokenCompatibilityReports;
export const computeBenchmarkProfiles = trustSignals.computeBenchmarkProfiles;
export const trustConsumers = trustSignals.trustConsumers;

export const trustConsumerCategories: TrustConsumerCategory[] = [
  "app",
  "wallet",
  "fund",
  "provider"
];

export function badgeForId(id: string) {
  return verifiedBadges.find((badge) => badge.id === id);
}

export function trustConsumersForCategory(category: TrustConsumerCategory) {
  return trustConsumers.filter((consumer) => consumer.category === category);
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
