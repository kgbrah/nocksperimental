import { NextResponse } from "next/server";
import { verifiedBadges } from "@/lib/trust-signals";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: verifiedBadges.length,
    badges: verifiedBadges
  });
}
