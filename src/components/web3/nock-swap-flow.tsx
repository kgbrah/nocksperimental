"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, parseEther, parseUnits, type Hex } from "viem";
import { ArrowRight, Check, Coins, Flame, Loader2, RefreshCw, Wallet } from "lucide-react";
import { tNockAddress, TNOCK_DECIMALS } from "@/lib/game-contracts";
import {
  baseUnitsToNicks,
  isNockAddress,
  lockRootForNockAddress,
  swapVaultAbi,
  swapVaultAddress,
  tnockBurnAbi
} from "@/lib/swap-contracts";
import { DEFAULT_CHAIN_ID, explorerTx } from "@/lib/networks";
import { useNockWallet } from "@/components/web3/nock-wallet-provider";
import { ORCHESTRATOR_URL, orchestratorGet, orchestratorPost, staticUnavailableReason } from "@/lib/orchestrator";

// The /bridge/redeem leg (verify the Base burn, pay native NOCK on fakenet) is
// hosted by the same co-located orchestrator the %fair game uses; steps 1-2
// (swap + burn) are pure on-chain and work anywhere, only step 3 needs it.
const ORCH = ORCHESTRATOR_URL;

type Redemption = {
  burn_tx_hash: string;
  nock_address: string;
  amount_base: string;
  amount_nicks: number;
  status: "VERIFIED" | "PAYING" | "PAID" | "FAILED";
  payout_tx_id: string | null;
  payout_height: number | null;
  note: string | null;
};

async function postJSON(path: string, body: unknown) {
  return orchestratorPost(path, body) as Promise<Redemption>;
}

// A bare "Failed to fetch" on the redeem step means the orchestrator host
// itself is unreachable (it's a local/co-located service, not on the hosted
// site) — say so instead of leaving a cryptic browser error.
function asOrchestratorError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(
      `Couldn't reach the redemption service at ${ORCH}. The burn on Base succeeded — run the orchestrator (or set NEXT_PUBLIC_ORCHESTRATOR_URL) and retry this step; your burn tx remains valid.`
    );
  }
  return e instanceof Error ? e : new Error(msg);
}

// a user-typed amount is invalid mid-keystroke more often than not — treat unparseable as zero.
function parseOrZero(parse: () => bigint): bigint {
  try {
    return parse();
  } catch {
    return BigInt(0);
  }
}

export function NockSwapFlow() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: DEFAULT_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const nockWallet = useNockWallet();

  const vault = swapVaultAddress(DEFAULT_CHAIN_ID);
  const tnock = tNockAddress(DEFAULT_CHAIN_ID);

  const [rate, setRate] = useState<bigint | null>(null);
  const [reserves, setReserves] = useState<bigint | null>(null);
  const [tnockBalance, setTnockBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — ETH -> tNOCK
  const [ethIn, setEthIn] = useState("0.001");
  const [swapTx, setSwapTx] = useState<Hex | null>(null);

  // Step 2 — burn tNOCK with the payout address committed in the lockRoot.
  // null = untouched, so a connected Iris wallet provides the default.
  const [burnAmount, setBurnAmount] = useState("");
  const [nockAddressInput, setNockAddressInput] = useState<string | null>(null);
  const [burnTx, setBurnTx] = useState<Hex | null>(null);
  const irisDefault = nockWallet.kind === "iris" && nockWallet.address ? nockWallet.address : "";
  const nockAddress = nockAddressInput ?? irisDefault;

  // Step 3 — redeem the burn for native NOCK on fakenet
  const [redemption, setRedemption] = useState<Redemption | null>(null);

  // Whether the redeem leg's orchestrator is reachable from THIS origin. Computed client-side
  // (depends on window) so users are warned BEFORE burning tNOCK they couldn't redeem here.
  const [redeemNotice, setRedeemNotice] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedeemNotice(staticUnavailableReason());
  }, []);

  const loadChain = useCallback(async () => {
    if (!publicClient || !vault || !tnock) return null;
    const [r, res, bal] = await Promise.all([
      publicClient.readContract({ address: vault, abi: swapVaultAbi, functionName: "rate" }),
      publicClient.readContract({ address: vault, abi: swapVaultAbi, functionName: "reserves" }),
      address
        ? publicClient.readContract({
            address: tnock,
            abi: tnockBurnAbi,
            functionName: "balanceOf",
            args: [address]
          })
        : Promise.resolve(null)
    ]);
    return { rate: r, reserves: res, balance: bal };
  }, [publicClient, vault, tnock, address]);

  const refreshChain = useCallback(async () => {
    try {
      const v = await loadChain();
      if (v) {
        setRate(v.rate);
        setReserves(v.reserves);
        setTnockBalance(v.balance);
      }
    } catch {
      /* transient read failure — leave previous values */
    }
  }, [loadChain]);

  // Sync vault/token state from the chain (an external system) on mount and
  // whenever the reader/account changes.
  useEffect(() => {
    let active = true;
    loadChain()
      .then((v) => {
        if (active && v) {
          setRate(v.rate);
          setReserves(v.reserves);
          setTnockBalance(v.balance);
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

  const ethWei = parseOrZero(() => parseEther(ethIn || "0"));
  const quoted = rate !== null ? (ethWei * rate) / BigInt("1000000000000000000") : null;

  const doSwap = () =>
    run("swap", async () => {
      if (!vault || !publicClient) throw new Error("vault unavailable on this chain");
      if (ethWei <= BigInt(0)) throw new Error("enter an ETH amount");
      const hash = await writeContractAsync({
        address: vault,
        abi: swapVaultAbi,
        functionName: "swapEthForTNock",
        value: ethWei,
        chainId: DEFAULT_CHAIN_ID
      });
      setSwapTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshChain();
    });

  const burnWei = parseOrZero(() => parseUnits(burnAmount || "0", TNOCK_DECIMALS));
  const burnNicks = baseUnitsToNicks(burnWei);

  const doBurn = () =>
    run("burn", async () => {
      if (!tnock || !publicClient) throw new Error("tNOCK unavailable on this chain");
      if (burnWei <= BigInt(0)) throw new Error("enter a tNOCK amount");
      if (!isNockAddress(nockAddress)) throw new Error("enter a valid base58 Nock address first");
      if (burnNicks < BigInt(1)) throw new Error("amount converts to zero nicks — burn at least 1 nick's worth");
      const hash = await writeContractAsync({
        address: tnock,
        abi: tnockBurnAbi,
        functionName: "burn",
        args: [burnWei, lockRootForNockAddress(nockAddress)],
        chainId: DEFAULT_CHAIN_ID
      });
      setBurnTx(hash);
      setRedemption(null);
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshChain();
    });

  const doRedeem = () =>
    run("redeem", async () => {
      if (!burnTx) throw new Error("burn first (or paste a burn tx hash)");
      if (!isNockAddress(nockAddress)) throw new Error("enter the Nock address the burn committed to");
      // The orchestrator verifies the burn on Base, then funds + waits for the
      // fakenet payout tx to be mined — expect this call to take a minute or two.
      try {
        const out = await postJSON("/bridge/redeem", { burnTxHash: burnTx, nockAddress });
        setRedemption(out);
      } catch (e) {
        throw asOrchestratorError(e);
      }
    });

  const checkRedemption = () =>
    run("status", async () => {
      if (!burnTx) throw new Error("no burn tx to check");
      try {
        const j = (await orchestratorGet(`/bridge/redemption/${burnTx}`)) as Redemption;
        setRedemption(j);
      } catch (e) {
        if (e instanceof Error && /\(404\)/.test(e.message)) {
          throw new Error("no redemption recorded yet — submit step 3 first");
        }
        throw asOrchestratorError(e);
      }
    });

  const fmtT = (v: bigint | null) => (v === null ? "—" : formatUnits(v, TNOCK_DECIMALS));

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Coins size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">ETH → tNOCK → native NOCK</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">
          base sepolia · fakenet · no minimum
        </span>
      </div>

      {redeemNotice ? (
        <div className="border-b border-[#0B0B0B] bg-[#FFF4D6] px-4 py-3 text-xs leading-relaxed text-[#3A3A3A]">
          <span className="font-mono font-bold uppercase tracking-[0.12em]">Heads up — step 3 (redeem) is local-only here.</span>{" "}
          {redeemNotice} Steps 1–2 (swap + burn) work on this hosted site, but{" "}
          <span className="font-semibold">don&apos;t burn tNOCK you need back as native NOCK unless you can run the orchestrator</span> — your burn tx stays valid and is redeemable later.
        </div>
      ) : null}

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-3">
        <Step
          index={1}
          title="Swap ETH for tNOCK"
          done={swapTx !== null}
          icon={<Wallet size={16} />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The vault vends tNOCK from on-chain reserves at a posted rate
            {rate !== null ? ` (${formatUnits(rate, TNOCK_DECIMALS)} tNOCK / ETH)` : ""}. Reserves:{" "}
            {fmtT(reserves)} tNOCK.
          </p>
          <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            ETH in
            <input
              value={ethIn}
              onChange={(e) => setEthIn(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
            />
          </label>
          <p className="mt-2 font-mono text-xs text-[#4A4A4A]">≈ {quoted === null ? "—" : fmtT(quoted)} tNOCK</p>
          <Btn onClick={doSwap} busy={busy === "swap"} disabled={!isConnected || busy !== null}>
            Swap <ArrowRight size={14} />
          </Btn>
          {swapTx && <TxLink hash={swapTx} label="swap tx" />}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            your tNOCK: {fmtT(tnockBalance)}
          </p>
        </Step>

        <Step index={2} title="Burn tNOCK to bridge" done={burnTx !== null} icon={<Flame size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            <code>Nock.burn(amount, lockRoot)</code> destroys tNOCK on Base and commits your fakenet
            payout address into the burn event — the destination can&apos;t be swapped afterwards.
          </p>
          <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            tNOCK to bridge
            <input
              value={burnAmount}
              onChange={(e) => setBurnAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 50"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            Nock payout address {nockWallet.kind === "iris" ? "(from Iris)" : ""}
            <input
              value={nockAddress}
              onChange={(e) => setNockAddressInput(e.target.value)}
              placeholder="base58 fakenet address"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-xs"
            />
          </label>
          {burnWei > BigInt(0) && (
            <p className="mt-2 font-mono text-xs text-[#4A4A4A]">→ {burnNicks.toString()} nicks on fakenet</p>
          )}
          <Btn onClick={doBurn} busy={busy === "burn"} disabled={!isConnected || busy !== null}>
            Burn &amp; commit <ArrowRight size={14} />
          </Btn>
          {burnTx && <TxLink hash={burnTx} label="burn tx" />}
        </Step>

        <Step
          index={3}
          title="Redeem native NOCK"
          done={redemption?.status === "PAID"}
          icon={<Check size={16} />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The orchestrator verifies your burn on Base Sepolia (event, token, confirmations, address
            binding) and pays native NOCK to your address on the fakenet. Mining the payout takes a
            minute or two.
          </p>
          <Btn onClick={doRedeem} busy={busy === "redeem"} disabled={!burnTx || busy !== null}>
            Redeem{busy === "redeem" ? " (mining…)" : ""} <ArrowRight size={14} />
          </Btn>
          {burnTx && (
            <button
              type="button"
              onClick={checkRedemption}
              disabled={busy !== null}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 disabled:opacity-40"
            >
              <RefreshCw size={11} /> check status
            </button>
          )}
          {redemption && (
            <div className="mt-3 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-xs">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
                redemption {redemption.status}
              </div>
              <div className="mt-1 break-all">
                {redemption.amount_nicks} nicks → {redemption.nock_address.slice(0, 16)}…
              </div>
              {redemption.payout_tx_id && (
                <div className="mt-1 break-all text-[#4A4A4A]">
                  payout tx {redemption.payout_tx_id}
                  {redemption.payout_height ? ` · block ${redemption.payout_height}` : ""}
                </div>
              )}
              {redemption.note && <div className="mt-1 break-all text-[#7A1A1A]">{redemption.note}</div>}
            </div>
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

function TxLink({ hash, label }: { hash: Hex; label: string }) {
  return (
    <a
      href={explorerTx(DEFAULT_CHAIN_ID, hash)}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block break-all font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2"
    >
      {label}: {hash.slice(0, 14)}…
    </a>
  );
}
