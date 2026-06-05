import { NextResponse } from "next/server";
import { verifyWorkspaceEvidenceCapsule } from "@/lib/workspace-evidence";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceSlug = url.searchParams.get("workspaceSlug")?.trim() ?? "";
  const reportIds = collectValues(url, "reportId", "reportIds");

  if (!workspaceSlug || reportIds.length === 0) {
    return NextResponse.json(
      { error: "Missing workspaceSlug or reportId query parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    verifyWorkspaceEvidenceCapsule({
      workspaceSlug,
      reportIds,
      badgeIds: collectValues(url, "badgeId", "badgeIds"),
      latestSnapshotRoot: url.searchParams.get("latestSnapshotRoot")
    })
  );
}

function collectValues(url: URL, repeatedName: string, csvName: string) {
  const repeated = url.searchParams.getAll(repeatedName);
  const csv = url.searchParams
    .get(csvName)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

  return Array.from(new Set([...repeated, ...csv].map((value) => value.trim()).filter(Boolean)));
}
