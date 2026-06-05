import { NextResponse } from "next/server";
import { verifyTrustUpdateEntry } from "@/lib/trust-update-verifier";

export function GET(request: Request) {
  const url = new URL(request.url);
  const updateId = url.searchParams.get("updateId")?.trim() ?? "";
  const entryHash = url.searchParams.get("entryHash")?.trim() ?? "";

  if (!updateId && !entryHash) {
    return NextResponse.json(
      { error: "Missing updateId or entryHash query parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    verifyTrustUpdateEntry({
      updateId,
      entryHash,
      rootHash: url.searchParams.get("rootHash"),
      signature: url.searchParams.get("signature"),
      issuerKeyId: url.searchParams.get("issuerKeyId")
    })
  );
}
