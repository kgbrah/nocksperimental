// Swap flow wiring: Sepolia ETH -> tNOCK (NockSwapVault on Base Sepolia) ->
// Nock.burn(amount, lockRoot) -> native NOCK paid on the Nockchain fakenet by
// the orchestrator's /bridge/redeem leg.
//
// The lockRoot computed here MUST match the orchestrator's
// lockRootForAddress (sha256 over the utf8 address string) — it is the
// on-chain commitment binding a burn to its fakenet payout address.

import { sha256, stringToBytes, type Hex } from "viem";

/** NockSwapVault deployments (see contracts/deployments/base-sepolia-84532.json). */
const SWAP_VAULT: Record<number, `0x${string}`> = {
  84532: "0xA7B87743bCe396f74152Ae97BDDea2Cc6ED01dD2"
};

export function swapVaultAddress(chainId: number): `0x${string}` | null {
  return SWAP_VAULT[chainId] ?? null;
}

export const swapVaultAbi = [
  {
    type: "function",
    name: "rate",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "reserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [{ name: "ethWei", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "swapEthForTNock",
    stateMutability: "payable",
    inputs: [],
    outputs: [{ name: "tnockOut", type: "uint256" }]
  }
] as const;

/** The bridge tNOCK surface the swap uses: balance + the withdrawal burn. */
export const tnockBurnAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "lockRoot", type: "bytes32" }
    ],
    outputs: []
  }
] as const;

/** 10^16 tNOCK base units per token / 2^16 nicks per NOCK. */
export const BASE_UNITS_PER_NICK = BigInt("152587890625");

export function baseUnitsToNicks(baseUnits: bigint): bigint {
  return baseUnits / BASE_UNITS_PER_NICK;
}

/** Base58 posture mirrored from the orchestrator + iris-provider validation. */
export function isNockAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(value);
}

/** bytes32 lock root binding a burn to its fakenet payout address. */
export function lockRootForNockAddress(nockAddress: string): Hex {
  return sha256(stringToBytes(nockAddress));
}
