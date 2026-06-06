import { NextResponse } from "next/server";
import { launchEvidenceCaseForId } from "@/lib/launch-evidence";

type LaunchEvidenceDetailRouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

export async function GET(_request: Request, { params }: LaunchEvidenceDetailRouteContext) {
  const { caseId } = await params;
  const launchCase = launchEvidenceCaseForId(caseId);

  if (!launchCase || launchCase.visibility === "private") {
    return NextResponse.json(
      {
        version: "v0",
        error: "Launch Evidence case not found.",
        caseId
      },
      { status: 404 }
    );
  }

  return NextResponse.json(launchCase);
}
