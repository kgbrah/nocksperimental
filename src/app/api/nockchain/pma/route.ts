import { NextResponse } from "next/server";
import { createNockchainPmaSourceTrace } from "@/lib/nockchain-pma-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainPmaSourceTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
