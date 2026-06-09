"use client";

// First client-provider boundary in the app. Wraps the (server-rendered) page tree so the wallet +
// chain hooks are available everywhere, without forcing pages to become client components: server
// children are passed through as props and still render on the server.

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia, base, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiProvider, cookieStorage, createStorage } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NockWalletProvider } from "@/components/web3/nock-wallet-provider";

// Reown/WalletConnect projectId — a PUBLIC client identifier (it ships in the browser bundle), NOT a
// secret. NEXT_PUBLIC_* is inlined at build time, so it must be present when `next build` runs (a Worker
// runtime secret would be too late and never reach the bundle). The committed default keeps every build
// working; override via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to point at a different Reown project.
const DEFAULT_WC_PROJECT_ID = "6a67443d7998017027f5a20a8380dcb5";
const envProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
const projectId = envProjectId && envProjectId.length > 0 ? envProjectId : DEFAULT_WC_PROJECT_ID;

// BOTH chains are registered so the network switcher can SEE mainnet and explain its gate; the action
// layer (src/lib/networks.ts isChainEnabled) is what actually prevents real writes on the gated chain.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia, base];

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
  storage: createStorage({ storage: cookieStorage })
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Initialize AppKit once at module scope (Reown's documented Next.js pattern; SSR-safe).
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: baseSepolia,
  metadata: {
    name: "Nocksperimental",
    description: "Interactive testing + play for Nockchain apps and the Nockchain<->Base bridge.",
    url: "https://nocksperimental.com",
    icons: ["https://nocksperimental.com/favicon.ico"]
  },
  features: { analytics: false, email: false, socials: [] },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#0B0B0B",
    "--w3m-border-radius-master": "0px"
  }
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: ReactNode }) {
  // NOTE on SSR: the adapter sets `ssr: true` + cookieStorage so wagmi hydrates safely (no hydration
  // mismatch) and the cookie persists the connection client-side. We deliberately do NOT seed
  // `initialState` via cookieToInitialState here — doing so requires reading headers() in the root
  // layout, which would opt the ENTIRE app out of static generation. Every wagmi consumer gates on
  // `isConnected` (false on server + first client paint), so server/first-paint already agree; the
  // wallet simply reconnects from the cookie after mount, which is the right trade for a mostly-static site.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Native-Nockchain (CLI/Isis) context lives beside wagmi, so both lanes are available app-wide. */}
        <NockWalletProvider>{children}</NockWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
