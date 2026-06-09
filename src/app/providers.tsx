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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId && typeof window !== "undefined") {
  console.warn(
    "[nocksperimental] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — the connect modal is limited to injected wallets (no WalletConnect/mobile QR). Set it to a Reown projectId."
  );
}

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
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
