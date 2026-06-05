import { NextResponse } from "next/server";
import { createNockchainWalletAtlas } from "@/lib/nockchain-wallet-atlas";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainWalletAtlas());
}
