"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, type Hex } from "viem";
import { ArrowRight, Check, Flame, Loader2, RefreshCw } from "lucide-react";
import { tNockAddress, TNOCK_DECIMALS } from "@/lib/game-contracts";
import { baseUnitsToNicks, isNockAddress, lockRootForNockAddress, tnockBurnAbi } from "@/lib/swap-contracts";
import { DEFAULT_CHAIN_ID, explorerTx } from "@/lib/networks";
import { orchestratorGet, orchestratorPost, ORCHESTRATOR_URL } from "@/lib/orchestrator";
import { useNockWallet } from "@/components/web3/nock-wallet-provider";

// Withdraw = burn tNOCK on Base (Nock.burn(amount, lockRoot)) -> receive native
// NOCK on the Nockchain fakenet. The lockRoot = sha256(payout address) is
// committed on-chain at burn time, so the destination can't be changed after the
// fact. The orchestrator verifies the burn and pays native NOCK; settlement runs
// server-side (queued), so we trigger then poll the durable status.

// The durable redemption row, once the orchestrator has verified the burn. The
// initial 202 from POST /bridge/redeem is the leaner queued ack
// ({ burn_tx_hash, status: "QUEUED" }) — every other field only appears after
// verification, so they are all optional and the render must guard them.
type Redemption = {
  burn_tx_hash: string;
  nock_address?: string;
  amount_nicks?: number;
  status: "VERIFIED" | "PAYING" | "PAID" | "FAILED" | "QUEUED";
  payout_tx_id?: string | null;
  payout_height?: number | null;
  note?: string | null;
};

const tnockErc20 = [
  ...tnockBurnAbi,
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }
] as const;

export function NockWithdrawFlow() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: DEFAULT_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const nockWallet = useNockWallet();
  const tnock = tNockAddress(DEFAULT_CHAIN_ID);

  const [tnockBalance, setTnockBalance] = useState<bigint | null>(null);
  const [amount, setAmount] = useState("");
  const [nockAddressInput, setNockAddressInput] = useState<string | null>(null);
  const [burnTx, setBurnTx] = useState<Hex | null>(null);
  // The payout address committed on-chain at burn time. Redemption must use THIS,
  // not the live input — the lock root binds it, so editing the field afterwards
  // would only produce a mismatch the orchestrator rejects.
  const [committedAddress, setCommittedAddress] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const irisDefault = nockWallet.kind === "iris" && nockWallet.address ? nockWallet.address : "";
  const nockAddress = nockAddressInput ?? irisDefault;

  const loadBalance = useCallback(async () => {
    if (!publicClient || !tnock || !address) return null;
    return publicClient.readContract({ address: tnock, abi: tnockErc20, functionName: "balanceOf", args: [address] });
  }, [publicClient, tnock, address]);

  useEffect(() => {
    let active = true;
    loadBalance().then((b) => { if (active && b !== null && b !== undefined) setTnockBalance(b); }).catch(() => {});
    return () => { active = false; };
  }, [loadBalance]);

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

  const burnWei = (() => {
    try {
      return parseUnits(amount || "0", TNOCK_DECIMALS);
    } catch {
      return BigInt(0);
    }
  })();
  const nicks = baseUnitsToNicks(burnWei);

  const doBurn = () =>
    run("burn", async () => {
      if (!tnock || !publicClient) throw new Error("tNOCK unavailable on this chain");
      if (burnWei <= BigInt(0)) throw new Error("enter a tNOCK amount");
      if (!isNockAddress(nockAddress)) throw new Error("enter a valid base58 Nock payout address");
      if (nicks < BigInt(1)) throw new Error("amount converts to zero nicks — withdraw at least 1 nick's worth");
      if (tnockBalance !== null && burnWei > tnockBalance) throw new Error("amount exceeds your tNOCK balance");
      const hash = await writeContractAsync({
        address: tnock,
        abi: tnockBurnAbi,
        functionName: "burn",
        args: [burnWei, lockRootForNockAddress(nockAddress)],
        chainId: DEFAULT_CHAIN_ID
      });
      setBurnTx(hash);
      setCommittedAddress(nockAddress);
      setRedemption(null);
      await publicClient.waitForTransactionReceipt({ hash });
      const b = await loadBalance();
      if (b !== null && b !== undefined) setTnockBalance(b);
    });

  const doRedeem = () =>
    run("redeem", async () => {
      if (!burnTx) throw new Error("burn first");
      // Redeem against the address committed at burn time, not the live input.
      const redeemAddress = committedAddress ?? nockAddress;
      if (!isNockAddress(redeemAddress)) throw new Error("enter the Nock address the burn committed to");
      // The orchestrator enqueues the native-NOCK payout and returns immediately
      // (202 QUEUED) — trigger it, then poll the durable status for the real
      // PAID/FAILED outcome. The burn_tx_hash makes this idempotent, so a retry
      // after any reachability error never double-pays.
      let out: Redemption;
      try {
        out = (await orchestratorPost("/bridge/redeem", { burnTxHash: burnTx, nockAddress: redeemAddress })) as Redemption;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          throw new Error(`Couldn't reach the withdrawal service at ${ORCHESTRATOR_URL}. Your burn on Base succeeded and remains valid — retry this step.`);
        }
        throw e instanceof Error ? e : new Error(msg);
      }
      setRedemption(out);
      if (out.status === "PAID") return;
      if (out.status === "FAILED") throw new Error(out.note || "payout failed — your burn remains valid; retry");

      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 8000));
        let r: Redemption | null = null;
        try {
          r = (await orchestratorGet(`/bridge/redemption/${burnTx}`)) as Redemption;
        } catch {
          /* 404 (not recorded yet) or transient — keep polling */
        }
        if (r) {
          setRedemption(r);
          if (r.status === "PAID") return;
          if (r.status === "FAILED") throw new Error(r.note || "payout failed — your burn remains valid; retry");
        }
      }
      throw new Error("payout is taking longer than expected — it may still complete; use 'check status' shortly");
    });

  const checkStatus = () =>
    run("status", async () => {
      if (!burnTx) throw new Error("no burn to check");
      try {
        const r = (await orchestratorGet(`/bridge/redemption/${burnTx}`)) as Redemption;
        setRedemption(r);
      } catch (e) {
        if (e instanceof Error && /\(404\)/.test(e.message)) throw new Error("no withdrawal recorded yet — submit the redeem step first");
        throw e;
      }
    });

  const fmtBal = tnockBalance === null ? "—" : Number(formatUnits(tnockBalance, TNOCK_DECIMALS)).toFixed(2);

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Flame size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Withdraw tNOCK → native NOCK</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">base sepolia → fakenet</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="Burn tNOCK (commit destination)" done={burnTx !== null} icon={<Flame size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            <code>Nock.burn(amount, lockRoot)</code> destroys the tNOCK on Base and writes{" "}
            <code>sha256(your Nock address)</code> into the burn event — binding the payout destination
            on-chain so it can&apos;t be changed afterwards.
          </p>
          <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            tNOCK to withdraw
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 50"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-sm" />
          </label>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">
            Nock payout address {nockWallet.kind === "iris" ? "(from Iris)" : ""}
            <input value={nockAddress} onChange={(e) => setNockAddressInput(e.target.value)} placeholder="base58 fakenet address"
              className="mt-1 w-full border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-xs" />
          </label>
          {burnWei > BigInt(0) && (
            <p className="mt-2 font-mono text-xs text-[#4A4A4A]">→ {nicks.toString()} nicks on fakenet</p>
          )}
          <Btn onClick={doBurn} busy={busy === "burn"} disabled={!isConnected || busy !== null}>
            Burn &amp; commit <ArrowRight size={14} />
          </Btn>
          {burnTx && <TxLink hash={burnTx} label="burn tx" />}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">your tNOCK: {fmtBal}</p>
        </Step>

        <Step index={2} title="Receive native NOCK" done={redemption?.status === "PAID"} icon={<Check size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The bridge verifies your burn on Base Sepolia (event, token, confirmations, address binding)
            and pays native NOCK to your address on the fakenet. Mining the payout takes a minute or two.
          </p>
          <Btn onClick={doRedeem} busy={busy === "redeem"} disabled={!burnTx || busy !== null}>
            Withdraw{busy === "redeem" ? " (mining…)" : ""} <ArrowRight size={14} />
          </Btn>
          {burnTx && (
            <button type="button" onClick={checkStatus} disabled={busy !== null}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 disabled:opacity-40">
              <RefreshCw size={11} /> check status
            </button>
          )}
          {redemption && (
            <div className="mt-3 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2 font-mono text-xs">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">withdrawal {redemption.status}</div>
              <div className="mt-1 break-all">
                {redemption.amount_nicks != null ? `${redemption.amount_nicks} nicks` : "verifying burn…"}
                {redemption.nock_address ? ` → ${redemption.nock_address.slice(0, 16)}…` : ""}
              </div>
              {redemption.payout_tx_id && (
                <div className="mt-1 break-all text-[#4A4A4A]">
                  payout tx {redemption.payout_tx_id}{redemption.payout_height ? ` · block ${redemption.payout_height}` : ""}
                </div>
              )}
              {redemption.note && <div className="mt-1 break-all text-[#7A1A1A]">{redemption.note}</div>}
            </div>
          )}
        </Step>
      </div>

      {error && (
        <div className="border-t border-[#0B0B0B] bg-[#FFF0F0] px-4 py-3 font-mono text-xs break-all text-[#7A1A1A]">{error}</div>
      )}
    </div>
  );
}

function Step({ index, title, done, icon, children }: { index: number; title: string; done: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center border border-[#0B0B0B] text-xs font-bold ${done ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}>{done ? "✓" : index}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]">{icon}{title}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Btn({ onClick, busy, disabled, children }: { onClick: () => void; busy?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled}
      className={`mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] px-4 py-2 text-sm font-medium ${busy || disabled ? "cursor-not-allowed bg-[#BFBFBF] text-[#4A4A4A]" : "bg-[#0B0B0B] text-[#FFFFFF]"}`}>
      {busy && <Loader2 size={14} className="animate-spin" />}{children}
    </button>
  );
}

function TxLink({ hash, label }: { hash: Hex; label: string }) {
  return (
    <a href={explorerTx(DEFAULT_CHAIN_ID, hash)} target="_blank" rel="noreferrer"
      className="mt-2 block break-all font-mono text-[10px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2">
      {label}: {hash.slice(0, 16)}…
    </a>
  );
}
