import { NextResponse } from "next/server";
import { createGeneratedReportEvidenceBundle } from "@/lib/generated-report-evidence";

export const dynamic = "force-dynamic";

type GeneratedReportEvidenceRouteContext = {
  params: Promise<{
    appSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: GeneratedReportEvidenceRouteContext) {
  const { appSlug } = await params;
  const evidence = createGeneratedReportEvidenceBundle(appSlug);

  if (!evidence) {
    return NextResponse.json({ error: "Generated report not found", appSlug }, { status: 404 });
  }

  return NextResponse.json(evidence);
}
