import { NextResponse } from "next/server";
import { createNockchainBridgeTrace } from "@/lib/nockchain-bridge-trace";

export function GET() {
  return NextResponse.json(createNockchainBridgeTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
