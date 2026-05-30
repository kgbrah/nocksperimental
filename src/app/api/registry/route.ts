import { NextResponse } from "next/server";
import { invariantCatalog, sampleLabReport } from "@/lib/lab-report";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";

export function GET() {
  return NextResponse.json({
    modules: labModules,
    phases: strategyPhases,
    parallelTracks,
    invariantCatalog: {
      version: "v0",
      items: invariantCatalog
    },
    sampleReport: sampleLabReport
  });
}
