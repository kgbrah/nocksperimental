import { NextResponse } from "next/server";
import { scoreHistorySummariesForKind } from "@/lib/trust-score-history";
import { solverScorecards } from "@/lib/trust-signals";

export function GET() {
  const scoreHistories = scoreHistorySummariesForKind("solver-score");

  return NextResponse.json({
    version: "v0",
    total: solverScorecards.length,
    solverScorecards,
    scoreHistories
  });
}
