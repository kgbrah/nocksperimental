import { NextResponse } from "next/server";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";

export function GET() {
  const index = createLaunchEvidenceIndex();
  const publicCases = index.cases.filter((launchCase) => launchCase.visibility !== "private");

  return NextResponse.json({
    ...index,
    totalCases: publicCases.length,
    totalReports: publicCases.length,
    totals: {
      verified: publicCases.filter((entry) => entry.report.summaryStatus === "verified").length,
      watch: publicCases.filter((entry) => entry.report.summaryStatus === "watch").length,
      blocked: publicCases.filter((entry) => entry.report.summaryStatus === "blocked").length,
      builderAuditor: publicCases.filter((entry) => entry.customerLane === "builder-auditor").length,
      operator: publicCases.filter((entry) => entry.customerLane === "operator").length,
      integrator: publicCases.filter((entry) => entry.customerLane === "integrator").length
    },
    cases: publicCases
  });
}
