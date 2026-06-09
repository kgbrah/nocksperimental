// Shared server-side chain-id -> RPC URL resolution. The URL stays server-side (never shipped to the
// client): a private endpoint can be set via env, otherwise a public RPC is used.

const DEFAULT_RPC: Record<number, string> = {
  84532: "https://sepolia.base.org",
  8453: "https://mainnet.base.org"
};

export function rpcUrlFor(chainId: number): string {
  const env =
    (chainId === 84532 && process.env.BASE_SEPOLIA_RPC_URL) ||
    (chainId === 8453 && process.env.BASE_MAINNET_RPC_URL) ||
    "";
  return env || DEFAULT_RPC[chainId] || "";
}
