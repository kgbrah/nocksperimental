import { NextResponse } from "next/server";
import { createNockchainSyncGossipTrace } from "@/lib/nockchain-sync-gossip-trace";

export function GET() {
  return NextResponse.json(createNockchainSyncGossipTrace(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
