import { NextResponse } from "next/server";
import { createNockchainReleaseAssets } from "@/lib/nockchain-release-assets";

export function GET() {
  return NextResponse.json(createNockchainReleaseAssets());
}
