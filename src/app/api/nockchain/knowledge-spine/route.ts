import { NextResponse } from "next/server";
import { createNockchainKnowledgeSpine } from "@/lib/nockchain-knowledge-spine";

export function GET() {
  return NextResponse.json(createNockchainKnowledgeSpine());
}
