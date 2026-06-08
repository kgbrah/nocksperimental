"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Coins, Eye, Lock, RefreshCw, ShieldAlert, X } from "lucide-react";
import {
  commit,
  randomSeedHex,
  verifyFlipRound,
  type FlipRound
} from "@/lib/pocgames";

type Phase = "idle" | "house" | "player" | "revealed";

// Walk a single two-sided commit-reveal coin-flip round, then recompute the outcome
// from public data in the browser. No real NOCK changes hands — this is the fairness
// and forensics showcase: every claim is recomputable, and tampering is caught.
export function ForfeitFlipGame() {
  const [nonce, setNonce] = useState(0);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [commitHouse, setCommitHouse] = useState<string | null>(null);
  const [commitClient, setCommitClient] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tamper, setTamper] = useState(false);

  function houseCommit() {
    const seed = randomSeedHex();
    setServerSeed(seed);
    setCommitHouse(commit(seed));
    setPhase("house");
  }

  function playerCommit() {
    const seed = randomSeedHex();
    setClientSeed(seed);
    setCommitClient(commit(seed));
    setPhase("player");
  }

  function reveal() {
    setPhase("revealed");
  }

  function newRound() {
    setNonce((value) => value + 1);
    setServerSeed(null);
    setClientSeed(null);
    setCommitHouse(null);
    setCommitClient(null);
    setTamper(false);
    setPhase("idle");
  }

  // The PUBLIC round record — everything an auditor needs to recompute the result.
  const round = useMemo<FlipRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const base: FlipRound = { nonce, commitHouse, commitClient, serverSeed, clientSeed };
    return { ...base, declaredWinner: verifyFlipRound(base).recomputedWinner };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce]);

  // What an auditor actually checks — optionally with a tampered revealed seed so you can
  // watch the hashlock catch it.
  const auditedRound = useMemo<FlipRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    const flipped = round.serverSeed.slice(0, -1) + (round.serverSeed.endsWith("0") ? "1" : "0");
    return { ...round, serverSeed: flipped };
  }, [round, tamper]);

  const verification = auditedRound ? verifyFlipRound(auditedRound) : null;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Coins size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Forfeit Flip — round #{nonce}</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        {/* Step 1 — house commit */}
        <Step
          index={1}
          title="House commits"
          done={phase !== "idle"}
          icon={<Lock size={16} aria-hidden="true" />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code> by publishing only its hash. The seed
            itself stays hidden — the peek surface is commitment-only.
          </p>
          {commitHouse ? (
            <Field label="commitHouse = H(serverSeed)" value={commitHouse} />
          ) : (
            <button
              type="button"
              onClick={houseCommit}
              className="mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
            >
              House commit <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </Step>

        {/* Step 2 — player commit */}
        <Step
          index={2}
          title="Player commits"
          done={phase === "player" || phase === "revealed"}
          icon={<Lock size={16} aria-hidden="true" />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            Before any seed is revealed, the player locks their own <code>clientSeed</code>. Neither
            side can see the other&apos;s seed, so neither can bias the result.
          </p>
          {commitClient ? (
            <Field label="commitPlayer = H(clientSeed)" value={commitClient} />
          ) : (
            <button
              type="button"
              onClick={playerCommit}
              disabled={phase === "idle"}
              className="mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Player commit <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </Step>
      </div>

      {/* Step 3 — reveal + recompute */}
      <div className="border-t border-[#0B0B0B] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye size={16} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Reveal &amp; recompute</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "player" ? (
              <button
                type="button"
                onClick={reveal}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
              >
                Reveal serverSeed <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : null}
            {phase === "revealed" ? (
              <button
                type="button"
                onClick={newRound}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
              >
                <RefreshCw size={14} aria-hidden="true" /> New round
              </button>
            ) : null}
          </div>
        </div>

        {round && verification ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="border border-[#0B0B0B] bg-[#F5F5F5] p-4">
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Public round record
              </div>
              <Field label="nonce" value={String(round.nonce)} />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">declared winner</span>
                <span className="text-sm font-semibold uppercase">{round.declaredWinner}</span>
              </div>
            </div>

            <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  In-browser verification
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold uppercase ${
                    verification.verified ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#B91C1C] text-[#FFFFFF]"
                  }`}
                >
                  {verification.verified ? "verified" : "rejected"}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                <CheckRow label="H(serverSeed) == commitHouse" ok={verification.checks.houseCommitBindsSeed} />
                <CheckRow label="H(clientSeed) == commitPlayer" ok={verification.checks.playerCommitBindsSeed} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
                Recomputed winner: <span className="font-semibold uppercase">{verification.recomputedWinner}</span>
                {" "}— from public data alone, no trust in the house required.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={tamper}
                  onChange={(event) => setTamper(event.target.checked)}
                  className="h-4 w-4 accent-[#0B0B0B]"
                />
                <ShieldAlert size={14} aria-hidden="true" />
                Tamper with the revealed seed (watch the hashlock catch it)
              </label>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — the outcome is{" "}
            <code>lowbit(H(serverSeed ‖ clientSeed ‖ nonce))</code> and is recomputed live in your browser.
          </p>
        )}
      </div>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center bg-[#0B0B0B] text-xs font-semibold text-[#FFFFFF]">
            {index}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className={done ? "text-[#0B0B0B]" : "text-[#BFBFBF]"}>
          {done ? <Check size={16} aria-hidden="true" /> : icon}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-[#0B0B0B]">{value}</div>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? "text-[#0B0B0B]" : "text-[#B91C1C]"}>
        {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
      </span>
      <span className="font-mono text-xs text-[#0B0B0B]">{label}</span>
    </li>
  );
}
