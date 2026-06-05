// Join a service to nocksperimental's trust registry. A listing counts as
// "verified" only when it is backed by a registry badge whose current status
// is "verified" (revocations downgrade it).

import { resolvedBadgeForId, badgeForReport } from "@/lib/trust-signals";
import type { ResolvedVerifiedBadge } from "@/lib/trust-signals";
import type { BazaarTrust } from "@/lib/bazaar/types";

export function trustFromBadgeId(
  badgeId: string | undefined,
  score: number | null = null,
  signals: string[] = []
): BazaarTrust {
  const badge = badgeId ? resolvedBadgeForId(badgeId) : undefined;
  return buildTrust(badge, badgeId ?? null, score, signals);
}

export function trustFromReport(
  reportSlug: string,
  fixtureId: string,
  score: number | null = null,
  signals: string[] = []
): BazaarTrust {
  const badge = badgeForReport(reportSlug, fixtureId);
  const resolved = badge ? resolvedBadgeForId(badge.id) : undefined;
  return buildTrust(resolved, badge?.id ?? null, score, signals);
}

function buildTrust(
  badge: ResolvedVerifiedBadge | undefined,
  badgeId: string | null,
  score: number | null,
  signals: string[]
): BazaarTrust {
  return {
    verified: Boolean(badge && badge.currentStatus === "verified"),
    badgeId: badge?.id ?? badgeId,
    badgeStatus: badge?.currentStatus ?? null,
    score,
    signals
  };
}
