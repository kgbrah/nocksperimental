import { NextResponse } from "next/server";
import { createLocalFakenetCommandKit } from "@/lib/local-fakenet-commands";

export function GET() {
  return NextResponse.json(createLocalFakenetCommandKit());
}
