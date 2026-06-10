"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CircleDot, Eye, Lock, RefreshCw } from "lucide-react";
import {
  commit,
  randomSeedHex,
  rouletteColorOf,
  roulettePocketFrom,
  verifyRouletteRound,
  type RouletteBet,
  type RouletteRound
} from "@/lib/pocgames";
import { CheckRow, Field, Step, TamperToggle, VerdictBadge, tamperSeed } from "@/components/pocgame-ui";

type Phase = "idle" | "house" | "player" | "revealed";

// Walk a two-sided commit-reveal roulette round entirely in the browser. The player
// picks a color BEFORE committing a seed, the pocket is recomputed from public data,
// and the zero-pocket house edge is visible rather than hidden. No real NOCK moves.
export function ForfeitRouletteGame() {
  const [nonce, setNonce] = useState(0);
  const [bet, setBet] = useState<RouletteBet>("red");
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

  const round = useMemo<RouletteRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const { pocket, rejectionIndex } = roulettePocketFrom({ serverSeed, clientSeed, nonce });
    return {
      nonce,
      bet,
      commitHouse,
      commitClient,
      serverSeed,
      clientSeed,
      pocket,
      rejectionIndex,
      declaredWinner: rouletteColorOf(pocket) === bet ? "player" : "house"
    };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce, bet]);

  const auditedRound = useMemo<RouletteRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    return { ...round, serverSeed: tamperSeed(round.serverSeed) };
  }, [round, tamper]);

  const verification = auditedRound ? verifyRouletteRound(auditedRound) : null;
  const pocketColor = round?.pocket !== undefined ? rouletteColorOf(round.pocket) : null;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <CircleDot size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">
            Forfeit Roulette — round #{nonce}
          </span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="House commits" done={phase !== "idle"} icon={<Lock size={16} aria-hidden="true" />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code>, publishing only its hash — before it can
            know your color.
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
          title="Pick a color, player commits"
          done={phase === "player" || phase === "revealed"}
          icon={<Lock size={16} aria-hidden="true" />}
        >
          <p className="text-sm leading-6 text-[#4A4A4A]">
            Choose red or black, then lock your own <code>clientSeed</code>. Zero is green and pays the
            house — the whole 1/37 edge, in the open.
          </p>
          <div className="mt-3 flex gap-2">
            {(["red", "black"] as const).map((color) => (
              <button
                key={color}
                type="button"
                disabled={phase === "player" || phase === "revealed"}
                onClick={() => setBet(color)}
                className={`border border-[#0B0B0B] px-4 py-2 text-sm font-semibold uppercase disabled:cursor-not-allowed ${
                  bet === color
                    ? color === "red"
                      ? "bg-[#B91C1C] text-[#FFFFFF]"
                      : "bg-[#0B0B0B] text-[#FFFFFF]"
                    : "bg-[#FFFFFF] text-[#0B0B0B] disabled:opacity-40"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
          {commitClient ? (
            <Field label={`commitPlayer = H(clientSeed) · bet = ${bet}`} value={commitClient} />
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
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Spin &amp; recompute</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "player" ? (
              <button
                type="button"
                onClick={() => setPhase("revealed")}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
              >
                Reveal &amp; spin <ArrowRight size={14} aria-hidden="true" />
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
                <span className="font-mono text-xs uppercase tracking-[0.12em]">pocket (0–36)</span>
                <span
                  className={`px-3 py-1 text-3xl font-semibold tabular-nums text-[#FFFFFF] ${
                    pocketColor === "red"
                      ? "bg-[#B91C1C]"
                      : pocketColor === "green"
                        ? "bg-[#15803D]"
                        : "bg-[#0B0B0B]"
                  }`}
                >
                  {round.pocket}
                </span>
              </div>
              <Field label="pocket color / your bet" value={`${pocketColor} / ${round.bet}`} />
              <Field label="rejectionIndex (modulo-bias audit)" value={String(round.rejectionIndex)} />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">winner</span>
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
                <CheckRow label="pocket recomputes from seeds" ok={verification.checks.pocketRecomputes} />
                <CheckRow label="rejectionIndex recomputes" ok={verification.checks.rejectionIndexRecomputes} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <TamperToggle tamper={tamper} onChange={setTamper} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — the pocket is a rejection-sampled{" "}
            <code>H(serverSeed ‖ clientSeed ‖ nonce ‖ draw) mod 37</code>, recomputed live in your
            browser.
          </p>
        )}
      </div>
    </div>
  );
}
