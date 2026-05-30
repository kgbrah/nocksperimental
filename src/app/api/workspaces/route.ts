import { NextResponse } from "next/server";
import { privateWorkspaces, reportHistory, reportsForWorkspace } from "@/lib/report-history";

export function GET() {
  return NextResponse.json({
    version: "v0",
    total: privateWorkspaces.length,
    workspaces: privateWorkspaces.map((workspace) => ({
      ...workspace,
      reportCount: reportsForWorkspace(workspace.slug).length
    })),
    reportCount: reportHistory.length
  });
}
