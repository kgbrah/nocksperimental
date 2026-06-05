import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NockupValidationReceipt } from "@/lib/nockup-validation-submission";

export const nockupReceiptBindingName = "NOCKS_NOCKUP_RECEIPTS";

const receiptKeyPrefix = "nockup:receipt:";
const memoryReceipts = new Map<string, PersistedNockupValidationReceipt>();

type NockupReceiptStorageBackend = "kv" | "memory";

type NockupReceiptStorage = {
  persisted: boolean;
  backend: NockupReceiptStorageBackend;
  binding: string;
  key: string | null;
  persistedAt: string | null;
};

export type PersistedNockupValidationReceipt = NockupValidationReceipt & {
  storage: NockupReceiptStorage;
};

type NockupReceiptStore = {
  backend: NockupReceiptStorageBackend;
  get: (receiptId: string) => Promise<PersistedNockupValidationReceipt | null>;
  list: (limit: number) => Promise<PersistedNockupValidationReceipt[]>;
  put: (receipt: PersistedNockupValidationReceipt) => Promise<void>;
};

type NockupReceiptKvNamespace = {
  get: (key: string, options?: { type: "json" } | "json") => Promise<unknown>;
  list: (options?: {
    prefix?: string;
    limit?: number;
  }) => Promise<{
    keys: Array<{ name: string }>;
  }>;
  put: (key: string, value: string, options?: { metadata?: Record<string, unknown> }) => Promise<void>;
};

export async function persistNockupValidationReceipt(receipt: NockupValidationReceipt) {
  const store = await getNockupReceiptStore();

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

export async function listNockupValidationReceipts(limit = 25) {
  const store = await getNockupReceiptStore();

  return {
    backend: store.backend,
    binding: nockupReceiptBindingName,
    receipts: await store.list(normalizeLimit(limit))
  };
}

export async function readNockupValidationReceipt(receiptId: string) {
  const store = await getNockupReceiptStore();

  return {
    backend: store.backend,
    binding: nockupReceiptBindingName,
    receipt: await store.get(receiptId)
  };
}

async function getNockupReceiptStore(): Promise<NockupReceiptStore> {
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
    const binding = env[nockupReceiptBindingName];

    if (isKvNamespace(binding)) {
      return binding;
    }
  } catch {
    return null;
  }

  return null;
}

function createKvStore(kv: NockupReceiptKvNamespace): NockupReceiptStore {
  return {
    backend: "kv",
    async get(receiptId) {
      return readKvReceipt(kv, createReceiptKey(receiptId));
    },
    async list(limit) {
      const listing = await kv.list({
        prefix: receiptKeyPrefix,
        limit: Math.min(Math.max(limit, 1), 1000)
      });
      const receipts = await Promise.all(
        listing.keys.map((key) => readKvReceipt(kv, key.name))
      );

      return sortReceipts(receipts.filter((receipt): receipt is PersistedNockupValidationReceipt => Boolean(receipt))).slice(
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

async function readKvReceipt(kv: NockupReceiptKvNamespace, key: string) {
  const value = await kv.get(key, { type: "json" });

  if (isPersistedReceipt(value)) {
    return value;
  }

  return null;
}

const memoryStore: NockupReceiptStore = {
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
  receipt: NockupValidationReceipt,
  backend: NockupReceiptStorageBackend,
  key: string | null,
  persistedAt: string | null,
  persisted: boolean
): PersistedNockupValidationReceipt {
  return {
    ...receipt,
    storage: {
      persisted,
      backend,
      binding: nockupReceiptBindingName,
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

function sortReceipts(receipts: PersistedNockupValidationReceipt[]) {
  return [...receipts].sort((left, right) =>
    (right.storage.persistedAt ?? right.generatedAt).localeCompare(left.storage.persistedAt ?? left.generatedAt)
  );
}

function isKvNamespace(value: unknown): value is NockupReceiptKvNamespace {
  return Boolean(
    value &&
      typeof value === "object" &&
      "get" in value &&
      "put" in value &&
      "list" in value
  );
}

function isPersistedReceipt(value: unknown): value is PersistedNockupValidationReceipt {
  return Boolean(
    value &&
      typeof value === "object" &&
      "receiptId" in value &&
      "storage" in value &&
      "summary" in value &&
      "nockup" in value
  );
}
