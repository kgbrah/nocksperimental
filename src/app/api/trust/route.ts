import { NextResponse } from "next/server";
import { trustSignals } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    ...trustSignals,
    counts: {
      badges: trustSignals.verifiedBadges.length,
      solverScorecards: trustSignals.solverScorecards.length,
      tokenCompatibilityReports: trustSignals.tokenCompatibilityReports.length,
      computeBenchmarkProfiles: trustSignals.computeBenchmarkProfiles.length,
      trustConsumers: trustSignals.trustConsumers.length
    }
  });
}
