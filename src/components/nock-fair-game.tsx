"use client";

import { useCallback, useState } from "react";
import { ArrowRight, BadgeCheck, Coins, Eye, Lock, RefreshCw, ShieldAlert, Trophy } from "lucide-react";

// Drives a REAL Nock %fair round through the cross-chain orchestrator
// (services/orchestrator): the house commits, the escrow is funded on the Nock
// chain, and at reveal the provably-fair winner's claim is built + submitted —
// consensus pays the winner. Unlike the in-browser demo, value actually moves
// (fakenet/testnet), and a stalled pot is recoverable via the forfeit branch.
//
// The orchestrator is a separate co-located service (it shells out to the
// verified Nock CLIs + reaches the node's private gRPC), so this component talks
// to it over HTTP. Set NEXT_PUBLIC_ORCHESTRATOR_URL for a non-local deployment.

const ORCH = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://127.0.0.1:8787";

type Phase = "idle" | "open" | "funded" | "settled" | "error";
type Settlement = { settled: boolean; payTo?: string; amountNicks?: number; txId?: string | null; height?: number; refund?: boolean; reason?: string };
type Receipt = { body: { phase: string; winner?: string; outcome?: number; settlement?: Settlement }; rootHash: string; signature: string };

async function postJSON(path: string, body: unknown) {
  const res = await fetch(`${ORCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || `${path} failed (${res.status})`);
  return j;
}
async function getJSON(path: string) {
  const res = await fetch(`${ORCH}${path}`);
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || `${path} failed (${res.status})`);
  return j;
}

export function NockFairGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [commitH, setCommitH] = useState<string | null>(null);
  const [funding, setFunding] = useState<{ tx: string; height: number; first: string; note_hash: string } | null>(null);
  const [settlement, setSettlement] = useState<(Settlement & { winner?: string }) | null>(null);
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [chainVerified, setChainVerified] = useState<boolean | null>(null);

  const reset = useCallback(() => {
    setPhase("idle"); setBusy(null); setError(null); setRoundId(null); setCommitH(null);
    setFunding(null); setSettlement(null); setReceipts(null); setChainVerified(null);
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setPhase("error"); }
    finally { setBusy(null); }
  }, []);

  const open = () => run("open", async () => {
    const r = await postJSON("/round/open", { chain: "nock", pot: 2_000_000 });
    setRoundId(r.roundId); setCommitH(r.commit_h); setPhase("open");
  });
  const play = () => run("play", async () => {
    const r = await postJSON("/round/play", { roundId });
    setFunding({ tx: r.funding_tx, height: r.funding_height, first: r.escrow.first, note_hash: r.escrow.note_hash });
    setPhase("funded");
  });
  const reveal = () => run("reveal", async () => {
    const r = await postJSON("/round/reveal", { roundId });
    setSettlement({ ...r.settlement, winner: r.winner });
    const full = await getJSON(`/round/${roundId}`);
    setReceipts(full.receipts); setChainVerified(full.chainVerified); setPhase("settled");
  });

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Coins size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Nock %fair — settled on-chain</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">real settlement · fakenet</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-3">
        <Step index={1} title="House commits" done={phase !== "idle" && phase !== "error"} icon={<Lock size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code> behind <code>commit_h = tip5(serverSeed)</code> —
            binding it before any bet, so it can&apos;t grind the outcome.
          </p>
          {commitH ? <Field label="commit_h" value={commitH} /> : (
            <Btn onClick={open} busy={busy === "open"}>Open round <ArrowRight size={14} /></Btn>
          )}
        </Step>

        <Step index={2} title="Fund the %fair escrow" done={phase === "funded" || phase === "settled"} icon={<Coins size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The pot is locked on the Nock chain in a 3-branch <code>%fair</code> escrow
            (player-win | house-win | timeout-refund). Real NOCK moves here.
          </p>
          {funding ? (
            <>
              <Field label="escrow note (first)" value={funding.first} />
              <Field label="funding tx" value={funding.tx} sub={`block ${funding.height}`} />
            </>
          ) : (
            <Btn onClick={play} busy={busy === "play"} disabled={phase !== "open"}>Fund escrow{busy === "play" ? " (mining…)" : ""}</Btn>
          )}
        </Step>

        <Step index={3} title="Reveal & settle" done={phase === "settled"} icon={<Eye size={16} />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            Both seeds are revealed; the provably-fair winner&apos;s claim is built and submitted.
            Consensus — not the house — pays the winner.
          </p>
          {settlement ? (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-[#FFFFFF]">
                <Trophy size={14} /> winner: {settlement.winner}
              </div>
              {settlement.settled ? (
                <Field label={settlement.refund ? "refund tx" : "claim tx"} value={settlement.txId || ""} sub={`block ${settlement.height} · ${settlement.amountNicks} nicks`} />
              ) : (
                <p className="text-xs text-[#4A4A4A]">{settlement.reason || "awaiting player client-side claim"}</p>
              )}
            </div>
          ) : (
            <Btn onClick={reveal} busy={busy === "reveal"} disabled={phase !== "funded"}>Reveal & settle{busy === "reveal" ? " (mining…)" : ""}</Btn>
          )}
        </Step>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-t border-[#0B0B0B] bg-[#FFF0F0] px-4 py-3 text-sm text-[#7A1A1A]">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" /> <span className="font-mono text-xs break-all">{error}</span>
        </div>
      )}

      {chainVerified !== null && (
        <div className="flex items-center justify-between gap-3 border-t border-[#0B0B0B] px-4 py-3">
          <div className="inline-flex items-center gap-2 text-sm">
            <BadgeCheck size={16} className={chainVerified ? "text-[#0B0B0B]" : "text-[#7A1A1A]"} />
            <span className="font-mono text-xs uppercase tracking-[0.12em]">
              receipt chain {chainVerified ? "verified" : "INVALID"} · {receipts?.length ?? 0} signed receipts
            </span>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 border border-[#0B0B0B] px-3 py-1.5 text-xs font-medium">
            <RefreshCw size={13} /> New round
          </button>
        </div>
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
function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</div>
      <div className="mt-0.5 break-all font-mono text-xs text-[#0B0B0B]">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-[#4A4A4A]">{sub}</div>}
    </div>
  );
}
function Btn({ onClick, busy, disabled, children }: { onClick: () => void; busy?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled}
      className={`mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] px-4 py-2 text-sm font-medium ${busy || disabled ? "cursor-not-allowed bg-[#BFBFBF] text-[#4A4A4A]" : "bg-[#0B0B0B] text-[#FFFFFF]"}`}>
      {busy && <RefreshCw size={14} className="animate-spin" />}{children}
    </button>
  );
}
