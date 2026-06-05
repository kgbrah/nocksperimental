import { NextResponse } from "next/server";
import { verifyWorkspaceUploadToken } from "@/lib/workspace-upload-token";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);

  return NextResponse.json(
    verifyWorkspaceUploadToken({
      token: url.searchParams.get("token")
    })
  );
}
