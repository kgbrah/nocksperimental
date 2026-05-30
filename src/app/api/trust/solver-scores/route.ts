import { NextResponse } from "next/server";
import { solverScorecards } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: solverScorecards.length,
    solverScorecards
  });
}
