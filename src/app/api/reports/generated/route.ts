import { NextResponse } from "next/server";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(loadGeneratedLabReports());
}
