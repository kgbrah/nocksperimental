import { NextResponse } from "next/server";
import { createGeneratedReportProvenance } from "@/lib/generated-report-provenance";

export const dynamic = "force-dynamic";

type GeneratedReportProvenanceRouteContext = {
  params: Promise<{
    appSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: GeneratedReportProvenanceRouteContext) {
  const { appSlug } = await params;
  const provenance = createGeneratedReportProvenance(appSlug);

  if (!provenance) {
    return NextResponse.json({ error: "Generated report not found", appSlug }, { status: 404 });
  }

  return NextResponse.json(provenance);
}
