"use client";

// Native-Nockchain wallet context (the CLI + Isis lane), sitting BESIDE the EVM wagmi context — it does
// not touch wagmi/AppKit. `kind: "cli"` means the user manually linked their own base58 address; `kind:
// "isis"` means the injected extension connected. The stored address is always the user's OWN sending
// address — the donation DESTINATION lives in src/lib/donation.ts and the two are never conflated.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { connectIsis as connectIsisProvider, detectIsis, hasConnectCapability, NockWalletError } from "@/lib/isis-provider";
import { isValidNockAddress } from "@/lib/donation";

export type NockWalletKind = "cli" | "isis" | null;

export type NockWalletApi = {
  kind: NockWalletKind;
  address: string | null;
  isisAvailable: boolean; // feature-detect result; false during SSR/first paint to avoid hydration drift
  isConnecting: boolean;
  error: string | null;
  connectIsis: () => Promise<void>;
  linkCliAddress: (addr: string) => boolean; // returns true when the address validated + linked
  disconnect: () => void;
};

const SESSION_KEY = "nocks.nockWallet"; // sessionStorage only — not localStorage, not sent to the server

const NockWalletContext = createContext<NockWalletApi | null>(null);

export function NockWalletProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<NockWalletKind>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isisAvailable, setIsisAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature-detect Isis + restore the session link once on the client. These setState calls sync React
  // with external systems (the injected provider + sessionStorage) on mount, which is the intended use of
  // an effect; the rule's "cascading render" warning doesn't apply to a one-shot mount sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsisAvailable(hasConnectCapability(detectIsis()));
    // Restore a previously-linked address for this tab session (low-trust display data only).
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { kind?: NockWalletKind; address?: string };
        if (parsed.address && isValidNockAddress(parsed.address) && (parsed.kind === "cli" || parsed.kind === "isis")) {
          setKind(parsed.kind);
          setAddress(parsed.address);
        }
      }
    } catch {
      /* ignore malformed/blocked sessionStorage */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = useCallback((next: { kind: NockWalletKind; address: string | null }) => {
    try {
      if (next.address && next.kind) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* sessionStorage may be unavailable (private mode); state still works in-memory */
    }
  }, []);

  const connectIsis = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const provider = detectIsis();
      const addr = await connectIsisProvider(provider);
      setKind("isis");
      setAddress(addr);
      persist({ kind: "isis", address: addr });
    } catch (err) {
      const msg =
        err instanceof NockWalletError
          ? err.code === "NOT_DETECTED"
            ? "Isis wallet not detected — install it to connect."
            : err.message
          : err instanceof Error
            ? err.message
            : "Could not connect to Isis.";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [persist]);

  const linkCliAddress = useCallback(
    (addr: string): boolean => {
      const trimmed = addr.trim();
      if (!isValidNockAddress(trimmed)) {
        setError("That doesn't look like a valid Nockchain (base58) address.");
        return false;
      }
      setError(null);
      setKind("cli");
      setAddress(trimmed);
      persist({ kind: "cli", address: trimmed });
      return true;
    },
    [persist]
  );

  const disconnect = useCallback(() => {
    setKind(null);
    setAddress(null);
    setError(null);
    persist({ kind: null, address: null });
  }, [persist]);

  const api = useMemo<NockWalletApi>(
    () => ({ kind, address, isisAvailable, isConnecting, error, connectIsis, linkCliAddress, disconnect }),
    [kind, address, isisAvailable, isConnecting, error, connectIsis, linkCliAddress, disconnect]
  );

  return <NockWalletContext.Provider value={api}>{children}</NockWalletContext.Provider>;
}

export function useNockWallet(): NockWalletApi {
  const ctx = useContext(NockWalletContext);
  if (!ctx) throw new Error("useNockWallet must be used within <NockWalletProvider>");
  return ctx;
}
