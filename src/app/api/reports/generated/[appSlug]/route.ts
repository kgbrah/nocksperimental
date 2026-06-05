import { NextResponse } from "next/server";
import { loadGeneratedLabReport } from "@/lib/generated-lab-reports";

export const dynamic = "force-dynamic";

type GeneratedReportRouteContext = {
  params: Promise<{
    appSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: GeneratedReportRouteContext) {
  const { appSlug } = await params;
  const detail = loadGeneratedLabReport({ appSlug });

  if (!detail) {
    return NextResponse.json({ error: "Generated report not found", appSlug }, { status: 404 });
  }

  return NextResponse.json(detail);
}
