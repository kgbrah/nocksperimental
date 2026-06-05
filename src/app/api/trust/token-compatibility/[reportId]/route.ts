import { NextResponse } from "next/server";
import {
  scoreHistoryForSignal,
  scoreHistorySummaryForSignal
} from "@/lib/trust-score-history";
import { tokenCompatibilityReports } from "@/lib/trust-signals";

type TokenCompatibilityRouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function GET(_request: Request, { params }: TokenCompatibilityRouteContext) {
  const { reportId } = await params;
  const report = tokenCompatibilityReports.find((candidate) => candidate.id === reportId);

  if (!report) {
    return NextResponse.json(
      { error: "Token compatibility report not found", reportId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    version: "v0",
    report,
    scoreHistory: scoreHistoryForSignal("token-compatibility", report.id) ?? null,
    scoreHistorySummary: scoreHistorySummaryForSignal("token-compatibility", report.id) ?? null,
    links: {
      collection: "/api/trust/token-compatibility",
      detail: `/trust/token-compatibility/${report.id}`,
      badge: `/trust/badges/${report.badgeId}`,
      generatedReport: `/reports/generated/${report.reportSlug}`,
      evidence: `/api/reports/generated/${report.reportSlug}/evidence`
    }
  });
}
