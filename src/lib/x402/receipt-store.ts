// Payment receipts double as the replay-protection set: a receipt is keyed by
// its payment nonce, so "have we seen this nonce" is "does a receipt exist".
// KV-backed in the Worker, in-memory otherwise (mirrors fakenet-receipt-store).

import { getX402Kv } from "@/lib/x402/kv";

const RECEIPT_PREFIX = "x402:receipt:";
const memory = new Map<string, X402Receipt>();

export interface X402Receipt {
  nonce: string;
  payer: string | null;
  to: string;
  amountNicks: string;
  network: string;
  resource: string;
  mode: "stub" | "facilitator";
  txId?: string | null;
  generatedAt: string;
}

export async function findReceiptByNonce(nonce: string): Promise<X402Receipt | null> {
  const key = receiptKey(nonce);
  const kv = await getX402Kv();

  if (kv) {
    const value = await kv.get(key, { type: "json" });
    return isReceipt(value) ? value : null;
  }

  return memory.get(key) ?? null;
}

export async function recordReceipt(receipt: X402Receipt): Promise<void> {
  const key = receiptKey(receipt.nonce);
  const kv = await getX402Kv();

  if (kv) {
    await kv.put(key, JSON.stringify(receipt), {
      metadata: { nonce: receipt.nonce, mode: receipt.mode, amountNicks: receipt.amountNicks }
    });
    return;
  }

  memory.set(key, receipt);
}

export async function listReceipts(limit = 25): Promise<X402Receipt[]> {
  const kv = await getX402Kv();

  if (kv) {
    const listing = await kv.list({ prefix: RECEIPT_PREFIX, limit: clampLimit(limit) });
    const receipts = await Promise.all(listing.keys.map((entry) => readKvReceipt(kv, entry.name)));
    return sortReceipts(receipts.filter((receipt): receipt is X402Receipt => Boolean(receipt))).slice(0, limit);
  }

  return sortReceipts(Array.from(memory.values())).slice(0, limit);
}

/** Test helper: clear the in-memory replay/receipt set. */
export function __resetReceiptsForTest(): void {
  memory.clear();
}

async function readKvReceipt(kv: NonNullable<Awaited<ReturnType<typeof getX402Kv>>>, key: string) {
  const value = await kv.get(key, { type: "json" });
  return isReceipt(value) ? value : null;
}

function receiptKey(nonce: string): string {
  return `${RECEIPT_PREFIX}${nonce}`;
}

function clampLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit), 1), 1000);
}

function sortReceipts(receipts: X402Receipt[]): X402Receipt[] {
  return [...receipts].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
}

function isReceipt(value: unknown): value is X402Receipt {
  return Boolean(
    value && typeof value === "object" && "nonce" in value && "mode" in value && "generatedAt" in value
  );
}
