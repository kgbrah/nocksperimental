import { NextResponse } from "next/server";
import { createNockchainProtocolTrace } from "@/lib/nockchain-protocol-trace";

export function GET() {
  return NextResponse.json(createNockchainProtocolTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
