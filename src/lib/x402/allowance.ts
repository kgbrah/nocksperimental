// Free daily allowance so docs, demos, and agents can sample metered endpoints
// without paying. Best-effort per-client/day counter (KV is eventually
// consistent; an occasional extra free call is acceptable for a free tier).

import { getX402Kv } from "@/lib/x402/kv";

const ALLOWANCE_PREFIX = "x402:allowance:";
const TWO_DAYS_SECONDS = 60 * 60 * 48;
const memory = new Map<string, number>();

export interface AllowanceResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export function allowanceKey(clientKey: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return `${ALLOWANCE_PREFIX}${day}:${clientKey}`;
}

export async function consumeAllowance(
  clientKey: string,
  limit: number,
  now: Date = new Date()
): Promise<AllowanceResult> {
  if (limit <= 0) {
    return { allowed: false, used: 0, limit, remaining: 0 };
  }

  const key = allowanceKey(clientKey, now);
  const kv = await getX402Kv();
  const current = kv ? toCount(await kv.get(key, { type: "json" })) : memory.get(key) ?? 0;

  if (current >= limit) {
    return { allowed: false, used: current, limit, remaining: 0 };
  }

  const next = current + 1;
  if (kv) {
    await kv.put(key, JSON.stringify(next), { metadata: { count: next }, expirationTtl: TWO_DAYS_SECONDS });
  } else {
    memory.set(key, next);
  }

  return { allowed: true, used: next, limit, remaining: Math.max(limit - next, 0) };
}

/** Test helper: clear the in-memory allowance counters. */
export function __resetAllowanceForTest(): void {
  memory.clear();
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
