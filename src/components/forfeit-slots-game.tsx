"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Cherry, Eye, Lock, RefreshCw } from "lucide-react";
import {
  SLOT_SYMBOLS,
  commit,
  randomSeedHex,
  slotsReelsFrom,
  slotsTierOf,
  verifySlotsRound,
  type SlotsRound
} from "@/lib/pocgames";
import { CheckRow, Field, Step, TamperToggle, VerdictBadge, tamperSeed } from "@/components/pocgame-ui";

type Phase = "idle" | "house" | "player" | "revealed";

// Three-reel commit-reveal slots. Each reel is an independent domain-separated draw
// from the same two committed seeds, so the full reel line — and the disclosed
// 176/512 win probability — is recomputable by anyone. No real NOCK moves.
export function ForfeitSlotsGame() {
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

  const round = useMemo<SlotsRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const { reels, rejectionIndices } = slotsReelsFrom({ serverSeed, clientSeed, nonce });
    return {
      nonce,
      commitHouse,
      commitClient,
      serverSeed,
      clientSeed,
      reels,
      rejectionIndices,
      declaredWinner: slotsTierOf(reels) === "miss" ? "house" : "player"
    };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce]);

  const auditedRound = useMemo<SlotsRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    return { ...round, serverSeed: tamperSeed(round.serverSeed) };
  }, [round, tamper]);

  const verification = auditedRound ? verifySlotsRound(auditedRound) : null;
  const tier = round?.reels ? slotsTierOf(round.reels) : null;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Cherry size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Forfeit Slots — round #{nonce}</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="House commits" done={phase !== "idle"} icon={<Lock size={16} aria-hidden="true" />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code> behind its hash — the reels cannot be
            re-spun after your commitment lands.
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
            Your <code>clientSeed</code> is half of every reel — the house cannot pick the line, and
            neither can you.
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

        {round && round.reels && verification ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="border border-[#0B0B0B] bg-[#F5F5F5] p-4">
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Public round record
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-b border-[#0B0B0B] pb-3">
                {round.reels.map((reel, index) => (
                  <div
                    key={index}
                    className="border-2 border-[#0B0B0B] bg-[#FFFFFF] py-3 text-center font-mono text-lg font-semibold"
                  >
                    {SLOT_SYMBOLS[reel]}
                  </div>
                ))}
              </div>
              <Field label="result tier — pair or better wins" value={String(tier)} />
              <Field
                label="rejectionIndices (modulo-bias audit, per reel)"
                value={(round.rejectionIndices ?? []).join(", ")}
              />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">winner — P(player) = 34.375%</span>
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
                <CheckRow label="reels recompute from seeds" ok={verification.checks.reelsRecompute} />
                <CheckRow label="rejectionIndices recompute" ok={verification.checks.rejectionIndicesRecompute} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <TamperToggle tamper={tamper} onChange={setTamper} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — each reel is an independent rejection-sampled{" "}
            <code>H(serverSeed ‖ clientSeed ‖ nonce ‖ reel) mod 8</code>, recomputed live in your
            browser.
          </p>
        )}
      </div>
    </div>
  );
}
