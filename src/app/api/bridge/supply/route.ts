import { NextResponse } from "next/server";
import { getBridgeSupply } from "@/lib/bridge-supply";

export const dynamic = "force-dynamic";

// Live supply metrics for our self-run testnet NOCK <-> tNOCK bridge + the conservation invariant.
// Base side is read live; Nockchain side comes from the audit snapshot. See bridge-supply.ts for the
// full "this is unofficial, we built & control it" disclosure (also returned in the payload).
export async function GET() {
  const supply = await getBridgeSupply();
  return NextResponse.json(supply, { headers: { "cache-control": "no-store" } });
}
