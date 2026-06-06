import { NextResponse } from "next/server";
import { createNockchainDriftStatus } from "@/lib/nockchain-drift-status";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainDriftStatus(), {
    headers: {
      "Cache-Control": "public, max-age=60"
    }
  });
}
