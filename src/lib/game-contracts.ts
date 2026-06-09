// Deployed on-chain game-settlement contracts, by chainId. Testnet-only for now (mirrors the network
// gate in networks.ts). The frontend reads stakes/rounds and submits plays against these addresses.

export type GameContracts = {
  forfeitFlip?: `0x${string}`;
};

export const GAME_CONTRACTS: Record<number, GameContracts> = {
  // Base Sepolia (testnet) — LIVE.
  84532: {
    forfeitFlip: "0x347cE69E43E7dA45Cc90BcC9F124B32BadF9ad86"
  },
  // Base mainnet — gated; no game contracts deployed yet.
  8453: {}
};

export function forfeitFlipAddress(chainId: number | undefined): `0x${string}` | undefined {
  return chainId == null ? undefined : GAME_CONTRACTS[chainId]?.forfeitFlip;
}
