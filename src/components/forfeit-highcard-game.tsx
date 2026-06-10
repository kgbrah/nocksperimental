"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Eye, Lock, RefreshCw, Spade } from "lucide-react";
import {
  cardBeats,
  cardLabel,
  cardSuit,
  commit,
  highcardDrawFrom,
  randomSeedHex,
  verifyHighcardRound,
  type HighcardRound
} from "@/lib/pocgames";
import { CheckRow, Field, Step, TamperToggle, VerdictBadge, tamperSeed } from "@/components/pocgame-ui";

type Phase = "idle" | "house" | "player" | "revealed";

const redSuit = (card: number) => cardSuit(card) === 1 || cardSuit(card) === 2; // ♦ and ♥

// War-style high card over commit-reveal: two distinct cards from one committed seed
// pair, the collision walk (houseDrawIndex) fully recomputable. Suits break rank
// ties, so a winner always exists from public data alone. No real NOCK moves.
export function ForfeitHighcardGame() {
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

  const round = useMemo<HighcardRound | null>(() => {
    if (phase !== "revealed" || !serverSeed || !clientSeed || !commitHouse || !commitClient) {
      return null;
    }
    const { playerCard, houseCard, houseDrawIndex } = highcardDrawFrom({ serverSeed, clientSeed, nonce });
    return {
      nonce,
      commitHouse,
      commitClient,
      serverSeed,
      clientSeed,
      playerCard,
      houseCard,
      houseDrawIndex,
      declaredWinner: cardBeats(playerCard, houseCard) ? "player" : "house"
    };
  }, [phase, serverSeed, clientSeed, commitHouse, commitClient, nonce]);

  const auditedRound = useMemo<HighcardRound | null>(() => {
    if (!round) return null;
    if (!tamper) return round;
    return { ...round, serverSeed: tamperSeed(round.serverSeed) };
  }, [round, tamper]);

  const verification = auditedRound ? verifyHighcardRound(auditedRound) : null;

  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <Spade size={18} aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.14em]">
            Forfeit High Card — round #{nonce}
          </span>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#BFBFBF]">demo · no real NOCK</span>
      </div>

      <div className="grid gap-px bg-[#0B0B0B] md:grid-cols-2">
        <Step index={1} title="House commits" done={phase !== "idle"} icon={<Lock size={16} aria-hidden="true" />}>
          <p className="text-sm leading-6 text-[#4A4A4A]">
            The house locks a secret <code>serverSeed</code> behind its hash — it cannot redraw either
            card afterwards.
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
            Your <code>clientSeed</code> is half of both draws — neither side can steer who gets the
            higher card.
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
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Draw &amp; recompute</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "player" ? (
              <button
                type="button"
                onClick={() => setPhase("revealed")}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
              >
                Reveal &amp; draw <ArrowRight size={14} aria-hidden="true" />
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

        {round && round.playerCard !== undefined && round.houseCard !== undefined && verification ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="border border-[#0B0B0B] bg-[#F5F5F5] p-4">
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Public round record
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-b border-[#0B0B0B] pb-3">
                {(
                  [
                    ["your card", round.playerCard],
                    ["house card", round.houseCard]
                  ] as const
                ).map(([label, card]) => (
                  <div key={label} className="text-center">
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">
                      {label}
                    </div>
                    <div
                      className={`mt-1 border-2 border-[#0B0B0B] bg-[#FFFFFF] py-3 text-3xl font-semibold ${
                        redSuit(card) ? "text-[#B91C1C]" : "text-[#0B0B0B]"
                      }`}
                    >
                      {cardLabel(card)}
                    </div>
                  </div>
                ))}
              </div>
              <Field
                label="houseDrawIndex (collision audit — first draw ≠ your card)"
                value={String(round.houseDrawIndex)}
              />
              <Field label="serverSeed (revealed)" value={round.serverSeed} />
              <Field label="clientSeed (revealed)" value={round.clientSeed} />
              <div className="mt-3 flex items-center justify-between border-t border-[#0B0B0B] pt-3">
                <span className="font-mono text-xs uppercase tracking-[0.12em]">
                  winner — rank, then ♣ &lt; ♦ &lt; ♥ &lt; ♠
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
                <CheckRow label="both cards recompute from seeds" ok={verification.checks.cardsRecompute} />
                <CheckRow label="houseDrawIndex recomputes" ok={verification.checks.houseDrawIndexRecomputes} />
                <CheckRow label="declared winner == recomputed" ok={verification.checks.declaredWinnerCorrect} />
              </ul>
              <TamperToggle tamper={tamper} onChange={setTamper} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            Complete both commitments, then reveal — your card is{" "}
            <code>H(serverSeed ‖ clientSeed ‖ nonce ‖ 0) mod 52</code>, the house walks draws 1, 2, 3…
            until it lands on a different card. All recomputed live in your browser.
          </p>
        )}
      </div>
    </div>
  );
}
