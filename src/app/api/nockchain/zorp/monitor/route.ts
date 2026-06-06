import { NextResponse } from "next/server";
import { createZorpMonitorRunbook } from "@/lib/zorp-monitor-runbook";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(createZorpMonitorRunbook(), {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
