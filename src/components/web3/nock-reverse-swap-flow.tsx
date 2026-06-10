"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatEther, formatUnits, parseUnits, type Hex } from "viem";
import { ArrowRight, Check, Coins, Copy, Loader2, RefreshCw, Wallet } from "lucide-react";
import { tNockAddress, TNOCK_DECIMALS } from "@/lib/game-contracts";
import { AMM_DONATION_FEE_BPS, ammAbi, ammAddress, ammTnockAbi, bpsToPercent } from "@/lib/amm-contracts";
import { DEFAULT_CHAIN_ID, explorerTx } from "@/lib/networks";
import { ORCHESTRATOR_URL, orchestratorGet, orchestratorPost, staticUnavailableReason } from "@/lib/orchestrator";

// NOCK -> tNOCK -> ETH. The mint leg (lock native NOCK on the fakenet, observe
// it, attest via our 3-of-5 operator quorum, mint tNOCK on Base) is hosted by
// the co-located orchestrator. The sell leg (tNOCK -> ETH) is the on-chain AMM.
const ORCH = ORCHESTRATOR_URL;

type Deposit = {
  deposit_id: string;
  nock_pkh?: string;
  nockDepositAddress?: string;
  depositId?: string;
  evm_address?: string;
  amount_nicks: number | null;
  amount_base: string | null;
  status: "AWAITING" | "MINTING" | "MINTED" | "FAILED";
  mint_tx: string | null;
  note: string | null;
  minDepositNicks?: number;
  instructions?: string;
};

function asOrchestratorError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(
      `Couldn't reach the bridge mint service at ${ORCH}. Run the orchestrator (or set NEXT_PUBLIC_ORCHESTRATOR_URL) and retry.`
    );
  }
  return e instanceof Error ? e : new Error(msg);
}

export function NockReverseSwapFlow() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: DEFAULT_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const amm = ammAddress(DEFAULT_CHAIN_ID);
  const tnock = tNockAddress(DEFAULT_CHAIN_ID);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — allocate deposit + mint tNOCK
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const depositId = deposit?.deposit_id ?? deposit?.depositId ?? null;
  const depositAddr = deposit?.nockDepositAddress ?? deposit?.nock_pkh ?? null;

  // Step 2 — sell tNOCK for ETH on the AMM
  const [reserveEth, setReserveEth] = useState<bigint | null>(null);
  const [reserveTnock, setReserveTnock] = useState<bigint | null>(null);
  const [tnockBalance, setTnockBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [quote, setQuote] = useState<{ out: bigint; donation: bigint } | null>(null);
  const [sellTx, setSellTx] = useState<Hex | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(staticUnavailableReason());
  }, []);

  const loadChain = useCallback(async () => {
    if (!publicClient || !amm || !tnock) return null;
    const [re, rt, bal, alw] = await Promise.all([
      publicClient.readContract({ address: amm, abi: ammAbi, functionName: "reserveEth" }),
      publicClient.readContract({ address: amm, abi: ammAbi, functionName: "reserveTnock" }),
      address
        ? publicClient.readContract({ address: tnock, abi: ammTnockAbi, functionName: "balanceOf", args: [address] })
        : Promise.resolve(null),
      address
        ? publicClient.readContract({ address: tnock, abi: ammTnockAbi, functionName: "allowance", args: [address, amm] })
        : Promise.resolve(null)
    ]);
    return { re, rt, bal, alw };
  }, [publicClient, amm, tnock, address]);

  const refreshChain = useCallback(async () => {
    try {
      const v = await loadChain();
      if (v) {
        setReserveEth(v.re as bigint);
        setReserveTnock(v.rt as bigint);
        setTnockBalance(v.bal as bigint | null);
        setAllowance(v.alw as bigint | null);
      }
    } catch {
      /* transient */
    }
  }, [loadChain]);

  useEffect(() => {
    let active = true;
    loadChain()
      .then((v) => {
        if (active && v) {
          setReserveEth(v.re as bigint);
          setReserveTnock(v.rt as bigint);
          setTnockBalance(v.bal as bigint | null);
          setAllowance(v.alw as bigint | null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loadChain]);

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

  // Step 1a — allocate a fresh, orchestrator-watched deposit address bound to my Base address.
  const doAllocate = () =>
    run("allocate", async () => {
      if (!address) throw new Error("connect a Base wallet first");
      try {
        const out = (await orchestratorPost("/bridge/deposit", { evmAddress: address })) as Deposit;
        setDeposit(out);
      } catch (e) {
        throw asOrchestratorError(e);
      }
    });

  // Step 1b — after the user sends native NOCK to the deposit address, mint the tNOCK.
  const doMint = () =>
    run("mint", async () => {
      if (!depositId) throw new Error("get a deposit address first");
      try {
        const out = (await orchestratorPost("/bridge/deposit/mint", { depositId })) as Deposit;
        setDeposit((d) => ({ ...(d || {}), ...out }));
        if (out.status === "MINTED") {
          await refreshChain();
          return;
        }
        if (out.status === "FAILED") throw new Error(out.note || "mint failed — your NOCK stays locked; retry");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/failed to fetch|networkerror|load failed|\(5\d\d\)|timed?\s?out/i.test(msg)) {
          throw asOrchestratorError(e);
        }
      }
      // Poll the durable status until the mint resolves (attest + submitDeposit + inclusion).
      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 8000));
        let r: Deposit | null = null;
        try {
          r = (await orchestratorGet(`/bridge/deposit/${depositId}`)) as Deposit;
        } catch {
          /* keep polling */
        }
        if (r) {
          setDeposit((d) => ({ ...(d || {}), ...r }));
          if (r.status === "MINTED") {
            await refreshChain();
            return;
          }
          if (r.status === "FAILED") throw new Error(r.note || "mint failed — your NOCK stays locked; retry");
        }
      }
      throw new Error("mint is taking longer than expected — it may still complete; use 'check status' shortly");
    });

  const checkMint = () =>
    run("status", async () => {
      if (!depositId) throw new Error("no deposit to check");
      try {
        const r = (await orchestratorGet(`/bridge/deposit/${depositId}`)) as Deposit;
        setDeposit((d) => ({ ...(d || {}), ...r }));
        if (r.status === "MINTED") await refreshChain();
      } catch (e) {
        throw asOrchestratorError(e);
      }
    });

  // Live AMM quote for the tNOCK -> ETH sell.
  const sellWei = (() => {
    try {
      return parseUnits(sellAmount || "0", TNOCK_DECIMALS);
    } catch {
      return BigInt(0);
    }
  })();
  useEffect(() => {
    let active = true;
    const quotable =
      Boolean(publicClient && amm) && sellWei > BigInt(0) && (reserveTnock ?? BigInt(0)) > BigInt(0);
    const pending: Promise<{ out: bigint; donation: bigint } | null> = quotable
      ? publicClient!
          .readContract({
            address: amm!,
            abi: ammAbi,
            functionName: "getAmountOut",
            args: [sellWei, reserveTnock as bigint, reserveEth as bigint]
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
  }, [publicClient, amm, sellWei, reserveTnock, reserveEth]);

  const doSell = () =>
    run("sell", async () => {
      if (!amm || !tnock || !publicClient || !quote) throw new Error("no quote — enter a tNOCK amount");
      if (sellWei <= BigInt(0)) throw new Error("enter a tNOCK amount to sell");
      if ((allowance ?? BigInt(0)) < sellWei) {
        const ahash = await writeContractAsync({
          address: tnock,
          abi: ammTnockAbi,
          functionName: "approve",
          args: [amm, BigInt(2) ** BigInt(256) - BigInt(1)],
          chainId: DEFAULT_CHAIN_ID
        });
        await publicClient.waitForTransactionReceipt({ hash: ahash });
      }
      const minOut = (quote.out * BigInt(995)) / BigInt(1000); // 0.5% slippage tolerance
      const hash = await writeContractAsync({
        address: amm,
        abi: ammAbi,
        functionName: "swapTNockForEth",
        args: [sellWei, minOut],
        chainId: DEFAULT_CHAIN_ID
      });
      setSellTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshChain();
    });

  const fmtT = (v: bigint | null) => (v === null ? "—" : Number(formatUnits(v, TNOCK_DECIMALS)).toLocaleString());
  const minted = deposit?.status === "MINTED";

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Coins size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">native NOCK → tNOCK → ETH</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">
          fakenet · base sepolia
        </span>
      </div>

      {notice ? (
        <div className="border-b border-[#0B0B0B] bg-[#FFF4D6] px-4 py-3 text-xs leading-relaxed text-[#3A3A3A]">
          <span className="font-mono font-bold uppercase tracking-[0.12em]">Heads up — step 1 (mint) is local-only here.</span>{" "}
          {notice} Step 2 (sell tNOCK → ETH) is on-chain and works anywhere.
        </div>
      ) : null}

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        {/* Step 1: lock NOCK -> mint tNOCK */}
        <Step index={1} title="Lock NOCK → mint tNOCK" done={minted} icon={<Wallet size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            Get a one-time deposit address, send native NOCK to it from your fakenet wallet, then mint an
            equal amount of <code>tNOCK</code> to your connected Base address. Every minted tNOCK is backed
            1:1 by the NOCK you locked.
          </p>
          {!depositId ? (
            <Btn onClick={doAllocate} busy={busy === "allocate"} disabled={!isConnected || busy !== null}>
              Get deposit address <ArrowRight size={14} />
            </Btn>
          ) : (
            <>
              <div className="mt-3 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
                  send native NOCK to
                </div>
                <button
                  type="button"
                  onClick={() => depositAddr && navigator.clipboard?.writeText(depositAddr)}
                  className="mt-1 flex w-full items-start gap-1.5 break-all text-left font-mono text-xs hover:text-[#000]"
                  title="copy"
                >
                  <Copy size={12} className="mt-0.5 shrink-0" /> {depositAddr}
                </button>
                {deposit?.minDepositNicks ? (
                  <div className="mt-1 font-mono text-[10px] text-[#4A4A4A]">
                    min {deposit.minDepositNicks.toLocaleString()} nicks ({deposit.minDepositNicks / 65536} NOCK)
                  </div>
                ) : null}
              </div>
              <Btn onClick={doMint} busy={busy === "mint"} disabled={busy !== null || minted}>
                {minted ? "Minted ✓" : busy === "mint" ? "Minting…" : "I've sent NOCK — mint tNOCK"}{" "}
                {!minted && <ArrowRight size={14} />}
              </Btn>
              <button
                type="button"
                onClick={checkMint}
                disabled={busy !== null}
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 disabled:opacity-40"
              >
                <RefreshCw size={11} /> check status
              </button>
              {deposit && (
                <div className="mt-3 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-xs">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
                    deposit {deposit.status}
                  </div>
                  {deposit.amount_nicks ? (
                    <div className="mt-1">
                      {deposit.amount_nicks.toLocaleString()} nicks → {deposit.amount_nicks / 65536} tNOCK
                    </div>
                  ) : null}
                  {deposit.mint_tx && (
                    <a
                      href={explorerTx(DEFAULT_CHAIN_ID, deposit.mint_tx as Hex)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all underline decoration-[#737373] underline-offset-2"
                    >
                      mint tx {deposit.mint_tx.slice(0, 16)}…
                    </a>
                  )}
                  {deposit.note && <div className="mt-1 break-all text-[#7A1A1A]">{deposit.note}</div>}
                </div>
              )}
            </>
          )}
        </Step>

        {/* Step 2: sell tNOCK -> ETH */}
        <Step index={2} title="Swap tNOCK → ETH" done={sellTx !== null} icon={<Check size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            Sell your <code>tNOCK</code> for Base Sepolia ETH on the constant-product pool. Reserves:{" "}
            {reserveEth !== null ? Number(formatEther(reserveEth)).toFixed(5) : "—"} ETH ·{" "}
            {fmtT(reserveTnock)} tNOCK.
          </p>
          <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            tNOCK to sell
            <input
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 5"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            <span>your tNOCK: {fmtT(tnockBalance)}</span>
            {tnockBalance ? (
              <button
                type="button"
                onClick={() => setSellAmount(formatUnits(tnockBalance, TNOCK_DECIMALS))}
                className="underline decoration-[#737373] underline-offset-2"
              >
                max
              </button>
            ) : null}
          </div>
          <div className="mt-2 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">you receive (ETH)</div>
            <div className="mt-0.5 font-mono text-sm">{quote ? formatEther(quote.out) : "—"}</div>
            {quote && (
              <div className="mt-1 font-mono text-[10px] text-[#4A4A4A]">
                donation fee: {formatUnits(quote.donation, TNOCK_DECIMALS)} tNOCK ({bpsToPercent(AMM_DONATION_FEE_BPS)}%)
              </div>
            )}
          </div>
          <Btn onClick={doSell} busy={busy === "sell"} disabled={!isConnected || !quote || busy !== null}>
            Sell tNOCK → ETH <ArrowRight size={14} />
          </Btn>
          {sellTx && (
            <a
              href={explorerTx(DEFAULT_CHAIN_ID, sellTx)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2"
            >
              sell tx: {sellTx.slice(0, 14)}…
            </a>
          )}
        </Step>
      </div>

      {error && (
        <div className="border-t border-[#0B0B0B] bg-[#FFF0F0] px-4 py-3 font-mono text-xs break-all text-[#7A1A1A]">
          {error}
        </div>
      )}
    </div>
  );
}

function Step({
  index,
  title,
  done,
  icon,
  children
}: {
  index: number;
  title: string;
  done: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center border border-[#0B0B0B] text-xs font-bold ${done ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}
        >
          {done ? "✓" : index}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]">
          {icon}
          {title}
        </span>
      </div>
      <div className="mt-3">{children}</div>
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
      className={`mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] px-4 py-2 text-sm font-medium ${busy || disabled ? "cursor-not-allowed bg-[#BFBFBF] text-[#4A4A4A]" : "bg-[#0B0B0B] text-[#FFFFFF]"}`}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
