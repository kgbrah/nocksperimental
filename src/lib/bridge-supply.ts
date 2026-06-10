// Live supply metrics for our self-run testnet NOCK <-> tNOCK bridge, plus the conservation invariant.
//
// FULL DISCLOSURE: this is NOT an official Nockchain testnet bridge. We (kg & Claude) built it, deployed
// the contracts, and run all five operator nodes ourselves — there is NO affiliation with Zorp or the
// official Nockchain project (we just think they're super cool). tNOCK is a self-issued testnet token,
// backed by fakenet NOCK we mine. Nothing here has real value.
//
// The Base side (tNOCK supply, deposits, mint/burn totals) is read LIVE from Base Sepolia. The Nockchain
// side (total mined NOCK, spendable NOCK) is read from a snapshot refreshed out-of-band by
// scripts/bridge-conservation-audit.sh, because the Cloudflare Worker cannot reach the local fakenet node.

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { rpcUrlFor } from "@/lib/base-rpc";
import snapshot from "@/data/bridge-supply-snapshot.json";

export const BRIDGE_DISCLOSURE = {
  headline: "Unofficial — we built & run this bridge ourselves",
  body:
    "This is NOT an official Nockchain testnet bridge. We deployed the contracts and run all five bridge " +
    "operator nodes ourselves, so it's a 3-of-5 multisig WE control. No affiliation with Zorp or the " +
    "official Nockchain project — we just think they're super cool. tNOCK is a self-issued testnet token " +
    "backed by fakenet NOCK we mine; it has no real value.",
  signature: "Vibecoded by kg & Claude."
} as const;

const CHAIN_ID = 84532;
const TNOCK = "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3" as const;
const INBOX = "0xA7c373916665e89Aa52Dbd2Ecd36Ba3A45A6e942" as const;
const TNOCK_DECIMALS = 16;
const NICKS_PER_NOCK = BigInt(65536);
const DEPOSIT_NOCK = BigInt(100000); // each bridge-deposit is the protocol minimum (minimum-event-nocks)
const ZERO = BigInt(0);

const erc20 = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }
] as const;
const inboxAbi = [
  { type: "function", name: "lastDepositNonce", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }
] as const;

// nicks -> human NOCK string. Whole part stays exact via bigint division; fractional (< 65,536) is safe in Number.
function nockFromNicks(nicks: bigint): string {
  const whole = nicks / NICKS_PER_NOCK;
  const frac = nicks % NICKS_PER_NOCK;
  const num = Number(whole) + Number(frac) / Number(NICKS_PER_NOCK);
  return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export type BridgeSupply = Awaited<ReturnType<typeof getBridgeSupply>>;

export async function getBridgeSupply() {
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrlFor(CHAIN_ID)) });

  // --- Base side (live) ---
  let tnockSupplyBase = ZERO;
  let depositsMinted = ZERO;
  let baseError: string | undefined;
  try {
    [tnockSupplyBase, depositsMinted] = await Promise.all([
      client.readContract({ address: TNOCK, abi: erc20, functionName: "totalSupply" }) as Promise<bigint>,
      client.readContract({ address: INBOX, abi: inboxAbi, functionName: "lastDepositNonce" }) as Promise<bigint>
    ]);
  } catch (e) {
    baseError = e instanceof Error ? e.message : "base read failed";
  }

  // tNOCK has no burn path on this deployment (withdrawals disabled), so minted == current supply, burned == 0.
  // 1 tNOCK == 1 NOCK; tNOCK uses 16 decimals, so divide out the decimals then scale to nicks.
  const tnockSupplyNicks = (tnockSupplyBase / BigInt(10) ** BigInt(TNOCK_DECIMALS)) * NICKS_PER_NOCK;
  const mintedNicks = tnockSupplyNicks;
  const burnedNicks = ZERO;

  // Locked NOCK backing the minted tNOCK = (minted deposits) * per-deposit amount.
  const lockedNicks = depositsMinted * DEPOSIT_NOCK * NICKS_PER_NOCK;
  const bridgeFeeNicks = lockedNicks > tnockSupplyNicks ? lockedNicks - tnockSupplyNicks : ZERO;

  // --- Nockchain side (snapshot) ---
  const minedNicks = BigInt(snapshot.minedNicks);
  const spendableNicks = BigInt(snapshot.spendableNicks);

  // --- conservation invariants ---
  // (C) mined  ==  spendable + locked + residual(genesis/immature coinbase + tx fees)
  // (B) tNOCK  <=  locked        (every tNOCK is backed by locked NOCK)
  const residualNicks = minedNicks - spendableNicks - lockedNicks;
  const backed = tnockSupplyNicks <= lockedNicks;
  const consistencyPct =
    minedNicks > ZERO ? Number(((spendableNicks + lockedNicks) * BigInt(10000)) / minedNicks) / 100 : 0;

  return {
    disclosure: BRIDGE_DISCLOSURE,
    asOf: { base: "live", nock: snapshot.updatedAt },
    nock: {
      mined: { nicks: minedNicks.toString(), nock: nockFromNicks(minedNicks) },
      spendable: { nicks: spendableNicks.toString(), nock: nockFromNicks(spendableNicks) },
      chainHeight: snapshot.chainHeight,
      blockRewardNock: Number(BigInt(snapshot.blockRewardNicks) / NICKS_PER_NOCK)
    },
    tnock: {
      totalSupply: { base: tnockSupplyBase.toString(), tnock: Number(tnockSupplyBase) / 10 ** TNOCK_DECIMALS },
      mintedNock: nockFromNicks(mintedNicks),
      burnedNock: nockFromNicks(burnedNicks)
    },
    bridge: {
      depositsMinted: Number(depositsMinted),
      lockedNock: nockFromNicks(lockedNicks),
      bridgeFeeNock: nockFromNicks(bridgeFeeNicks),
      operatorModel: "3-of-5 multisig (operated by us)"
    },
    conservation: {
      minedNock: nockFromNicks(minedNicks),
      spendablePlusTnockNock: nockFromNicks(spendableNicks + tnockSupplyNicks),
      residualNock: nockFromNicks(residualNicks < ZERO ? -residualNicks : residualNicks),
      backed,
      consistencyPct
    },
    baseError
  };
}
