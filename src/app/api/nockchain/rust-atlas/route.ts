import { NextResponse } from "next/server";
import { createNockchainRustAtlas } from "@/lib/nockchain-rust-atlas";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNockchainRustAtlas());
}
