import { NextResponse } from "next/server";
import { createNockchainBridgeSourceTrace } from "@/lib/nockchain-bridge-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainBridgeSourceTrace());
}
