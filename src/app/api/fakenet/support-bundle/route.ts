import { NextResponse } from "next/server";
import { createLocalFakenetSupportBundle } from "@/lib/local-fakenet-support-bundle";

export function GET() {
  return NextResponse.json(createLocalFakenetSupportBundle());
}
