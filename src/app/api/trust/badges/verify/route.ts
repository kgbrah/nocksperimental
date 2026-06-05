import { NextResponse } from "next/server";
import { verifyTrustBadgeIssuance } from "@/lib/trust-badge-verifier";
import { guard } from "@/lib/x402/meter";

export async function GET(request: Request) {
  const gate = await guard(request, "badge-verify");
  if (gate.blocked) {
    return gate.response;
  }

  const url = new URL(request.url);
  const badgeId = url.searchParams.get("badgeId")?.trim() ?? "";
  const payloadDigest = url.searchParams.get("payloadDigest")?.trim() ?? "";

  if (!badgeId && !payloadDigest) {
    return NextResponse.json(
      { error: "Missing badgeId or payloadDigest query parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    verifyTrustBadgeIssuance({
      badgeId,
      payloadDigest,
      signature: url.searchParams.get("signature"),
      issuerKeyId: url.searchParams.get("issuerKeyId")
    }),
    { headers: gate.headers }
  );
}
