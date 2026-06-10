#!/usr/bin/env node
// AMM peg keeper — keeps the Base Sepolia ETH/tNOCK pool (NockEthAMM) priced at
// the real NOCK/ETH market price by auto-trading against it.
//
// Each loop: read NOCK/USD + ETH/USD (CoinGecko) -> target NOCK/ETH; read the
// pool reserves -> current price; if the deviation exceeds the threshold,
// compute the constant-product swap that moves the pool to the target and
// execute it (bounded by a max trade size + a gas/ETH reserve, slippage-
// protected). 0.30% LP fee + 0.01% donation apply to every keeper trade — the
// donation funds the project wallet, exactly as designed/disclosed.
//
// Trades sign from the HOUSE/deployer key (read from disk, never argv/console).
// Loops forever; meant to run under systemd. Tunables via env (see below).

import { createPublicClient, createWalletClient, http, formatEther, formatUnits, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const AMM = process.env.AMM_ADDR || "0x6fA37A71E1f185919AB0b99B614d30B99B2636c2";
const TNOCK = process.env.TNOCK_ADDR || "0xaAB9a8889a7714864A6B90A9F76A092f7b4Df4f3";
const RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const KEY_PATH = process.env.KEEPER_KEY || `${homedir()}/.config/nocklab/base-sepolia-deployer.key`;

const POLL_MS = Number(process.env.KEEPER_POLL_MS || 60_000);
const THRESHOLD = Number(process.env.KEEPER_THRESHOLD || 0.02); // re-peg when |dev| > 2%
const MAX_TRADE_ETH = parseEther(process.env.KEEPER_MAX_TRADE_ETH || "0.004"); // per-iteration cap
const GAS_RESERVE = parseEther(process.env.KEEPER_GAS_RESERVE || "0.003"); // never spend below this
const SLIPPAGE_BPS = Number(process.env.KEEPER_SLIPPAGE_BPS || 200); // 2% min-out tolerance
const DRY_RUN = process.env.KEEPER_DRY_RUN === "1"; // compute + log, never trade
const ONCE = process.env.KEEPER_ONCE === "1"; // run a single tick then exit
const TNOCK_DECIMALS = 16;
const ONE_ETH = parseEther("1");

const ammAbi = [
  { type: "function", name: "reserveEth", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserveTnock", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getAmountOut", stateMutability: "pure",
    inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
  {
    type: "function", name: "swapEthForTNock", stateMutability: "payable",
    inputs: [{ name: "minOut", type: "uint256" }], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "swapTNockForEth", stateMutability: "nonpayable",
    inputs: [{ name: "amountIn", type: "uint256" }, { name: "minOut", type: "uint256" }], outputs: [{ type: "uint256" }],
  },
];
const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];

const rawKey = readFileSync(KEY_PATH, "utf8").trim();
const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

const log = (...a) => console.log(new Date().toISOString(), ...a);
const isqrt = (v) => {
  if (v < 0n) throw new Error("isqrt of negative");
  if (v < 2n) return v;
  let x = v, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + v / x) / 2n; }
  return x;
};

// Real NOCK/ETH = (NOCK/USD) / (ETH/USD), i.e. NOCK per ETH. Returned scaled by
// 1e18 as a bigint so the on-chain ratio math stays integer.
async function realNockPerEth() {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=nockchain,ethereum&vs_currencies=usd");
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const d = await res.json();
  const nock = d?.nockchain?.usd, eth = d?.ethereum?.usd;
  if (!nock || !eth) throw new Error("missing price");
  return { nockPerEth: eth / nock, nock, eth };
}

async function ensureAllowance(amount) {
  const a = await pc.readContract({ address: TNOCK, abi: erc20Abi, functionName: "allowance", args: [account.address, AMM] });
  if (a >= amount) return;
  const hash = await wc.writeContract({ address: TNOCK, abi: erc20Abi, functionName: "approve", args: [AMM, (1n << 256n) - 1n] });
  await pc.waitForTransactionReceipt({ hash });
  log("approved tNOCK -> AMM");
}

async function tick() {
  const { nockPerEth, nock, eth } = await realNockPerEth();
  const [reserveEth, reserveTnock] = await Promise.all([
    pc.readContract({ address: AMM, abi: ammAbi, functionName: "reserveEth" }),
    pc.readContract({ address: AMM, abi: ammAbi, functionName: "reserveTnock" }),
  ]);
  if (reserveEth === 0n || reserveTnock === 0n) { log("pool empty — skip"); return; }

  // pool price in tNOCK(human)/ETH = (reserveTnock/1e16)/(reserveEth/1e18)
  const poolPrice = (Number(reserveTnock) / 1e16) / (Number(reserveEth) / 1e18);
  const dev = (poolPrice - nockPerEth) / nockPerEth;
  log(`real=${nockPerEth.toFixed(0)} NOCK/ETH (NOCK $${nock}, ETH $${eth}) | pool=${poolPrice.toFixed(0)} | dev=${(dev * 100).toFixed(2)}%`);
  if (Math.abs(dev) < THRESHOLD) { log("within threshold — no trade"); return; }

  // Target reserves on the constant-product curve k = re*rt with rt'/re' = R/100
  // (the /100 folds the 1e18 vs 1e16 decimal gap: price = rt/re*100).
  // re' = sqrt(100*k/R), rt' = k/re'.
  const k = reserveEth * reserveTnock;
  const Rscaled = BigInt(Math.round(nockPerEth * 1e6)); // R * 1e6
  // re' = sqrt(100 * k * 1e6 / Rscaled)
  const reTarget = isqrt((100n * k * 1_000_000n) / Rscaled);

  const ethBal = await pc.getBalance({ address: account.address });
  let action;
  if (reTarget > reserveEth) {
    // pool has too many tNOCK per ETH (tNOCK too cheap) -> BUY tNOCK with ETH
    let amountIn = reTarget - reserveEth;
    if (amountIn > MAX_TRADE_ETH) amountIn = MAX_TRADE_ETH;
    const spendable = ethBal > GAS_RESERVE ? ethBal - GAS_RESERVE : 0n;
    if (amountIn > spendable) amountIn = spendable;
    if (amountIn <= 0n) { log("no spendable ETH (gas reserve) — skip buy"); return; }
    const [out] = await pc.readContract({ address: AMM, abi: ammAbi, functionName: "getAmountOut", args: [amountIn, reserveEth, reserveTnock] });
    const minOut = (out * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n;
    if (DRY_RUN) { log(`[dry] would BUY ~${formatUnits(out, TNOCK_DECIMALS)} tNOCK for ${formatEther(amountIn)} ETH`); return; }
    const hash = await wc.writeContract({ address: AMM, abi: ammAbi, functionName: "swapEthForTNock", args: [minOut], value: amountIn });
    await pc.waitForTransactionReceipt({ hash });
    action = `bought ${formatUnits(out, TNOCK_DECIMALS)} tNOCK for ${formatEther(amountIn)} ETH`;
  } else {
    // tNOCK too expensive -> SELL tNOCK for ETH
    const rtTarget = k / reTarget;
    let amountIn = rtTarget - reserveTnock;
    // cap the tNOCK trade at MAX_TRADE_ETH-equivalent
    const maxTnock = (MAX_TRADE_ETH * reserveTnock) / reserveEth;
    if (amountIn > maxTnock) amountIn = maxTnock;
    const tBal = await pc.readContract({ address: TNOCK, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
    if (amountIn > tBal) amountIn = tBal;
    if (amountIn <= 0n) { log("no tNOCK to sell — skip"); return; }
    const [out] = await pc.readContract({ address: AMM, abi: ammAbi, functionName: "getAmountOut", args: [amountIn, reserveTnock, reserveEth] });
    const minOut = (out * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n;
    if (DRY_RUN) { log(`[dry] would SELL ${formatUnits(amountIn, TNOCK_DECIMALS)} tNOCK for ~${formatEther(out)} ETH`); return; }
    await ensureAllowance(amountIn);
    const hash = await wc.writeContract({ address: AMM, abi: ammAbi, functionName: "swapTNockForEth", args: [amountIn, minOut] });
    await pc.waitForTransactionReceipt({ hash });
    action = `sold ${formatUnits(amountIn, TNOCK_DECIMALS)} tNOCK for ${formatEther(out)} ETH`;
  }
  log(`re-pegged: ${action}`);
}

async function main() {
  log(`peg keeper up | AMM ${AMM} | keeper ${account.address} | poll ${POLL_MS}ms | threshold ${(THRESHOLD * 100).toFixed(1)}% | maxTrade ${formatEther(MAX_TRADE_ETH)} ETH`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { await tick(); } catch (e) { log(`tick error: ${String(e?.message || e).slice(0, 200)}`); }
    if (ONCE) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
main();
