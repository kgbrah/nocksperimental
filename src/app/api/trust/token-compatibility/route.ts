import { NextResponse } from "next/server";
import { tokenCompatibilityReports } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: tokenCompatibilityReports.length,
    tokenCompatibilityReports
  });
}
