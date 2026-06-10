import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  FileText,
  Scale,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForfeitDiceGame } from "@/components/forfeit-dice-game";
import { ForfeitFlipGame } from "@/components/forfeit-flip-game";
import { ForfeitHighcardGame } from "@/components/forfeit-highcard-game";
import { ForfeitLimboGame } from "@/components/forfeit-limbo-game";
import { ForfeitRouletteGame } from "@/components/forfeit-roulette-game";
import { ForfeitSlotsGame } from "@/components/forfeit-slots-game";
import { launchEvidenceCaseForId } from "@/lib/launch-evidence";
import { pocGameById, type PocGame } from "@/lib/pocgames";
import { resolvedBadgeForId } from "@/lib/trust-signals";

const GAME_COMPONENT: Record<PocGame["kind"], React.ComponentType> = {
  flip: ForfeitFlipGame,
  dice: ForfeitDiceGame,
  roulette: ForfeitRouletteGame,
  slots: ForfeitSlotsGame,
  highcard: ForfeitHighcardGame,
  limbo: ForfeitLimboGame
};

export const dynamic = "force-dynamic";

type PocGamePageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function PocGamePage({ params }: PocGamePageProps) {
  const { gameId } = await params;
  const game = pocGameById(gameId);

  if (!game) {
    notFound();
  }

  const badge = resolvedBadgeForId(game.badgeId);
  const launchCase = launchEvidenceCaseForId(game.caseId);
  const Game = GAME_COMPONENT[game.kind];

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/pocgames">
            <ArrowLeft size={16} aria-hidden="true" />
            POC Games
          </Link>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
                Provably-fair · pay-per-use NockApp · demo
              </div>
              <h1 className="mt-2 text-4xl font-semibold">{game.name}</h1>
              <p className="mt-3 text-base leading-7 text-[#4A4A4A]">{game.tagline}</p>
            </div>
            {badge ? (
              <Link
                href={`/trust/badges/${badge.id}`}
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
              >
                <BadgeCheck size={16} aria-hidden="true" />
                {badge.currentStatus === "verified" ? "Trust badge: verified" : `Trust badge: ${badge.currentStatus}`}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="mt-6 border border-[#0B0B0B] bg-[#F5F5F5] p-4">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Outcome construction (public)
            </div>
            <div className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">{game.construction}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <Game />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel icon={<ShieldCheck size={18} aria-hidden="true" />} title="Earned trust badge">
            {badge ? (
              <>
                <p className="text-sm leading-6 text-[#4A4A4A]">
                  Signed Ed25519 issuance receipt over the lab report snapshot{" "}
                  <code className="break-all">{badge.evidence.snapshotRoot}</code>. Freshness:{" "}
                  <span className="font-semibold">{badge.freshness}</span>.
                </p>
                <Link
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                  href={`/trust/badges/${badge.id}`}
                >
                  Verify badge <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#4A4A4A]">Badge record unavailable.</p>
            )}
          </Panel>

          <Panel icon={<FileText size={18} aria-hidden="true" />} title="Launch evidence">
            {launchCase ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic SVG from an API route, not a static asset */}
                <img
                  src={`/api/launch-evidence/${launchCase.caseId}/badge.svg`}
                  alt={`${game.name} launch evidence: ${launchCase.report.summaryStatus}`}
                  className="mt-1 border border-[#0B0B0B]"
                  width={220}
                  height={40}
                />
                <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
                  Readiness {launchCase.report.summaryStatus} · score {launchCase.report.score}. Lab
                  report → case → readiness report → badge.
                </p>
                <Link className="mt-2 inline-flex items-center gap-2 text-sm font-medium" href={launchCase.links.page}>
                  Open case <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#4A4A4A]">Launch evidence case unavailable.</p>
            )}
          </Panel>

          <Panel icon={<Scale size={18} aria-hidden="true" />} title="Settlement residual (honest)">
            <p className="text-sm leading-6 text-[#4A4A4A]">
              Fairness and forensics are fully trustless. Settlement is bonded-cooperative +
              timeout-forfeit (HTLC-grade), not contract-grade forced payout — Nockchain consensus
              cannot gate a payout on the game outcome. Disclosed in{" "}
              <code className="break-all">{game.dossier}</code>.
            </p>
          </Panel>
        </div>

        <p className="mt-6 border border-[#0B0B0B] bg-[#F5F5F5] p-4 text-sm leading-6 text-[#4A4A4A]">
          This is the fairness and forensics showcase: the commit-reveal flow and the verifier run
          entirely in your browser and <strong>no real NOCK changes hands</strong>. Real-NOCK play is
          gated behind a house wallet, fakenet end-to-end testing, and the disclosed settlement model.
        </p>
      </section>
    </main>
  );
}

function Panel({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center bg-[#0B0B0B] text-[#FFFFFF]">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}
