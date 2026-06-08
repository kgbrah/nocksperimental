import { NextResponse } from "next/server";
import { verifyTrustBadgeIssuance } from "@/lib/trust-badge-verifier";
import { restoreBase64QueryParam } from "@/lib/base64-query";
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
      // base64 signatures contain '+', which URL query decoding turns into a space;
      // restore it so the signature compare/verify works on the Worker runtime.
      signature: restoreBase64QueryParam(url.searchParams.get("signature")),
      issuerKeyId: url.searchParams.get("issuerKeyId")
    }),
    { headers: gate.headers }
  );
}
