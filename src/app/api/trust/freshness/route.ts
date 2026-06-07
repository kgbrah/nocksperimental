import { NextResponse } from "next/server";
import { createTrustFreshnessRollup } from "@/lib/trust-freshness";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createTrustFreshnessRollup(), {
    headers: {
      "Cache-Control": "public, max-age=60"
    }
  });
}
