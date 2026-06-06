import { NextResponse } from "next/server";
import { createNockchainImpactQueue } from "@/lib/nockchain-impact-queue";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainImpactQueue());
}
