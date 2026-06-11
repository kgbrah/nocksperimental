// NockEthAMM wiring: a constant-product (x*y=k) ETH/tNOCK pool on Base Sepolia.
// Real on-chain LP + swaps. Two fees per swap: 0.30% stays in the pool for LPs
// (Uniswap-V2 parity) and 0.01% is sent to the project donation wallet.

const AMM: Record<number, `0x${string}`> = {
  84532: "0x6fA37A71E1f185919AB0b99B614d30B99B2636c2"
};

export function ammAddress(chainId: number): `0x${string}` | null {
  return AMM[chainId] ?? null;
}

/** Fee schedule, surfaced in the GUI for disclosure. */
export const AMM_LP_FEE_BPS = 30; // 0.30% to liquidity providers (in-pool)
export const AMM_DONATION_FEE_BPS = 1; // 0.01% to the donation wallet, per swap

export const ammAbi = [
  { type: "function", name: "reserveEth", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserveTnock", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "donationWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "quoteTnockForEth",
    stateMutability: "view",
    inputs: [{ name: "ethIn", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "getAmountOut",
    stateMutability: "pure",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "reserveIn", type: "uint256" },
      { name: "reserveOut", type: "uint256" }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "donation", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "payable",
    inputs: [
      { name: "tnockIn", type: "uint256" },
      { name: "minShares", type: "uint256" }
    ],
    outputs: [{ name: "shares", type: "uint256" }]
  },
  {
    type: "function",
    name: "removeLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "minEth", type: "uint256" },
      { name: "minTnock", type: "uint256" }
    ],
    outputs: [
      { name: "ethOut", type: "uint256" },
      { name: "tnockOut", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "swapEthForTNock",
    stateMutability: "payable",
    inputs: [{ name: "minOut", type: "uint256" }],
    outputs: [{ name: "amountOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "swapTNockForEth",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  }
] as const;

/** Minimal tNOCK ERC20 surface the pool UI needs (balance + approve for deposits/sells). */
export const ammTnockAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

/** Basis-point fee -> human percent string, e.g. 30 -> "0.30". */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}
