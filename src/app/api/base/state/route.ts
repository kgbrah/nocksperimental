import { NextResponse } from "next/server";
import { readBridgeStatus } from "@/lib/base-bridge";
import { DEFAULT_CHAIN_ID, ENABLED_CHAIN_IDS } from "@/lib/networks";

export const dynamic = "force-dynamic";

// Live, read-only Base bridge status proxied server-side (the RPC URL never reaches the browser).
// Only ENABLED (testnet) chains are exposed — the gated mainnet read is not served yet.
export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("chainId") ?? DEFAULT_CHAIN_ID);
  const chainId = ENABLED_CHAIN_IDS.includes(requested) ? requested : DEFAULT_CHAIN_ID;
  const status = await readBridgeStatus(chainId);
  return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
}
