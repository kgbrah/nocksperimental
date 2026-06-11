// Connect to the Iris Nockchain browser extension via its real injected provider, `window.nockchain`
// (EIP-1193-style `request({ method, params?, api?, timeout? })`). This is the actual contract used by
// nocktoshi/atomic-nock and @nockbox/iris-sdk — NOT a guessed `.connect()`/`.enable()` shape.
//
// Scope: CONNECT + read pkh only. Transaction signing (`nock_signTx`) needs the iris-wasm tx-builder
// stack and is intentionally out of scope here. Everything is SSR-safe and defensively guarded: the
// extension can hang without ever resolving/rejecting, so every request is wrapped in a hard timeout.

import { isValidNockAddress } from "@/lib/donation";

// The injected provider. Methods beyond `request` are optional and never assumed callable.
export type IrisProvider = {
  request<T = unknown>(args: { method: string; params?: unknown; api?: string; timeout?: number }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  off?(event: string, listener: (...args: unknown[]) => void): void;
  /** The Iris extension self-identifies with provider === "iris". */
  provider?: string;
};

declare global {
  interface Window {
    nockchain?: IrisProvider;
  }
}

export type NockWalletErrorCode = "NOT_DETECTED" | "REJECTED" | "BAD_ADDRESS" | "TIMEOUT";

export class NockWalletError extends Error {
  code: NockWalletErrorCode;
  constructor(code: NockWalletErrorCode, message: string) {
    super(message);
    this.name = "NockWalletError";
    this.code = code;
  }
}

// SSR-safe presence check. Returns the provider only if it exposes a callable `request`.
export function getIris(): IrisProvider | null {
  if (typeof window === "undefined") return null;
  const n = window.nockchain;
  return n && typeof n.request === "function" ? n : null;
}

// Resolve once the provider is injected: immediately if present, else wait for the extension's
// `nockchain#initialized` event (it can inject slightly after page load), up to timeoutMs.
export function waitForIris(timeoutMs = 3000): Promise<IrisProvider> {
  const existing = getIris();
  if (existing) return Promise.resolve(existing);
  if (typeof window === "undefined") {
    return Promise.reject(new NockWalletError("NOT_DETECTED", "No window (server)."));
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("nockchain#initialized", onInit);
    };
    const onInit = () => {
      const p = getIris();
      if (p) {
        cleanup();
        resolve(p);
      }
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new NockWalletError("NOT_DETECTED", "Iris wallet not detected — install the Iris extension and refresh."));
    }, timeoutMs);
    window.addEventListener("nockchain#initialized", onInit);
    onInit();
  });
}

// Race a request against a hard client-side deadline — the extension's message channel can die and
// never settle, which would otherwise hang the calling UI forever.
function withTimeout<T>(p: Promise<T>, ms: number, method: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new NockWalletError("TIMEOUT", `Iris ${method} timed out — reopen/unlock Iris and retry.`)),
      ms
    );
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]);
}

function safeGet(obj: unknown, key: string): unknown {
  try {
    return (obj as Record<string, unknown>)?.[key];
  } catch {
    return undefined;
  }
}

// Normalize the various shapes a connect response might take to a single string, with a depth bound so
// a hostile/cyclic response can never blow the stack.
function extractAddress(result: unknown, depth = 0): string | null {
  if (depth > 8 || !result) return null;
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return extractAddress(result[0], depth + 1);
  if (typeof result === "object") {
    for (const key of ["pkh", "PKH", "address", "publicKey", "account"]) {
      const v = safeGet(result, key);
      if (typeof v === "string") return v;
    }
    const accounts = safeGet(result, "accounts");
    if (accounts) return extractAddress(accounts, depth + 1);
    const inner = safeGet(result, "result");
    if (inner) return extractAddress(inner, depth + 1);
  }
  return null;
}

function pickString(obj: unknown, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = safeGet(obj, k);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export type IrisConnection = { pkh: string; address?: string };

// Connect to Iris and return a validated base58 pkh (+ optional wallet address). Any rejection/garbage
// shape becomes a typed NockWalletError — this never crashes the caller.
export async function connectIris(): Promise<IrisConnection> {
  const iris = await waitForIris();
  let raw: unknown;
  try {
    raw = await withTimeout(
      iris.request({ method: "nock_connect", timeout: 120_000 }),
      135_000,
      "nock_connect"
    );
  } catch (err) {
    if (err instanceof NockWalletError) throw err;
    throw new NockWalletError("REJECTED", err instanceof Error ? err.message : "Iris connection was rejected.");
  }

  let pkh: string | null;
  try {
    pkh = pickString(raw, ["pkh", "PKH"]) ?? extractAddress(raw);
  } catch {
    throw new NockWalletError("BAD_ADDRESS", "Iris returned a response we could not parse.");
  }
  if (!pkh || !isValidNockAddress(pkh)) {
    throw new NockWalletError("BAD_ADDRESS", "Iris returned an address we could not validate.");
  }
  const address = pickString(raw, ["address", "walletAddress", "wallet_address", "account"]);
  return { pkh, address: address && isValidNockAddress(address) ? address : undefined };
}

// Install/info link surfaced when Iris is not detected.
export const IRIS_INSTALL_URL = "https://github.com/nockbox/iris";
