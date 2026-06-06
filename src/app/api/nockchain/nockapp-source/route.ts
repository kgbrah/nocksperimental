import { NextResponse } from "next/server";
import { createNockchainNockAppSourceTrace } from "@/lib/nockchain-nockapp-source-trace";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainNockAppSourceTrace());
}
