import { NextResponse } from "next/server";
import { readFlipState } from "@/lib/flip-house";

export const dynamic = "force-dynamic";

// Public game config + live bankroll/nextRoundId (read-only; no key).
export async function GET() {
  const state = await readFlipState();
  return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
}
