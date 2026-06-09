// Feature-detection + defensive connect for the "Isis" Nockchain browser extension.
//
// There is NO public/documented provider API for Isis, so this module assumes NOTHING. Every property
// access is guarded (`typeof x === "function"` + try/catch), nothing is awaited until confirmed callable,
// and all returned account data is treated as untrusted and re-validated as a base58 address. The page
// must never crash because an extension is absent, throws from a getter, or returns a garbage shape.
//
// Pure functions, no React, no JSX — so this is unit-testable via a plain `node scripts/test-*.mjs`.

import { isValidNockAddress } from "@/lib/donation";

// The injected object is intentionally opaque until we prove a method is callable.
export type InjectedNockProvider = Record<string, unknown>;

// Candidate globals, in priority order. Isis is unproven, so we also accept the generic names a
// Nockchain wallet extension is most likely to inject.
const CANDIDATE_GLOBALS = ["isis", "nockchain", "nock"] as const;

export type NockWalletErrorCode = "NOT_DETECTED" | "NOT_CONNECTABLE" | "REJECTED" | "BAD_ADDRESS";

export class NockWalletError extends Error {
  code: NockWalletErrorCode;
  constructor(code: NockWalletErrorCode, message: string) {
    super(message);
    this.name = "NockWalletError";
    this.code = code;
  }
}

function safeGet(obj: unknown, key: string): unknown {
  try {
    return (obj as Record<string, unknown>)?.[key];
  } catch {
    // A malicious/buggy extension could define a throwing getter — never let that escape.
    return undefined;
  }
}

function isFn(v: unknown): v is (...args: unknown[]) => unknown {
  return typeof v === "function";
}

// Returns the first injected provider object found among the candidate globals, or null. SSR-safe:
// returns null when there is no `window` (server / first paint).
export function detectIsis(): InjectedNockProvider | null {
  if (typeof window === "undefined") return null;
  for (const name of CANDIDATE_GLOBALS) {
    const candidate = safeGet(window, name);
    if (candidate && typeof candidate === "object") {
      return candidate as InjectedNockProvider;
    }
  }
  return null;
}

// Whether SOME connect-like capability exists, WITHOUT invoking it. We look for the conventional method
// names and an EIP-1193-style `request`.
export function hasConnectCapability(p: InjectedNockProvider | null): boolean {
  if (!p) return false;
  return (
    isFn(safeGet(p, "connect")) ||
    isFn(safeGet(p, "enable")) ||
    isFn(safeGet(p, "requestAccounts")) ||
    isFn(safeGet(p, "request"))
  );
}

// Normalize the many shapes a connect call might return to a single base58 address string, or null.
// Accepts: "addr" | {address} | {pubkey} | [addr,...] | {accounts:[...]} | {result:<any-of-these>}.
function extractAddress(result: unknown, depth = 0): string | null {
  // Bound the recursion: a hostile/buggy extension could return a self-referential (cyclic) shape, which
  // would otherwise blow the stack with an untyped RangeError.
  if (depth > 8 || !result) return null;
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return extractAddress(result[0], depth + 1);
  if (typeof result === "object") {
    const o = result as Record<string, unknown>;
    for (const key of ["address", "pubkey", "publicKey", "account"]) {
      const v = safeGet(o, key);
      if (typeof v === "string") return v;
    }
    const accounts = safeGet(o, "accounts");
    if (accounts) return extractAddress(accounts, depth + 1);
    const inner = safeGet(o, "result");
    if (inner) return extractAddress(inner, depth + 1);
  }
  return null;
}

// Defensive connect. Resolves to a validated base58 address, or throws a typed NockWalletError. Tries,
// in order: connect() -> enable() -> requestAccounts() -> request({method:"nock_requestAccounts"}).
// Any rejection/garbage shape becomes a typed error; nothing crashes the caller.
export async function connectIsis(p: InjectedNockProvider | null): Promise<string> {
  if (!p) throw new NockWalletError("NOT_DETECTED", "Isis wallet not detected.");

  let raw: unknown;
  try {
    const connect = safeGet(p, "connect");
    const enable = safeGet(p, "enable");
    const requestAccounts = safeGet(p, "requestAccounts");
    const request = safeGet(p, "request");

    if (isFn(connect)) raw = await connect.call(p);
    else if (isFn(enable)) raw = await enable.call(p);
    else if (isFn(requestAccounts)) raw = await requestAccounts.call(p);
    else if (isFn(request)) raw = await request.call(p, { method: "nock_requestAccounts" });
    else throw new NockWalletError("NOT_CONNECTABLE", "Isis is installed but exposes no connect method this version understands.");
  } catch (err) {
    if (err instanceof NockWalletError) throw err;
    const msg = err instanceof Error ? err.message : "Connection was rejected or failed.";
    throw new NockWalletError("REJECTED", msg);
  }

  let address: string | null;
  try {
    address = extractAddress(raw);
  } catch {
    // Belt-and-suspenders alongside the depth guard: any throw becomes a typed error, never a raw crash.
    throw new NockWalletError("BAD_ADDRESS", "Isis returned a response we could not parse.");
  }
  if (!address || !isValidNockAddress(address)) {
    throw new NockWalletError("BAD_ADDRESS", "Isis returned an address we could not validate.");
  }
  return address;
}
