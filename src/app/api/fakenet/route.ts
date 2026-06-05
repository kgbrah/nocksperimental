import { NextResponse } from "next/server";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";

export function GET() {
  return NextResponse.json(createLocalFakenetReadiness());
}
