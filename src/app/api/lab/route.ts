import { NextResponse } from "next/server";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";

export function GET() {
  return NextResponse.json({
    modules: labModules,
    phases: strategyPhases,
    parallelTracks
  });
}
