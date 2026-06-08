"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, Check, Dice5, Eye, Lock, RefreshCw, ShieldAlert, X } from "lucide-react";
import {
  CHI2_CRIT_DF9,
  DICE_LINE,
  chiSquareOverRolls,
  commit,
  deterministicSeed,
  diceRollFrom,
  randomSeedHex,
  verifyDiceRound,
  type ChiSquareResult,
  type DiceRound
} from "@/lib/pocgames";

type Phase = "idle" | "house" | "player" | "revealed";

const DISTRIBUTION_N = 5000;

// Walk a two-sided commit-reveal dice round, recompute the roll in the browser, and run a
// live chi-square uniformity proof over thousands of recomputed rolls. No real NOCK changes
// hands — this is the fairness + provable-distribution showcase.
export function ForfeitDiceGame() {
  const [nonce, setNonce] = useState(0);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [commitHouse, setCommitHouse] = useState<string | null>(null);
  const [commitClient, setCommitClient] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tamper, setTamper] = useState(false);
  const [biased, setBiased] = useState(false);
  const [distribution, setDistribution] = useState<ChiSquareResult | null>(null);

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

  function runDistributionProof() {
    const rolls: number[] = [];
    for (let n = 0; n < DISTRIBUTION_N; n += 1) {
      rolls.push(
        diceRollFrom({
          serverSeed: deterministicSeed("s", n),
          clientSeed: deterministicSeed("c", n),
          nonce: n
        }).roll
      );
    }
    const sample = biased ? rolls.map((roll) => roll % 2000) : rolls;
    setDistribution(chiSquareOverRolls(sample));
  }

  const round = useMemo<DiceRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const { roll, rejectionIndex } = diceRollFrom({ serverSeed, clientSeed, nonce });
    return {
      nonce,
      commitHouse,
      commitClient,
      serverSeed,
      clientSeed,
      roll,
      rejectionIndex,
      declaredWinner: roll >= DICE_LINE ? "player" : "house"
    };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce]);

  const auditedRound = useMemo<DiceRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    const flipped = round.serverSeed.slice(0, -1) + (round.serverSeed.endsWith("0") ? "1" : "0");
    return { ...round, serverSeed: flipped };
  }, [round, tamper]);

  const verification = auditedRound ? verifyDiceRound(auditedRound) : null;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Dice5 size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Forfeit Dice — round #{nonce}</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="House commits" done={phase !== "idle"} icon={<Lock size={16} aria-hidden="true" />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code>, publishing only its hash. The peek
            surface is commitment-only — never the seed.
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

        <Step
          index={2}
          title="Player commits"
          done={phase === "player" || phase === "revealed"}
          icon={<Lock size={16} aria-hidden="true" />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The player locks their own <code>clientSeed</code> before any reveal, so neither side can
            steer the roll.
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
              <div className="mt-3 flex items-baseline justify-between border-b border-[#0B0B0B] pb-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">roll (0–9999)</span>
                <span className="text-3xl font-semibold tabular-nums">{round.roll}</span>
              </div>
              <Field label="rejectionIndex (modulo-bias audit)" value={String(round.rejectionIndex)} />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">winner — roll ≥ {DICE_LINE}</span>
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
                <CheckRow label="roll recomputes from seeds" ok={verification.checks.rollRecomputes} />
                <CheckRow label="rejectionIndex recomputes" ok={verification.checks.rejectionIndexRecomputes} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <label className="mt-3 flex cursor-pointer items-center gap-2 border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={tamper}
                  onChange={(event) => setTamper(event.target.checked)}
                  className="h-4 w-4 accent-[#0B0B0B]"
                />
                <ShieldAlert size={14} aria-hidden="true" />
                Tamper with the revealed seed
              </label>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — the roll is a rejection-sampled{" "}
            <code>H(serverSeed ‖ clientSeed ‖ nonce) mod 10000</code>, recomputed live in your browser.
          </p>
        )}
      </div>

      {/* Distribution proof */}
      <div className="border-t border-[#0B0B0B] bg-[#F5F5F5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Provable uniform distribution</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={biased}
                onChange={(event) => setBiased(event.target.checked)}
                className="h-4 w-4 accent-[#0B0B0B]"
              />
              Inject bias (negative control)
            </label>
            <button
              type="button"
              onClick={runDistributionProof}
              className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
            >
              Run chi-square over {DISTRIBUTION_N.toLocaleString()} rolls
            </button>
          </div>
        </div>

        {distribution ? (
          <div className="mt-4 border border-[#0B0B0B] bg-[#FFFFFF] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.12em]">
                chi² = {distribution.chi2.toFixed(2)} · df=9 · critical@p=0.001 = {CHI2_CRIT_DF9}
              </span>
              <span
                className={`px-2 py-1 text-xs font-semibold uppercase ${
                  distribution.uniform ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#B91C1C] text-[#FFFFFF]"
                }`}
              >
                {distribution.uniform ? "uniform" : "biased — caught"}
              </span>
            </div>
            <Histogram buckets={distribution.buckets} />
            <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
              {distribution.uniform
                ? "The recomputed rolls fall evenly across all ten buckets — chi² is below the strict p=0.001 critical value, so the reduction is provably uniform, not merely balanced on one bit."
                : "The injected bias squashes the rolls into the low buckets — the same chi² test that clears honest play rejects it cleanly. A house that biased the wheel would be caught by this exact recomputation."}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Recompute {DISTRIBUTION_N.toLocaleString()} deterministic rolls in your browser and run a
            chi-square goodness-of-fit (10 buckets, df=9). Toggle the negative control to confirm the
            test actually catches a biased stream.
          </p>
        )}
      </div>
    </div>
  );
}

function Histogram({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets);
  return (
    <div className="mt-4 flex items-end gap-1" style={{ height: "96px" }}>
      {buckets.map((count, index) => (
        <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full border border-[#0B0B0B] bg-[#0B0B0B]"
            style={{ height: `${Math.max(2, Math.round((count / max) * 80))}px` }}
            title={`${index * 1000}–${index * 1000 + 999}: ${count}`}
          />
          <span className="font-mono text-[10px] text-[#4A4A4A]">{index}</span>
        </div>
      ))}
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
