import { ArrowLeft, ArrowUpRight, BadgeCheck, Gamepad2, ShieldCheck } from "lucide-react";
import { FALLBACK_GAME_ICON, GAME_ICONS } from "@/lib/game-icons";
import Link from "next/link";
import { launchEvidenceCaseForId } from "@/lib/launch-evidence";
import { pocGames, type PocGame } from "@/lib/pocgames";
import { resolvedBadgeForId } from "@/lib/trust-signals";

export const dynamic = "force-dynamic";

export default function PocGamesPage() {
  const verifiedCount = pocGames.filter((game) => resolvedBadgeForId(game.badgeId)?.currentStatus === "verified").length;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>

          <div className="mt-5 flex items-center gap-2">
            <Gamepad2 size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Proof-of-concept games
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">POC Games</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            Provably-fair, pay-per-use NockApps where every outcome is recomputable from public data.
            Each game runs the full nocksperimental verification chain — lab fairness fixture →
            generated report → launch-evidence case → signed trust badge — and ships an in-browser
            verifier so neither player nor house has to trust the other.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Games" value={String(pocGames.length)} />
            <Metric label="Verified badges" value={`${verifiedCount}/${pocGames.length}`} />
            <Metric label="Real NOCK" value="Demo only" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {pocGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        <div className="mt-8 border border-[#0B0B0B] bg-[#F5F5F5] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-base font-semibold">No party trusts the other</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            Two-sided commit-reveal means neither side sees the other&apos;s seed before committing, so
            neither can predict or bias the result; the hashlock <code>H(seed) == commit</code> is checked
            on reveal, so a post-hoc grind fails; and every outcome recomputes from public data, so a
            lying house is caught by recomputation, not arbitration. <strong>Fairness and forensics are
            fully trustless.</strong> Settlement carries a disclosed residual: Nockchain consensus cannot
            gate a payout on the game outcome, so it is bonded-cooperative / HTLC-grade, surfaced as a
            warn check on every game&apos;s readiness report.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            These pages are the fairness and forensics showcase — the commit-reveal flow and the
            verifier run entirely in your browser and <strong>no real NOCK</strong> changes hands.
            Real-NOCK play is gated behind a funded house wallet and fakenet end-to-end testing.
          </p>
        </div>
      </section>
    </main>
  );
}

function GameCard({ game }: { game: PocGame }) {
  const badge = resolvedBadgeForId(game.badgeId);
  const launchCase = launchEvidenceCaseForId(game.caseId);
  const Icon = GAME_ICONS[game.kind] ?? FALLBACK_GAME_ICON;

  return (
    <article className="flex flex-col border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center bg-[#0B0B0B] text-[#FFFFFF]">
            <Icon size={19} aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold">{game.name}</h2>
        </div>
        {badge ? (
          <span className="inline-flex items-center gap-1 border border-[#0B0B0B] bg-[#0B0B0B] px-2 py-1 text-xs font-semibold uppercase text-[#FFFFFF]">
            <BadgeCheck size={13} aria-hidden="true" />
            {badge.currentStatus}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{game.tagline}</p>

      <div className="mt-3 border border-[#0B0B0B] bg-[#F5F5F5] p-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">construction</div>
        <div className="mt-1 break-words font-mono text-xs text-[#0B0B0B]">{game.construction}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/pocgames/${game.id}`}
          className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-[#FFFFFF]"
        >
          Play &amp; verify <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        {badge ? (
          <Link
            href={`/trust/badges/${badge.id}`}
            className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
          >
            Badge
          </Link>
        ) : null}
        {launchCase ? (
          <Link
            href={launchCase.links.page}
            className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
          >
            Evidence
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
