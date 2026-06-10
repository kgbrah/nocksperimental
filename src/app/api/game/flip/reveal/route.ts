import { NextResponse } from "next/server";
import { revealRound } from "@/lib/flip-house";
import type { FlipAsset } from "@/lib/game-contracts";

export const dynamic = "force-dynamic";

// Trigger settlement of a Played round. Safe + idempotent: the house re-derives the serverSeed, verifies
// it against the on-chain commit, and only reveals a round that is awaiting reveal. Callable by anyone —
// the outcome is already fixed, so triggering settlement cannot be abused. `asset` selects ETH/tNOCK game.
export async function POST(request: Request) {
  let roundId: bigint;
  let asset: FlipAsset = "eth";
  try {
    const body = (await request.json()) as { roundId?: string | number; asset?: unknown };
    if (body.roundId == null) return NextResponse.json({ ok: false, error: "roundId required" }, { status: 400 });
    roundId = BigInt(body.roundId);
    asset = body.asset === "tnock" ? "tnock" : "eth";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const result = await revealRound(roundId, asset);
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
