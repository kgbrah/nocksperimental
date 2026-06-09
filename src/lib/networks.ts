// Single source of truth for which EVM networks are LIVE in the interactive GUI. Mirrors the model
// of the live-base promotion gate: only chains proven end-to-end (native + cross-chain) are enabled
// for writes. Testnet (Base Sepolia, 84532) is live; mainnet (Base, 8453) is present-but-GATED until
// the same flows are proven — promoting it is a one-line `enabled: true` flip here.
//
// The wagmi/AppKit config registers BOTH chains (so the switcher can SEE mainnet and explain the gate),
// but every write/connect-sensitive action funnels through isChainEnabled() so a gated chain can never
// silently execute a real transaction.

export type NetworkKind = "testnet" | "mainnet";

export type AppNetwork = {
  chainId: number;
  label: string;
  shortLabel: string;
  kind: NetworkKind;
  enabled: boolean;
  // Deployed Nockchain<->Base bridge contracts (federated 3-of-5). Present only where the bridge lives.
  bridge?: { messageInbox: `0x${string}`; nock: `0x${string}` };
  explorer: string;
  // Why a gated chain is gated — shown in the UI so the gate is explained, not just hidden.
  gateReason?: string;
};

export const APP_NETWORKS: Record<number, AppNetwork> = {
  84532: {
    chainId: 84532,
    label: "Base Sepolia",
    shortLabel: "Base Sepolia",
    kind: "testnet",
    enabled: true,
    bridge: {
      messageInbox: "0x9b1becA13c39b9Be10dB616F1bE10C3CeF9Dfb36",
      nock: "0xA9cd4087D9B050D8B35727AAf810296CA957c7B3"
    },
    explorer: "https://sepolia.basescan.org"
  },
  8453: {
    chainId: 8453,
    label: "Base",
    shortLabel: "Base",
    kind: "mainnet",
    enabled: false,
    explorer: "https://basescan.org",
    gateReason:
      "Mainnet is gated until native + cross-chain flows are proven on testnet (Base Sepolia). " +
      "No real-value writes are enabled here yet."
  }
};

export const DEFAULT_CHAIN_ID = 84532;

export const ENABLED_CHAIN_IDS = Object.values(APP_NETWORKS)
  .filter((n) => n.enabled)
  .map((n) => n.chainId);

export function appNetwork(chainId: number | undefined): AppNetwork | undefined {
  return chainId == null ? undefined : APP_NETWORKS[chainId];
}

// A chain is usable for real (write) interaction only if it is a known network AND enabled.
export function isChainEnabled(chainId: number | undefined): boolean {
  return appNetwork(chainId)?.enabled === true;
}

export function isKnownChain(chainId: number | undefined): boolean {
  return appNetwork(chainId) !== undefined;
}

export function chainLabel(chainId: number | undefined): string {
  return appNetwork(chainId)?.label ?? (chainId != null ? `Chain ${chainId}` : "—");
}

export function bridgeContracts(chainId: number | undefined): AppNetwork["bridge"] | undefined {
  return appNetwork(chainId)?.bridge;
}

export function explorerTx(chainId: number | undefined, txHash: string): string | undefined {
  const e = appNetwork(chainId)?.explorer;
  return e ? `${e}/tx/${txHash}` : undefined;
}

export function explorerAddress(chainId: number | undefined, address: string): string | undefined {
  const e = appNetwork(chainId)?.explorer;
  return e ? `${e}/address/${address}` : undefined;
}
