import { NextResponse } from "next/server";
import { openRound } from "@/lib/flip-house";
import type { FlipAsset } from "@/lib/game-contracts";

export const dynamic = "force-dynamic";

function parseAsset(v: unknown): FlipAsset {
  return v === "tnock" ? "tnock" : "eth";
}

// House opens a fresh round (commits a derived serverSeed) so a player can play it. The house signs +
// pays gas; no funds move until a player stakes. The `asset` body field selects the ETH or tNOCK game.
// (Open is the only operator action a client can trigger; reveal happens after a play. On testnet,
// opening is best-effort — a managed pool/rate-limit is a production follow-up.)
export async function POST(request: Request) {
  let asset: FlipAsset = "eth";
  try {
    const body = (await request.json()) as { asset?: unknown };
    asset = parseAsset(body?.asset);
  } catch {
    /* no body -> default to eth */
  }
  const result = await openRound(asset);
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
