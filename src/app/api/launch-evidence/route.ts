import { NextResponse } from "next/server";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";

export function GET() {
  return NextResponse.json(createLaunchEvidenceIndex());
}
