import { NextResponse } from "next/server";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createZorpUpstreamMap());
}
