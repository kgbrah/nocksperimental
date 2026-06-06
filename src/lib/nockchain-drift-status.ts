import driftStatusData from "@/data/nockchain-drift-status.json";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export type NockchainDriftStatusValue = "in-sync" | "review-needed" | "failed";

export type NockchainDriftCheckSnapshot = {
  id: string;
  label: string;
  domain: string;
  status: NockchainDriftStatusValue;
  observedAt: string;
};

export type NockchainDriftStatusSnapshot = {
  version: string;
  status: NockchainDriftStatusValue;
  observedAt: string;
  generatedAt: string;
  source: string;
  aggregateCommand: string;
  summary: {
    totalChecks: number;
    inSyncChecks: number;
    reviewNeededChecks: number;
    failedChecks: number;
  };
  checks: NockchainDriftCheckSnapshot[];
  freshness: {
    maxAgeHours: number;
  };
};

const snapshot = driftStatusData as NockchainDriftStatusSnapshot;
const DEFAULT_MAX_AGE_HOURS = 168;

export function createNockchainDriftStatus() {
  const maxAgeHours = snapshot.freshness?.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  const observedMs = Date.parse(snapshot.observedAt);
  const ageHours = Number.isFinite(observedMs)
    ? Math.max(0, Math.round(((Date.now() - observedMs) / 3_600_000) * 100) / 100)
    : null;
  const stale = ageHours === null ? true : ageHours > maxAgeHours;

  return {
    version: snapshot.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/drift-status`,
    status: snapshot.status,
    observedAt: snapshot.observedAt,
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
    aggregateCommand: snapshot.aggregateCommand,
    summary: snapshot.summary,
    checks: snapshot.checks,
    freshness: {
      maxAgeHours,
      ageHours,
      stale,
      observedAt: snapshot.observedAt
    },
    interpretation:
      "Public snapshot of the aggregate Nockchain/Zorp upstream drift check. It is a watch board, not authority: re-run the aggregate command and refresh the snapshot before treating it as current. Drift status is informational and never publishes raw chain state or secrets.",
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/drift-status`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
