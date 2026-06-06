import { NextResponse } from "next/server";
import { createNockchainApiSourceTrace } from "@/lib/nockchain-api-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainApiSourceTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
