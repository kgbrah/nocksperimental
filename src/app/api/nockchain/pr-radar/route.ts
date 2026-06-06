import { NextResponse } from "next/server";
import { createNockchainPrRadar } from "@/lib/nockchain-pr-radar";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainPrRadar());
}
