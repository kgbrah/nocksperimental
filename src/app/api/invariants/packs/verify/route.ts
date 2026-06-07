import { NextResponse } from "next/server";
import { verifyInvariantPack } from "@/lib/invariant-pack-verifier";
import { guard } from "@/lib/x402/meter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await guard(request, "invariant-pack-report-verify");
  if (gate.blocked) {
    return gate.response;
  }

  const url = new URL(request.url);
  const packId = url.searchParams.get("packId")?.trim() ?? "";

  if (!packId) {
    return NextResponse.json({ error: "Missing packId query parameter" }, { status: 400 });
  }

  const result = verifyInvariantPack({
    packId,
    packHash: url.searchParams.get("packHash")
  });

  return NextResponse.json(result, {
    status: result.checks.packFound ? 200 : 404,
    headers: gate.headers
  });
}
