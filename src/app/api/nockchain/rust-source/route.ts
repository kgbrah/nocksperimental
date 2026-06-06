import { NextResponse } from "next/server";
import { createNockchainRustSourceGuide } from "@/lib/nockchain-rust-source-guide";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainRustSourceGuide());
}
