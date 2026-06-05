import { NextResponse } from "next/server";
import { createNockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainUpstreamIntelligence());
}

