import { NextResponse } from "next/server";
import { createNockchainTestkitE2eTrace } from "@/lib/nockchain-testkit-e2e-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainTestkitE2eTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
