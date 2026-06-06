import { NextResponse } from "next/server";
import { createNockchainCargoSurface } from "@/lib/nockchain-cargo-surface";

export function GET() {
  return NextResponse.json(createNockchainCargoSurface());
}
