import { NextResponse } from "next/server";
import { createNockchainDocsAtlas } from "@/lib/nockchain-docs-atlas";

export function GET() {
  return NextResponse.json(createNockchainDocsAtlas());
}
