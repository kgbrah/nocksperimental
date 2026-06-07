#!/usr/bin/env node

// Regression test for the KV receipt-list recency bug: KV.list returns keys in
// lexicographic order, but receipt ids are not chronological. Fetching only `limit`
// keys therefore returned an arbitrary (oldest-by-key, not most-recent) subset once
// more than `limit` receipts existed. The fix enumerates the whole prefix (paginated)
// before sorting by recency and slicing — matching the in-memory backend. This test
// drives createKvStore for all three near-identical stores with a fake KV whose
// lexicographic key order is the INVERSE of recency, so the bug would be caught.

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-receipt-store-kv-recency", async () => {
  const stores = [
    { name: "fakenet", path: "src/lib/fakenet-receipt-store.ts", prefix: "fakenet:receipt:" },
    { name: "vesl", path: "src/lib/vesl-receipt-store.ts", prefix: "vesl:receipt:" },
    { name: "nockup", path: "src/lib/nockup-receipt-store.ts", prefix: "nockup:receipt:" }
  ];

  for (const store of stores) {
    const { createKvStore } = loadTs(store.path);
    assertEqual(typeof createKvStore, "function", `${store.name}: createKvStore exported`);

    // 50 receipts. Key r-000 is lexicographically first but OLDEST; r-049 is
    // lexicographically last but NEWEST (persistedAt second = index).
    const TOTAL = 50;
    const LIMIT = 10;
    const receipts = new Map();
    for (let i = 0; i < TOTAL; i += 1) {
      const id = `r-${String(i).padStart(3, "0")}`;
      const key = `${store.prefix}${id}`;
      const persistedAt = `2030-01-01T00:00:${String(i).padStart(2, "0")}.000Z`;
      receipts.set(key, {
        receiptId: id,
        summary: { status: "verified" },
        report: { id }, // vesl predicate requires `report`
        nockup: { id }, // nockup predicate requires `nockup`
        generatedAt: persistedAt,
        storage: { persisted: true, backend: "kv", binding: "X", key, persistedAt }
      });
    }

    const fakeKv = makeFakeKv(receipts);
    const kvStore = createKvStore(fakeKv);
    assertEqual(kvStore.backend, "kv", `${store.name}: store reports kv backend`);

    const listed = await kvStore.list(LIMIT);

    assertEqual(listed.length, LIMIT, `${store.name}: returns exactly limit receipts`);
    // Most-recent first (sorted descending by persistedAt), NOT lexicographically-first.
    assertEqual(listed[0].receiptId, "r-049", `${store.name}: newest receipt first`);
    assertEqual(listed[LIMIT - 1].receiptId, "r-040", `${store.name}: tenth-newest last`);
    const ids = listed.map((receipt) => receipt.receiptId);
    assert(!ids.includes("r-000"), `${store.name}: oldest (lexicographically-first) receipt excluded`);

    // The whole prefix must have been enumerated (proves the single-page cap is gone).
    assert(fakeKv.scannedKeyCount >= TOTAL, `${store.name}: enumerated the full prefix (${fakeKv.scannedKeyCount} keys)`);
  }
});

// Minimal KV namespace fake: keys are returned in lexicographic order (like real
// Workers KV), honoring prefix/limit/cursor pagination so the store's enumeration
// loop is genuinely exercised.
function makeFakeKv(receipts) {
  const sortedKeys = [...receipts.keys()].sort();
  const fake = {
    scannedKeyCount: 0,
    async get(key) {
      return receipts.get(key) ?? null;
    },
    async list(options = {}) {
      const { prefix = "", limit = 1000, cursor } = options;
      const matching = sortedKeys.filter((key) => key.startsWith(prefix));
      const start = cursor ? Number(cursor) : 0;
      const page = matching.slice(start, start + limit);
      fake.scannedKeyCount += page.length;
      const nextStart = start + page.length;
      const complete = nextStart >= matching.length;
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete ? undefined : String(nextStart)
      };
    },
    async put() {}
  };
  return fake;
}
