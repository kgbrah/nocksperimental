import { NextResponse } from "next/server";
import { createNockchainNockAppAtlas } from "@/lib/nockchain-nockapp-atlas";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainNockAppAtlas());
}
