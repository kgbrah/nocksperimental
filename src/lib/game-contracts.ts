// Deployed on-chain game-settlement contracts, by chainId. Testnet-only for now (mirrors the network
// gate in networks.ts). The frontend reads stakes/rounds and submits plays against these addresses.
//
// Two stake assets are supported per chain:
//   - "eth"   : the original native-ETH ForfeitFlip (stake via msg.value).
//   - "tnock" : the generalized ERC20 ForfeitFlip staked in tNOCK (Nocksperimental test NOCK). tNOCK is
//               the wrapped form of mined fakenet NOCK, bridged to Base via our own MessageInbox. ERC20
//               play requires approve(token, amount) then play(roundId, clientSeed, amount).

export type FlipAsset = "eth" | "tnock";

export type GameContracts = {
  forfeitFlip?: `0x${string}`; // native ETH game (pre-generalization ABI: play(roundId, clientSeed))
  forfeitFlipTNock?: `0x${string}`; // generalized ERC20 game (play(roundId, clientSeed, amount))
  tNock?: `0x${string}`; // tNOCK ERC20 token (for approve + balance)
};

export const GAME_CONTRACTS: Record<number, GameContracts> = {
  // Base Sepolia (testnet) — LIVE.
  84532: {
    forfeitFlip: "0x347cE69E43E7dA45Cc90BcC9F124B32BadF9ad86",
    // Generalized ForfeitFlip staked in tNOCK; bankroll funded from bridged, mined fakenet NOCK.
    // min 10 / max 1000 / bankroll 10,000 tNOCK.
    forfeitFlipTNock: "0x4aF9B126673B90eB7AF0524fb4A5B0118Bf4664d",
    tNock: "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3"
  },
  // Base mainnet — gated; no game contracts deployed yet.
  8453: {}
};

// tNOCK uses 16 decimals (matches Base-bridged NOCK), NOT 18. ETH uses 18.
export const TNOCK_DECIMALS = 16;

export function forfeitFlipAddress(
  chainId: number | undefined,
  asset: FlipAsset = "eth"
): `0x${string}` | undefined {
  if (chainId == null) return undefined;
  const c = GAME_CONTRACTS[chainId];
  return asset === "tnock" ? c?.forfeitFlipTNock : c?.forfeitFlip;
}

export function tNockAddress(chainId: number | undefined): `0x${string}` | undefined {
  return chainId == null ? undefined : GAME_CONTRACTS[chainId]?.tNock;
}

export function flipAssetAvailable(chainId: number | undefined, asset: FlipAsset): boolean {
  return forfeitFlipAddress(chainId, asset) !== undefined;
}

// Mirrors the ForfeitFlip.Status enum order on-chain. Shared so server + client never use bare 2/3.
export const FlipStatus = {
  None: 0,
  Open: 1,
  Played: 2,
  Settled: 3,
  Refunded: 4,
  Cancelled: 5
} as const;
