import { NextResponse } from "next/server";
import { computeBenchmarkProfiles } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: computeBenchmarkProfiles.length,
    computeBenchmarkProfiles
  });
}
