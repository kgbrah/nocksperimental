import { NextResponse } from "next/server";
import { createWorkspaceUploadPolicy } from "@/lib/workspace-upload-policy";

export const dynamic = "force-dynamic";

type WorkspaceUploadPolicyRouteContext = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: WorkspaceUploadPolicyRouteContext) {
  const { workspaceSlug } = await params;
  const policy = createWorkspaceUploadPolicy(workspaceSlug);

  if (!policy) {
    return NextResponse.json({ error: "Workspace not found", workspaceSlug }, { status: 404 });
  }

  return NextResponse.json(policy);
}
