import { NextResponse } from "next/server";
import { scoreHistorySummariesForKind } from "@/lib/trust-score-history";
import { tokenCompatibilityReports } from "@/lib/trust-signals";

export function GET() {
  const scoreHistories = scoreHistorySummariesForKind("token-compatibility");

  return NextResponse.json({
    version: "v0",
    total: tokenCompatibilityReports.length,
    tokenCompatibilityReports,
    scoreHistories
  });
}
