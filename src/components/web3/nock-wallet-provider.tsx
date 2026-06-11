"use client";

// Native-Nockchain wallet context (the Iris lane), sitting BESIDE the EVM wagmi context — it does not
// touch wagmi/AppKit. `kind: "iris"` means the Iris browser extension (window.nockchain) connected. The
// stored address is always the user's OWN address — the donation DESTINATION lives in src/lib/donation.ts
// and the two are never conflated.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { connectIris as connectIrisProvider, getIris, NockWalletError } from "@/lib/iris-provider";
import { isValidNockAddress } from "@/lib/donation";

export type NockWalletKind = "iris" | null;

export type NockWalletApi = {
  kind: NockWalletKind;
  address: string | null;
  irisAvailable: boolean; // feature-detect result; false during SSR/first paint to avoid hydration drift
  isConnecting: boolean;
  error: string | null;
  connectIris: () => Promise<void>;
  disconnect: () => void;
};

const SESSION_KEY = "nocks.nockWallet"; // sessionStorage only — not localStorage, not sent to the server

const NockWalletContext = createContext<NockWalletApi | null>(null);

export function NockWalletProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<NockWalletKind>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [irisAvailable, setIrisAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature-detect Iris + restore the session link once on the client. These setState calls sync React
  // with external systems (the injected provider + sessionStorage) on mount, which is the intended use of
  // an effect; the rule's "cascading render" warning doesn't apply to a one-shot mount sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Present now, or flips true when the extension dispatches nockchain#initialized after load.
    setIrisAvailable(getIris() !== null);
    const onInit = () => setIrisAvailable(true);
    window.addEventListener("nockchain#initialized", onInit);

    // Restore a previously-linked address for this tab session (low-trust display data only).
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { kind?: NockWalletKind; address?: string };
        if (parsed.address && isValidNockAddress(parsed.address) && parsed.kind === "iris") {
          setKind(parsed.kind);
          setAddress(parsed.address);
        }
      }
    } catch {
      /* ignore malformed/blocked sessionStorage */
    }
    return () => window.removeEventListener("nockchain#initialized", onInit);
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

  const connectIris = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const { pkh } = await connectIrisProvider();
      setKind("iris");
      setAddress(pkh);
      persist({ kind: "iris", address: pkh });
    } catch (err) {
      const msg =
        err instanceof NockWalletError
          ? err.code === "NOT_DETECTED"
            ? "Iris wallet not detected — install it to connect."
            : err.message
          : err instanceof Error
            ? err.message
            : "Could not connect to Iris.";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [persist]);

  const disconnect = useCallback(() => {
    setKind(null);
    setAddress(null);
    setError(null);
    persist({ kind: null, address: null });
  }, [persist]);

  const api = useMemo<NockWalletApi>(
    () => ({ kind, address, irisAvailable, isConnecting, error, connectIris, disconnect }),
    [kind, address, irisAvailable, isConnecting, error, connectIris, disconnect]
  );

  return <NockWalletContext.Provider value={api}>{children}</NockWalletContext.Provider>;
}

export function useNockWallet(): NockWalletApi {
  const ctx = useContext(NockWalletContext);
  if (!ctx) throw new Error("useNockWallet must be used within <NockWalletProvider>");
  return ctx;
}
