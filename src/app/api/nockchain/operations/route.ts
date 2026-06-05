import { NextResponse } from "next/server";
import { createNockchainOperationsAtlas } from "@/lib/nockchain-operations-atlas";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainOperationsAtlas());
}
