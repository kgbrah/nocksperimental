"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Eye, Lock, RefreshCw, TrendingUp } from "lucide-react";
import {
  LIMBO_TARGET_X100,
  commit,
  limboLabel,
  limboMultiplierFrom,
  randomSeedHex,
  verifyLimboRound,
  type LimboRound
} from "@/lib/pocgames";
import { CheckRow, Field, Step, TamperToggle, VerdictBadge, tamperSeed } from "@/components/pocgame-ui";

type Phase = "idle" | "house" | "player" | "revealed";

// Crash-style limbo over commit-reveal: the multiplier curve (0.99·2^24/(u+1)) and
// its 1% edge are public, the draw is recomputable, and the 2.00× target makes the
// win condition a single comparison anyone can re-run. No real NOCK moves.
export function ForfeitLimboGame() {
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

  function newRound() {
    setNonce((value) => value + 1);
    setServerSeed(null);
    setClientSeed(null);
    setCommitHouse(null);
    setCommitClient(null);
    setTamper(false);
    setPhase("idle");
  }

  const round = useMemo<LimboRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const { multiplierX100, rejectionIndex } = limboMultiplierFrom({ serverSeed, clientSeed, nonce });
    return {
      nonce,
      commitHouse,
      commitClient,
      serverSeed,
      clientSeed,
      multiplierX100,
      rejectionIndex,
      declaredWinner: multiplierX100 >= LIMBO_TARGET_X100 ? "player" : "house"
    };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce]);

  const auditedRound = useMemo<LimboRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    return { ...round, serverSeed: tamperSeed(round.serverSeed) };
  }, [round, tamper]);

  const verification = auditedRound ? verifyLimboRound(auditedRound) : null;
  const won = round?.multiplierX100 !== undefined && round.multiplierX100 >= LIMBO_TARGET_X100;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Forfeit Limbo — round #{nonce}</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="House commits" done={phase !== "idle"} icon={<Lock size={16} aria-hidden="true" />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code> behind its hash — the curve cannot be bent
            after your commitment.
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
            Target is fixed at <strong>{limboLabel(LIMBO_TARGET_X100)}</strong> — win probability 49.5%,
            the 1% edge lives in the disclosed curve, nowhere else.
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
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Launch &amp; recompute</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "player" ? (
              <button
                type="button"
                onClick={() => setPhase("revealed")}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
              >
                Reveal &amp; launch <ArrowRight size={14} aria-hidden="true" />
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

        {round && round.multiplierX100 !== undefined && verification ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="border border-[#0B0B0B] bg-[#F5F5F5] p-4">
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Public round record
              </div>
              <div className="mt-3 flex items-baseline justify-between border-b border-[#0B0B0B] pb-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">
                  multiplier vs {limboLabel(LIMBO_TARGET_X100)} target
                </span>
                <span
                  className={`px-3 py-1 text-3xl font-semibold tabular-nums text-[#FFFFFF] ${
                    won ? "bg-[#15803D]" : "bg-[#B91C1C]"
                  }`}
                >
                  {limboLabel(round.multiplierX100)}
                </span>
              </div>
              <Field label="rejectionIndex (modulo-bias audit)" value={String(round.rejectionIndex)} />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">
                  winner — multiplier ≥ {limboLabel(LIMBO_TARGET_X100)}
                </span>
                <span className="text-sm font-semibold uppercase">{round.declaredWinner}</span>
              </div>
            </div>

            <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  In-browser verification
                </div>
                <VerdictBadge verified={verification.verified} />
              </div>
              <ul className="mt-3 space-y-2">
                <CheckRow label="H(serverSeed) == commitHouse" ok={verification.checks.houseCommitBindsSeed} />
                <CheckRow label="H(clientSeed) == commitPlayer" ok={verification.checks.playerCommitBindsSeed} />
                <CheckRow label="multiplier recomputes from seeds" ok={verification.checks.multiplierRecomputes} />
                <CheckRow label="rejectionIndex recomputes" ok={verification.checks.rejectionIndexRecomputes} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <TamperToggle tamper={tamper} onChange={setTamper} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — the multiplier is{" "}
            <code>max(1.00, 0.99·2²⁴/(u+1))</code> with <code>u</code> a rejection-sampled{" "}
            <code>H(serverSeed ‖ clientSeed ‖ nonce ‖ draw) mod 2²⁴</code>, recomputed live in your
            browser.
          </p>
        )}
      </div>
    </div>
  );
}
