import { NextResponse } from "next/server";
import { sampleLabReport } from "@/lib/lab-report";

export function GET() {
  return NextResponse.json(sampleLabReport);
}
