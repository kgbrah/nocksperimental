import { NextResponse } from "next/server";
import {
  privateWorkspaces,
  reportHistory,
  workspaceVerificationSummary
} from "@/lib/report-history";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: privateWorkspaces.length,
    workspaces: privateWorkspaces.map((workspace) => {
      const verification = workspaceVerificationSummary(workspace.slug);

      return {
        ...workspace,
        reportCount: verification.reportCount,
        verifiedReportCount: verification.verifiedReportCount,
        unlinkedReportCount: verification.unlinkedReportCount,
        verification
      };
    }),
    reportCount: reportHistory.length
  });
}
