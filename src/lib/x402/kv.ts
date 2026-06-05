// Cloudflare KV access for the x402 layer, with the same shape the repo's
// fakenet/VESL receipt stores use: resolve the namespace from the Worker
// context, or return null so callers fall back to an in-memory map (tests and
// local dev without a bound namespace).

export const X402_KV_BINDING = "NOCKS_X402_RECEIPTS";

export interface KvPutOptions {
  metadata?: Record<string, unknown>;
  expirationTtl?: number;
}

export interface KvLike {
  get(key: string, options?: { type: "json" } | "json"): Promise<unknown>;
  put(key: string, value: string, options?: KvPutOptions): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

export async function getX402Kv(): Promise<KvLike | null> {
  try {
    // Imported lazily so that merely loading a metered route does not pull the
    // (ESM-only) Cloudflare context module — important for the repo's CJS test
    // harness and for keeping the disabled-metering path dependency-free.
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const env = context.env as Record<string, unknown>;
    const binding = env[X402_KV_BINDING];

    if (isKvNamespace(binding)) {
      return binding;
    }
  } catch {
    return null;
  }

  return null;
}

function isKvNamespace(value: unknown): value is KvLike {
  return Boolean(
    value && typeof value === "object" && "get" in value && "put" in value && "list" in value
  );
}
