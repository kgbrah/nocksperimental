import { NextResponse } from "next/server";
import { verifyGeneratedReportEvidence } from "@/lib/generated-report-verifier";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const reportHash = url.searchParams.get("reportHash")?.trim() ?? "";

  if (!reportHash) {
    return NextResponse.json({ error: "Missing reportHash query parameter" }, { status: 400 });
  }

  return NextResponse.json(
    verifyGeneratedReportEvidence({
      reportHash,
      snapshotRoot: url.searchParams.get("snapshotRoot"),
      appSlug: url.searchParams.get("appSlug")
    })
  );
}
