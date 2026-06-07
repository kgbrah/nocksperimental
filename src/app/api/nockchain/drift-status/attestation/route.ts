import { NextResponse } from "next/server";
import { createNockchainDriftAttestation } from "@/lib/nockchain-drift-attestation";
import { guard } from "@/lib/x402/meter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await guard(request, "drift-status-attestation");
  if (gate.blocked) {
    return gate.response;
  }

  return NextResponse.json(createNockchainDriftAttestation(), {
    headers: gate.headers
  });
}
