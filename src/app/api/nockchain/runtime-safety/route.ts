import { NextResponse } from "next/server";
import { createNockchainRuntimeSafetyTrace } from "@/lib/nockchain-runtime-safety";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainRuntimeSafetyTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
