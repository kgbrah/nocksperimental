import { NextResponse } from "next/server";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainStateJamRegistry());
}
