import { NextResponse } from "next/server";
import { scoreHistorySummariesForKind } from "@/lib/trust-score-history";
import { computeBenchmarkProfiles } from "@/lib/trust-signals";

export function GET() {
  const scoreHistories = scoreHistorySummariesForKind("compute-benchmark");

  return NextResponse.json({
    version: "v0",
    total: computeBenchmarkProfiles.length,
    computeBenchmarkProfiles,
    scoreHistories
  });
}
