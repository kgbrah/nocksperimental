import { NextResponse } from "next/server";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";

export function GET() {
  return NextResponse.json(createLocalFakenetEvidenceCapsule());
}
