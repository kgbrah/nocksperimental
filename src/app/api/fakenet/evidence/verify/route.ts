import { NextResponse } from "next/server";
import { verifyLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const generatedAt = url.searchParams.get("generatedAt")?.trim() ?? "";
  const reportIds = collectReportIds(url);

  if (!generatedAt || reportIds.length === 0) {
    return NextResponse.json(
      { error: "Missing generatedAt or reportId query parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    verifyLocalFakenetEvidenceCapsule({
      generatedAt,
      reportIds,
      grpcEndpoint: url.searchParams.get("grpcEndpoint"),
      walletAddress: url.searchParams.get("walletAddress"),
      blockCommitment: url.searchParams.get("blockCommitment")
    })
  );
}

function collectReportIds(url: URL) {
  const repeated = url.searchParams.getAll("reportId");
  const csv = url.searchParams
    .get("reportIds")
    ?.split(",")
    .map((reportId) => reportId.trim())
    .filter(Boolean) ?? [];

  return Array.from(new Set([...repeated, ...csv].map((reportId) => reportId.trim()).filter(Boolean)));
}
