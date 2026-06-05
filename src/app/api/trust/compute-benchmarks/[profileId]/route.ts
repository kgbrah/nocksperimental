import { NextResponse } from "next/server";
import {
  scoreHistoryForSignal,
  scoreHistorySummaryForSignal
} from "@/lib/trust-score-history";
import { computeBenchmarkProfiles } from "@/lib/trust-signals";

type ComputeBenchmarkRouteContext = {
  params: Promise<{
    profileId: string;
  }>;
};

export async function GET(_request: Request, { params }: ComputeBenchmarkRouteContext) {
  const { profileId } = await params;
  const profile = computeBenchmarkProfiles.find((candidate) => candidate.id === profileId);

  if (!profile) {
    return NextResponse.json(
      { error: "Compute benchmark profile not found", profileId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: "v0",
    profile,
    scoreHistory: scoreHistoryForSignal("compute-benchmark", profile.id) ?? null,
    scoreHistorySummary: scoreHistorySummaryForSignal("compute-benchmark", profile.id) ?? null,
    links: {
      collection: "/api/trust/compute-benchmarks",
      detail: `/trust/compute-benchmarks/${profile.id}`,
      badge: `/trust/badges/${profile.badgeId}`,
      generatedReport: `/reports/generated/${profile.benchmarkReportSlug}`,
      evidence: `/api/reports/generated/${profile.benchmarkReportSlug}/evidence`
    }
  });
}
