import { NextResponse } from "next/server";
import {
  scoreHistoryForSignal,
  scoreHistorySummaryForSignal
} from "@/lib/trust-score-history";
import { solverScorecards } from "@/lib/trust-signals";

type SolverScoreRouteContext = {
  params: Promise<{
    scorecardId: string;
  }>;
};

export async function GET(_request: Request, { params }: SolverScoreRouteContext) {
  const { scorecardId } = await params;
  const scorecard = solverScorecards.find((candidate) => candidate.id === scorecardId);

  if (!scorecard) {
    return NextResponse.json(
      { error: "Solver scorecard not found", scorecardId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: "v0",
    scorecard,
    scoreHistory: scoreHistoryForSignal("solver-score", scorecard.id) ?? null,
    scoreHistorySummary: scoreHistorySummaryForSignal("solver-score", scorecard.id) ?? null,
    links: {
      collection: "/api/trust/solver-scores",
      detail: `/trust/solver-scores/${scorecard.id}`,
      generatedReport: `/reports/generated/${scorecard.reportSlug}`,
      evidence: `/api/reports/generated/${scorecard.reportSlug}/evidence`
    }
  });
}
