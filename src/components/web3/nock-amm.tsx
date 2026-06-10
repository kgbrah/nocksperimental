"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatEther, formatUnits, parseEther, parseUnits, type Hex } from "viem";
import { ArrowDownUp, Droplets, Loader2, Plus, Minus } from "lucide-react";
import { tNockAddress, TNOCK_DECIMALS } from "@/lib/game-contracts";
import {
  AMM_DONATION_FEE_BPS,
  AMM_LP_FEE_BPS,
  ammAbi,
  ammAddress,
  ammTnockAbi,
  bpsToPercent
} from "@/lib/amm-contracts";
import { DEFAULT_CHAIN_ID, explorerTx } from "@/lib/networks";

type Pool = {
  reserveEth: bigint;
  reserveTnock: bigint;
  totalSupply: bigint;
  lpBalance: bigint;
  tnockBalance: bigint;
  allowance: bigint;
};

type Tab = "swap" | "liquidity";

export function NockAmm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: DEFAULT_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const amm = ammAddress(DEFAULT_CHAIN_ID);
  const tnock = tNockAddress(DEFAULT_CHAIN_ID);

  const [pool, setPool] = useState<Pool | null>(null);
  const [tab, setTab] = useState<Tab>("swap");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<Hex | null>(null);

  // swap state
  const [swapDir, setSwapDir] = useState<"ethToTnock" | "tnockToEth">("ethToTnock");
  const [swapIn, setSwapIn] = useState("0.0001");
  const [quote, setQuote] = useState<{ out: bigint; donation: bigint } | null>(null);

  // liquidity state
  const [addEth, setAddEth] = useState("0.001");
  const [removePct, setRemovePct] = useState("100");

  const load = useCallback(async (): Promise<Pool | null> => {
    if (!publicClient || !amm || !tnock) return null;
    const [reserveEth, reserveTnock, totalSupply, lpBalance, tnockBalance, allowance] = await Promise.all([
      publicClient.readContract({ address: amm, abi: ammAbi, functionName: "reserveEth" }),
      publicClient.readContract({ address: amm, abi: ammAbi, functionName: "reserveTnock" }),
      publicClient.readContract({ address: amm, abi: ammAbi, functionName: "totalSupply" }),
      address
        ? publicClient.readContract({ address: amm, abi: ammAbi, functionName: "balanceOf", args: [address] })
        : Promise.resolve(BigInt(0)),
      address
        ? publicClient.readContract({ address: tnock, abi: ammTnockAbi, functionName: "balanceOf", args: [address] })
        : Promise.resolve(BigInt(0)),
      address
        ? publicClient.readContract({
            address: tnock,
            abi: ammTnockAbi,
            functionName: "allowance",
            args: [address, amm]
          })
        : Promise.resolve(BigInt(0))
    ]);
    return { reserveEth, reserveTnock, totalSupply, lpBalance, tnockBalance, allowance };
  }, [publicClient, amm, tnock, address]);

  const refresh = useCallback(async () => {
    try {
      const p = await load();
      if (p) setPool(p);
    } catch {
      /* transient read error */
    }
  }, [load]);

  useEffect(() => {
    let active = true;
    load()
      .then((p) => {
        if (active && p) setPool(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load]);

  // Live quote from the pool's own getAmountOut (mirrors the swap math exactly).
  // setQuote is only ever called from the async callbacks, so the effect never
  // updates state synchronously; an empty/invalid input makes getAmountOut
  // revert (InsufficientInput) and resolves to null via the catch.
  useEffect(() => {
    let active = true;
    const parse = () => {
      try {
        return swapDir === "ethToTnock"
          ? parseEther(swapIn || "0")
          : parseUnits(swapIn || "0", TNOCK_DECIMALS);
      } catch {
        return BigInt(0);
      }
    };
    const amountIn = parse();
    const [reserveIn, reserveOut] =
      swapDir === "ethToTnock"
        ? [pool?.reserveEth ?? BigInt(0), pool?.reserveTnock ?? BigInt(0)]
        : [pool?.reserveTnock ?? BigInt(0), pool?.reserveEth ?? BigInt(0)];

    const quotable = Boolean(publicClient && amm && pool) && amountIn > BigInt(0) && reserveIn > BigInt(0);
    const pending: Promise<{ out: bigint; donation: bigint } | null> = quotable
      ? publicClient!
          .readContract({
            address: amm!,
            abi: ammAbi,
            functionName: "getAmountOut",
            args: [amountIn, reserveIn, reserveOut]
          })
          .then(([out, donation]) => ({ out, donation }))
          .catch(() => null)
      : Promise.resolve(null);

    pending.then((q) => {
      if (active) setQuote(q);
    });
    return () => {
      active = false;
    };
  }, [publicClient, amm, pool, swapDir, swapIn]);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  const ensureAllowance = useCallback(
    async (needed: bigint) => {
      if (!tnock || !amm || !publicClient) throw new Error("contracts unavailable");
      if (pool && pool.allowance >= needed) return;
      const hash = await writeContractAsync({
        address: tnock,
        abi: ammTnockAbi,
        functionName: "approve",
        args: [amm, BigInt(2) ** BigInt(256) - BigInt(1)],
        chainId: DEFAULT_CHAIN_ID
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [tnock, amm, publicClient, pool, writeContractAsync]
  );

  const doSwap = () =>
    run("swap", async () => {
      if (!amm || !publicClient || !quote) throw new Error("no quote — enter an amount");
      const minOut = (quote.out * BigInt(995)) / BigInt(1000); // 0.5% slippage tolerance
      let hash: Hex;
      if (swapDir === "ethToTnock") {
        hash = await writeContractAsync({
          address: amm,
          abi: ammAbi,
          functionName: "swapEthForTNock",
          args: [minOut],
          value: parseEther(swapIn || "0"),
          chainId: DEFAULT_CHAIN_ID
        });
      } else {
        const amountIn = parseUnits(swapIn || "0", TNOCK_DECIMALS);
        await ensureAllowance(amountIn);
        hash = await writeContractAsync({
          address: amm,
          abi: ammAbi,
          functionName: "swapTNockForEth",
          args: [amountIn, minOut],
          chainId: DEFAULT_CHAIN_ID
        });
      }
      setLastTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    });

  const doAddLiquidity = () =>
    run("add", async () => {
      if (!amm || !publicClient || !pool) throw new Error("pool unavailable");
      const ethIn = parseEther(addEth || "0");
      if (ethIn <= BigInt(0)) throw new Error("enter an ETH amount");
      // Pair tNOCK at the current pool ratio (with a tiny buffer so rounding can't underfund).
      const pairTnock = (await publicClient.readContract({
        address: amm,
        abi: ammAbi,
        functionName: "quoteTnockForEth",
        args: [ethIn]
      })) as bigint;
      const tnockIn = pairTnock === BigInt(0) ? parseUnits("100", TNOCK_DECIMALS) : pairTnock;
      await ensureAllowance(tnockIn);
      const hash = await writeContractAsync({
        address: amm,
        abi: ammAbi,
        functionName: "addLiquidity",
        args: [tnockIn, BigInt(0)],
        value: ethIn,
        chainId: DEFAULT_CHAIN_ID
      });
      setLastTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    });

  const doRemoveLiquidity = () =>
    run("remove", async () => {
      if (!amm || !publicClient || !pool) throw new Error("pool unavailable");
      const pct = Math.max(0, Math.min(100, Number(removePct) || 0));
      const shares = (pool.lpBalance * BigInt(Math.round(pct * 100))) / BigInt(10000);
      if (shares <= BigInt(0)) throw new Error("no LP balance to remove");
      const hash = await writeContractAsync({
        address: amm,
        abi: ammAbi,
        functionName: "removeLiquidity",
        args: [shares, BigInt(0), BigInt(0)],
        chainId: DEFAULT_CHAIN_ID
      });
      setLastTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    });

  const price =
    pool && pool.reserveEth > BigInt(0)
      ? Number(formatUnits(pool.reserveTnock, TNOCK_DECIMALS)) / Number(formatEther(pool.reserveEth))
      : null;
  const lpSharePct =
    pool && pool.totalSupply > BigInt(0)
      ? (Number(pool.lpBalance) / Number(pool.totalSupply)) * 100
      : 0;
  const outDecimals = swapDir === "ethToTnock" ? TNOCK_DECIMALS : 18;
  const outSymbol = swapDir === "ethToTnock" ? "tNOCK" : "ETH";
  const inSymbol = swapDir === "ethToTnock" ? "ETH" : "tNOCK";

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Droplets size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">ETH / tNOCK pool</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">
          base sepolia · x·y=k
        </span>
      </div>

      {/* Pool stats */}
      <div className="grid grid-cols-2 gap-px border-b border-[#0B0B0B] bg-[#0B0B0B] sm:grid-cols-4">
        <Stat label="ETH reserve" value={pool ? Number(formatEther(pool.reserveEth)).toFixed(5) : "—"} />
        <Stat
          label="tNOCK reserve"
          value={pool ? Number(formatUnits(pool.reserveTnock, TNOCK_DECIMALS)).toFixed(2) : "—"}
        />
        <Stat label="price" value={price ? `${price.toFixed(0)} tNOCK/ETH` : "—"} />
        <Stat label="your LP share" value={`${lpSharePct.toFixed(2)}%`} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#0B0B0B]">
        {(["swap", "liquidity"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] ${tab === t ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF] text-[#4A4A4A]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "swap" ? (
        <div className="p-4">
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            you pay ({inSymbol})
            <input
              value={swapIn}
              onChange={(e) => setSwapIn(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setSwapDir((d) => (d === "ethToTnock" ? "tnockToEth" : "ethToTnock"));
                setSwapIn("");
              }}
              className="inline-flex items-center gap-1.5 border border-[#0B0B0B] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-[#0B0B0B] hover:text-[#FFFFFF]"
            >
              <ArrowDownUp size={12} /> flip
            </button>
          </div>
          <div className="mt-2 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              you receive ({outSymbol})
            </div>
            <div className="mt-0.5 font-mono text-sm">
              {quote ? formatUnits(quote.out, outDecimals) : "—"}
            </div>
            {quote && (
              <div className="mt-1 font-mono text-[10px] text-[#4A4A4A]">
                donation fee: {formatUnits(quote.donation, swapDir === "ethToTnock" ? 18 : TNOCK_DECIMALS)}{" "}
                {inSymbol} ({bpsToPercent(AMM_DONATION_FEE_BPS)}%)
              </div>
            )}
          </div>
          <Btn onClick={doSwap} busy={busy === "swap"} disabled={!isConnected || !quote || busy !== null}>
            Swap {inSymbol} → {outSymbol}
          </Btn>
        </div>
      ) : (
        <div className="p-4">
          <div className="border-b border-[#E5E5E5] pb-4">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              <Plus size={12} /> add liquidity
            </div>
            <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              ETH to deposit (tNOCK paired at pool ratio)
              <input
                value={addEth}
                onChange={(e) => setAddEth(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
              />
            </label>
            <p className="mt-1 font-mono text-[10px] text-[#4A4A4A]">
              pairs ≈{" "}
              {pool && price ? (Number(addEth || "0") * price).toFixed(2) : "—"} tNOCK · your tNOCK:{" "}
              {pool ? Number(formatUnits(pool.tnockBalance, TNOCK_DECIMALS)).toFixed(2) : "—"}
            </p>
            <Btn onClick={doAddLiquidity} busy={busy === "add"} disabled={!isConnected || busy !== null}>
              Add liquidity
            </Btn>
          </div>
          <div className="pt-4">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              <Minus size={12} /> remove liquidity
            </div>
            <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              percent of your position
              <input
                value={removePct}
                onChange={(e) => setRemovePct(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
              />
            </label>
            <Btn
              onClick={doRemoveLiquidity}
              busy={busy === "remove"}
              disabled={!isConnected || busy !== null || !pool || pool.lpBalance === BigInt(0)}
            >
              Remove liquidity
            </Btn>
          </div>
        </div>
      )}

      {/* Fee disclosure */}
      <div className="border-t border-[#0B0B0B] bg-[#F6F6F6] px-4 py-3 font-mono text-[10px] leading-5 text-[#4A4A4A]">
        Fees per swap: <strong className="text-[#0B0B0B]">{bpsToPercent(AMM_LP_FEE_BPS)}%</strong> to
        liquidity providers (kept in the pool) +{" "}
        <strong className="text-[#0B0B0B]">{bpsToPercent(AMM_DONATION_FEE_BPS)}%</strong> donation sent to
        the project wallet. Testnet value only (Base Sepolia ETH + test tNOCK); LP positions carry
        impermanent-loss risk like any AMM.
      </div>

      {lastTx && (
        <a
          href={explorerTx(DEFAULT_CHAIN_ID, lastTx)}
          target="_blank"
          rel="noreferrer"
          className="block break-all border-t border-[#0B0B0B] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2"
        >
          last tx: {lastTx.slice(0, 16)}…
        </a>
      )}
      {error && (
        <div className="border-t border-[#0B0B0B] bg-[#FFF0F0] px-4 py-3 font-mono text-xs break-all text-[#7A1A1A]">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FFFFFF] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</div>
      <div className="mt-0.5 font-mono text-xs text-[#0B0B0B]">{value}</div>
    </div>
  );
}

function Btn({
  onClick,
  busy,
  disabled,
  children
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`mt-3 inline-flex w-full items-center justify-center gap-2 border border-[#0B0B0B] px-4 py-2 text-sm font-medium ${busy || disabled ? "cursor-not-allowed bg-[#BFBFBF] text-[#4A4A4A]" : "bg-[#0B0B0B] text-[#FFFFFF]"}`}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
