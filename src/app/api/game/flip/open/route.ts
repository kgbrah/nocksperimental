import { NextResponse } from "next/server";
import { openRound } from "@/lib/flip-house";

export const dynamic = "force-dynamic";

// House opens a fresh round (commits a derived serverSeed) so a player can play it. The house signs +
// pays gas; no funds move until a player stakes. (Open is the only operator action a client can trigger;
// reveal happens after a play. On testnet, opening is best-effort — a managed pool/rate-limit is a
// production follow-up.)
export async function POST() {
  const result = await openRound();
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
