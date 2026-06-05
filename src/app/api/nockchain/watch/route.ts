import { NextResponse } from "next/server";
import { createNockchainWatchBoard } from "@/lib/nockchain-watch";

export function GET() {
  return NextResponse.json(createNockchainWatchBoard(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
