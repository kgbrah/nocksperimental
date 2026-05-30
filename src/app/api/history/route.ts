import { NextResponse } from "next/server";
import { reportHistory, reportStages } from "@/lib/report-history";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: reportHistory.length,
    stages: reportStages,
    reports: reportHistory
  });
}
