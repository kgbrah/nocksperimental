import { NextResponse } from "next/server";
import { readFlipState } from "@/lib/flip-house";
import type { FlipAsset } from "@/lib/game-contracts";

export const dynamic = "force-dynamic";

// Public game config + live bankroll/nextRoundId (read-only; no key). `?asset=eth|tnock` selects the game.
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("asset");
  const asset: FlipAsset = param === "tnock" ? "tnock" : "eth";
  const state = await readFlipState(asset);
  return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
}
