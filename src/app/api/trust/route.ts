import { NextResponse } from "next/server";
import { scoreHistoryRegistry, scoreHistorySummaries } from "@/lib/trust-score-history";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import {
  badgeIssuanceReceipts,
  badgeRevocations,
  resolvedBadges,
  resolvedTrustConsumers,
  trustSignals
} from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    ...trustSignals,
    badgeIssuanceReceipts,
    badgeRevocations,
    resolvedBadges,
    resolvedTrustConsumers,
    scoreHistory: {
      storage: scoreHistoryRegistry.storage,
      summaries: scoreHistorySummaries
    },
    updateLog: trustUpdateChainSummary,
    counts: {
      badges: trustSignals.verifiedBadges.length,
      badgeIssuanceReceipts: badgeIssuanceReceipts.length,
      badgeRevocations: badgeRevocations.length,
      resolvedBadges: resolvedBadges.length,
      scoreHistories: scoreHistorySummaries.length,
      trustUpdates: trustUpdateChainSummary.entryCount,
      solverScorecards: trustSignals.solverScorecards.length,
      tokenCompatibilityReports: trustSignals.tokenCompatibilityReports.length,
      computeBenchmarkProfiles: trustSignals.computeBenchmarkProfiles.length,
      trustConsumers: trustSignals.trustConsumers.length,
      resolvedTrustConsumers: resolvedTrustConsumers.length
    }
  });
}
