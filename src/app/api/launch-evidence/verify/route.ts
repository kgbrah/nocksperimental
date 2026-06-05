import { NextResponse } from "next/server";
import { verifyLaunchEvidenceReport } from "@/lib/launch-evidence";

export function GET(request: Request) {
  const url = new URL(request.url);
  const verification = verifyLaunchEvidenceReport({
    caseId: url.searchParams.get("caseId"),
    reportHash: url.searchParams.get("reportHash"),
    snapshotRoot: url.searchParams.get("snapshotRoot")
  });

  return NextResponse.json(verification, {
    status: verification.verified ? 200 : 404
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const verification = verifyLaunchEvidenceReport({
    caseId: body.caseId,
    reportHash: body.reportHash,
    snapshotRoot: body.snapshotRoot
  });

  return NextResponse.json(verification);
}
