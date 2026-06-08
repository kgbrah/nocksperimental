import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { VeslEvidenceReceipt } from "@/lib/vesl-evidence-submission";

export const veslReceiptBindingName = "NOCKS_VESL_RECEIPTS";

const receiptKeyPrefix = "vesl:receipt:";
const memoryReceipts = new Map<string, PersistedVeslEvidenceReceipt>();

type VeslReceiptStorageBackend = "kv" | "memory";

type VeslReceiptStorage = {
  persisted: boolean;
  backend: VeslReceiptStorageBackend;
  binding: string;
  key: string | null;
  persistedAt: string | null;
};

export type PersistedVeslEvidenceReceipt = VeslEvidenceReceipt & {
  storage: VeslReceiptStorage;
};

type VeslReceiptStore = {
  backend: VeslReceiptStorageBackend;
  get: (receiptId: string) => Promise<PersistedVeslEvidenceReceipt | null>;
  list: (limit: number) => Promise<PersistedVeslEvidenceReceipt[]>;
  // Returns the EFFECTIVE stored receipt: the new one when created, or the existing
  // one when a receipt already occupies the key (create-only — see put impls).
  put: (receipt: PersistedVeslEvidenceReceipt) => Promise<PersistedVeslEvidenceReceipt>;
};

type VeslReceiptKvNamespace = {
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

export async function persistVeslEvidenceReceipt(receipt: VeslEvidenceReceipt) {
  const store = await getVeslReceiptStore();

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

  // store.put is create-only and returns the effective stored receipt: the existing
  // one if this key is already taken (so a colliding/forged submission cannot clobber
  // another submitter's signed receipt), otherwise the freshly-created one.
  return store.put(persisted);
}

export async function listVeslEvidenceReceipts(limit = 25) {
  const store = await getVeslReceiptStore();

  return {
    backend: store.backend,
    binding: veslReceiptBindingName,
    receipts: await store.list(normalizeLimit(limit))
  };
}

export async function readVeslEvidenceReceipt(receiptId: string) {
  const store = await getVeslReceiptStore();

  return {
    backend: store.backend,
    binding: veslReceiptBindingName,
    receipt: await store.get(receiptId)
  };
}

async function getVeslReceiptStore(): Promise<VeslReceiptStore> {
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
    const binding = env[veslReceiptBindingName];

    if (isKvNamespace(binding)) {
      return binding;
    }
  } catch {
    return null;
  }

  return null;
}

export function createKvStore(kv: VeslReceiptKvNamespace): VeslReceiptStore {
  return {
    backend: "kv",
    async get(receiptId) {
      return readKvReceipt(kv, createReceiptKey(receiptId));
    },
    async list(limit) {
      const keyNames = await listAllReceiptKeys(kv);
      const receipts = await Promise.all(keyNames.map((name) => readKvReceipt(kv, name)));

      return sortReceipts(receipts.filter((receipt): receipt is PersistedVeslEvidenceReceipt => Boolean(receipt))).slice(
        0,
        limit
      );
    },
    async put(receipt) {
      if (!receipt.receiptId || !receipt.storage.key) {
        return receipt;
      }

      // Create-only: receipts are immutable once persisted. A different submitter (or
      // a receiptId hash collision) that lands on an existing key must NOT overwrite
      // the stored, signed receipt — return the existing one so the first write wins.
      const existing = await readKvReceipt(kv, receipt.storage.key);
      if (existing) {
        return existing;
      }

      await kv.put(receipt.storage.key, JSON.stringify(receipt), {
        metadata: {
          receiptId: receipt.receiptId,
          generatedAt: receipt.generatedAt,
          status: receipt.status,
          verified: receipt.verified
        }
      });

      return receipt;
    }
  };
}

async function readKvReceipt(kv: VeslReceiptKvNamespace, key: string) {
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

async function listAllReceiptKeys(kv: VeslReceiptKvNamespace): Promise<string[]> {
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

const memoryStore: VeslReceiptStore = {
  backend: "memory",
  async get(receiptId) {
    return memoryReceipts.get(createReceiptKey(receiptId)) ?? null;
  },
  async list(limit) {
    return sortReceipts(Array.from(memoryReceipts.values())).slice(0, limit);
  },
  async put(receipt) {
    if (!receipt.storage.key) {
      return receipt;
    }

    // Create-only: never overwrite an existing receipt (see the KV store above).
    const existing = memoryReceipts.get(receipt.storage.key);
    if (existing) {
      return existing;
    }

    memoryReceipts.set(receipt.storage.key, receipt);
    return receipt;
  }
};

function withStorage(
  receipt: VeslEvidenceReceipt,
  backend: VeslReceiptStorageBackend,
  key: string | null,
  persistedAt: string | null,
  persisted: boolean
): PersistedVeslEvidenceReceipt {
  return {
    ...receipt,
    storage: {
      persisted,
      backend,
      binding: veslReceiptBindingName,
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

function sortReceipts(receipts: PersistedVeslEvidenceReceipt[]) {
  return [...receipts].sort((left, right) =>
    (right.storage.persistedAt ?? right.generatedAt).localeCompare(left.storage.persistedAt ?? left.generatedAt)
  );
}

function isKvNamespace(value: unknown): value is VeslReceiptKvNamespace {
  return Boolean(
    value &&
      typeof value === "object" &&
      "get" in value &&
      "put" in value &&
      "list" in value
  );
}

function isPersistedReceipt(value: unknown): value is PersistedVeslEvidenceReceipt {
  return Boolean(
    value &&
      typeof value === "object" &&
      "receiptId" in value &&
      "storage" in value &&
      "summary" in value &&
      "report" in value
  );
}
