import { NextResponse } from "next/server";
import { createNockchainNockupSourceTrace } from "@/lib/nockchain-nockup-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainNockupSourceTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
