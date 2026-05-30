import { NextResponse } from "next/server";
import { invariantCatalog, sampleLabReport } from "@/lib/lab-report";
import { privateWorkspaces, reportHistory } from "@/lib/report-history";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";
import { trustSignals } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    modules: labModules,
    phases: strategyPhases,
    parallelTracks,
    invariantCatalog: {
      version: "v0",
      items: invariantCatalog
    },
    reportHistory,
    privateWorkspaces,
    trustSignals,
    sampleReport: sampleLabReport
  });
}
