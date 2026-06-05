import { NextResponse } from "next/server";
import { createWorkspaceEvidenceCapsule } from "@/lib/workspace-evidence";

export const dynamic = "force-dynamic";

type WorkspaceEvidenceRouteContext = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: WorkspaceEvidenceRouteContext) {
  const { workspaceSlug } = await params;
  const evidence = createWorkspaceEvidenceCapsule(workspaceSlug);

  if (!evidence) {
    return NextResponse.json({ error: "Workspace not found", workspaceSlug }, { status: 404 });
  }

  return NextResponse.json(evidence);
}
