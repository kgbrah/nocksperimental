import { NextResponse } from "next/server";
import { verifyGeneratedReportEvidence } from "@/lib/generated-report-verifier";
import { guard } from "@/lib/x402/meter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await guard(request, "generated-report-verify");
  if (gate.blocked) {
    return gate.response;
  }

  const url = new URL(request.url);
  const reportHash = url.searchParams.get("reportHash")?.trim() ?? "";

  if (!reportHash) {
    return NextResponse.json({ error: "Missing reportHash query parameter" }, { status: 400 });
  }

  return NextResponse.json(
    verifyGeneratedReportEvidence({
      reportHash,
      snapshotRoot: url.searchParams.get("snapshotRoot"),
      appSlug: url.searchParams.get("appSlug")
    }),
    { headers: gate.headers }
  );
}
