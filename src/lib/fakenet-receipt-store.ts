import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { FakenetEvidenceReceipt } from "@/lib/fakenet-evidence-submission";

export const fakenetReceiptBindingName = "NOCKS_FAKENET_RECEIPTS";

const receiptKeyPrefix = "fakenet:receipt:";
const memoryReceipts = new Map<string, PersistedFakenetEvidenceReceipt>();

type FakenetReceiptStorageBackend = "kv" | "memory";

type FakenetReceiptStorage = {
  persisted: boolean;
  backend: FakenetReceiptStorageBackend;
  binding: string;
  key: string | null;
  persistedAt: string | null;
};

export type PersistedFakenetEvidenceReceipt = FakenetEvidenceReceipt & {
  storage: FakenetReceiptStorage;
};

type FakenetReceiptListResult = {
  backend: FakenetReceiptStorageBackend;
  binding: string;
  receipts: PersistedFakenetEvidenceReceipt[];
};

type FakenetReceiptReadResult = {
  backend: FakenetReceiptStorageBackend;
  binding: string;
  receipt: PersistedFakenetEvidenceReceipt | null;
};

type FakenetReceiptStore = {
  backend: FakenetReceiptStorageBackend;
  get: (receiptId: string) => Promise<PersistedFakenetEvidenceReceipt | null>;
  list: (limit: number) => Promise<PersistedFakenetEvidenceReceipt[]>;
  put: (receipt: PersistedFakenetEvidenceReceipt) => Promise<void>;
};

type FakenetReceiptKvNamespace = {
  get: (key: string, options?: { type: "json" } | "json") => Promise<unknown>;
  list: (options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }) => Promise<{
    keys: Array<{ name: string }>;
    list_complete?: boolean;
    cursor?: string;
  }>;
  put: (key: string, value: string, options?: { metadata?: Record<string, unknown> }) => Promise<void>;
};

export async function persistFakenetEvidenceReceipt(receipt: FakenetEvidenceReceipt) {
  const store = await getFakenetReceiptStore();

  if (!receipt.accepted || !receipt.receiptId) {
    return withStorage(receipt, store.backend, null, null, false);
  }

  const persisted = withStorage(
    receipt,
    store.backend,
    createReceiptKey(receipt.receiptId),
    new Date().toISOString(),
    true
  );

  await store.put(persisted);

  return persisted;
}

export async function listFakenetEvidenceReceipts(limit = 25): Promise<FakenetReceiptListResult> {
  const store = await getFakenetReceiptStore();

  return {
    backend: store.backend,
    binding: fakenetReceiptBindingName,
    receipts: await store.list(normalizeLimit(limit))
  };
}

export async function readFakenetEvidenceReceipt(receiptId: string): Promise<FakenetReceiptReadResult> {
  const store = await getFakenetReceiptStore();

  return {
    backend: store.backend,
    binding: fakenetReceiptBindingName,
    receipt: await store.get(receiptId)
  };
}

async function getFakenetReceiptStore(): Promise<FakenetReceiptStore> {
  const kv = await getCloudflareKvNamespace();

  if (kv) {
    return createKvStore(kv);
  }

  return memoryStore;
}

async function getCloudflareKvNamespace() {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as Record<string, unknown>;
    const binding = env[fakenetReceiptBindingName];

    if (isKvNamespace(binding)) {
      return binding;
    }
  } catch {
    return null;
  }

  return null;
}

export function createKvStore(kv: FakenetReceiptKvNamespace): FakenetReceiptStore {
  return {
    backend: "kv",
    async get(receiptId) {
      return readKvReceipt(kv, createReceiptKey(receiptId));
    },
    async list(limit) {
      const keyNames = await listAllReceiptKeys(kv);
      const receipts = await Promise.all(keyNames.map((name) => readKvReceipt(kv, name)));

      return sortReceipts(receipts.filter((receipt): receipt is PersistedFakenetEvidenceReceipt => Boolean(receipt))).slice(
        0,
        limit
      );
    },
    async put(receipt) {
      if (!receipt.receiptId || !receipt.storage.key) {
        return;
      }

      await kv.put(receipt.storage.key, JSON.stringify(receipt), {
        metadata: {
          receiptId: receipt.receiptId,
          generatedAt: receipt.generatedAt,
          status: receipt.status,
          verified: receipt.verified
        }
      });
    }
  };
}

async function readKvReceipt(kv: FakenetReceiptKvNamespace, key: string) {
  const value = await kv.get(key, { type: "json" });

  if (isPersistedReceipt(value)) {
    return value;
  }

  return null;
}

// KV.list returns keys in lexicographic order, but receipt ids are not chronological,
// so fetching only `limit` keys returns an arbitrary (not most-recent) subset once more
// than `limit` receipts exist. Enumerate the whole prefix (cursor-paginated, capped) so
// the recency sort sees every receipt — matching the in-memory backend's behavior.
const maxScannedReceiptKeys = 5000;

async function listAllReceiptKeys(kv: FakenetReceiptKvNamespace): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await kv.list({ prefix: receiptKeyPrefix, limit: 1000, cursor });
    for (const key of page.keys) {
      names.push(key.name);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && names.length < maxScannedReceiptKeys);

  return names;
}

const memoryStore: FakenetReceiptStore = {
  backend: "memory",
  async get(receiptId) {
    return memoryReceipts.get(createReceiptKey(receiptId)) ?? null;
  },
  async list(limit) {
    return sortReceipts(Array.from(memoryReceipts.values())).slice(0, limit);
  },
  async put(receipt) {
    if (receipt.storage.key) {
      memoryReceipts.set(receipt.storage.key, receipt);
    }
  }
};

function withStorage(
  receipt: FakenetEvidenceReceipt,
  backend: FakenetReceiptStorageBackend,
  key: string | null,
  persistedAt: string | null,
  persisted: boolean
): PersistedFakenetEvidenceReceipt {
  return {
    ...receipt,
    storage: {
      persisted,
      backend,
      binding: fakenetReceiptBindingName,
      key,
      persistedAt
    }
  };
}

function createReceiptKey(receiptId: string) {
  return `${receiptKeyPrefix}${receiptId}`;
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 25;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function sortReceipts(receipts: PersistedFakenetEvidenceReceipt[]) {
  return [...receipts].sort((left, right) =>
    (right.storage.persistedAt ?? right.generatedAt).localeCompare(left.storage.persistedAt ?? left.generatedAt)
  );
}

function isKvNamespace(value: unknown): value is FakenetReceiptKvNamespace {
  return Boolean(
    value &&
      typeof value === "object" &&
      "get" in value &&
      "put" in value &&
      "list" in value
  );
}

function isPersistedReceipt(value: unknown): value is PersistedFakenetEvidenceReceipt {
  return Boolean(
    value &&
      typeof value === "object" &&
      "receiptId" in value &&
      "storage" in value &&
      "summary" in value
  );
}
