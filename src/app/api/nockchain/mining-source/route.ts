import { NextResponse } from "next/server";
import { createNockchainMiningSourceTrace } from "@/lib/nockchain-mining-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainMiningSourceTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
