// Same-origin JSON-RPC proxy for Base Sepolia. The browser (wagmi) reads through
// here, so the dedicated RPC endpoint (Alchemy, configured server-side via the
// BASE_SEPOLIA_RPC_URL secret) stays hidden — it can't be scraped from the bundle
// or drained by third parties — and the app stops hammering the rate-limited
// public RPC. A read/broadcast method allowlist keeps the proxy from being used
// as an open relay for arbitrary upstream calls.

import { NextResponse } from "next/server";
import { rpcUrlFor } from "@/lib/base-rpc";

export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024;
const BASE_SEPOLIA = 84532;

// Read methods the dapp needs, plus eth_sendRawTransaction (broadcasting an
// already-signed tx is harmless — the wallet signs, this only relays bytes).
const ALLOWED = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getLogs",
  "eth_sendRawTransaction",
  "eth_subscribe",
  "eth_unsubscribe",
  "net_version",
  "web3_clientVersion",
]);

function methodAllowed(payload: unknown): boolean {
  const check = (m: unknown) => typeof m === "string" && ALLOWED.has(m);
  if (Array.isArray(payload)) return payload.every((p) => check((p as { method?: unknown })?.method));
  return check((payload as { method?: unknown })?.method);
}

export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > MAX_BODY) {
    return NextResponse.json({ error: "request too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid JSON-RPC body" }, { status: 400 });
  }
  if (!methodAllowed(parsed)) {
    return NextResponse.json({ error: "method not allowed" }, { status: 403 });
  }

  const upstream = rpcUrlFor(BASE_SEPOLIA);
  let res: Response;
  try {
    res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `upstream RPC unreachable: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
