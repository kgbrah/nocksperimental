import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";
import { createNockchainDriftStatus } from "@/lib/nockchain-drift-status";
import {
  currentUpstreamAnchor,
  type BadgeFreshness
} from "@/lib/trust-badge-freshness";
import { resolvedBadges } from "@/lib/trust-signals";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

// LEAF MODULE. This rollup aggregates already-resolved trust freshness surfaces
// and must only be imported by its own route (src/app/api/trust/freshness).
// It imports trust-signals / launch-evidence / nockchain-drift-status /
// trust-badge-freshness / registry-manifest one-way. It reuses the existing
// Pillar 2 freshness primitives (computeBadgeFreshness + currentUpstreamAnchor
// via the resolved surfaces) rather than reimplementing freshness.

export type TrustFreshnessOverall = "drift-detected" | "stale-evidence" | "anchored";

export type FreshnessCounts = Record<BadgeFreshness, number>;

function emptyFreshnessCounts(): FreshnessCounts {
  return { fresh: 0, stale: 0, unknown: 0 };
}

export function createTrustFreshnessRollup() {
  const upstream = currentUpstreamAnchor();
  const driftStatus = createNockchainDriftStatus();
  const launchEvidence = createLaunchEvidenceIndex();

  const badgeFreshness = resolvedBadges.reduce((counts, badge) => {
    counts[badge.freshness] += 1;
    return counts;
  }, emptyFreshnessCounts());

  const launchEvidenceFreshness: FreshnessCounts = {
    fresh: launchEvidence.freshnessSummary.fresh,
    stale: launchEvidence.freshnessSummary.stale,
    unknown: launchEvidence.freshnessSummary.unknown
  };

  const driftInSync = driftStatus.status === "in-sync";
  const staleEvidence = badgeFreshness.stale > 0 || launchEvidenceFreshness.stale > 0;

  const overall: TrustFreshnessOverall = !driftInSync
    ? "drift-detected"
    : staleEvidence
      ? "stale-evidence"
      : "anchored";

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/trust/freshness`,
    overall,
    currentUpstream: {
      commit: upstream.commit,
      build: upstream.build,
      driftStatus: upstream.driftStatus
    },
    badges: {
      total: resolvedBadges.length,
      freshness: badgeFreshness
    },
    launchEvidence: {
      total: launchEvidence.totalCases,
      freshness: launchEvidenceFreshness
    },
    driftStatus: {
      status: driftStatus.status,
      observedAt: driftStatus.observedAt,
      stale: driftStatus.freshness.stale,
      summary: driftStatus.summary
    },
    interpretation:
      "Unified trust-evidence freshness rollup. Aggregates the pinned upstream anchor, " +
      "verified-badge freshness, Launch Evidence freshness, and the aggregate Nockchain " +
      "drift status into one verdict. `overall` is drift-detected when upstream drift is " +
      "not in-sync, otherwise stale-evidence when any badge or Launch Evidence case is " +
      "pinned to an older commit, otherwise anchored. Informational watch surface; it never " +
      "publishes raw chain state or secrets.",
    links: {
      self: `${registryCanonicalBaseUrl}/api/trust/freshness`,
      badges: `${registryCanonicalBaseUrl}/api/trust/badges`,
      launchEvidence: `${registryCanonicalBaseUrl}/api/launch-evidence`,
      driftStatus: `${registryCanonicalBaseUrl}/api/nockchain/drift-status`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`
    }
  };
}
