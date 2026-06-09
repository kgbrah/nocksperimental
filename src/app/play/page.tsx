import { ArrowLeft, ArrowUpRight, Coins, Dice5, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { pocGames, type PocGame } from "@/lib/pocgames";
import { resolvedBadgeForId } from "@/lib/trust-signals";
import { PlayerBar } from "@/components/web3/player-bar";

export const dynamic = "force-dynamic";

const GAME_ICON: Record<string, typeof Coins> = { flip: Coins, dice: Dice5 };

function GameCard({ game }: { game: PocGame }) {
  const Icon = GAME_ICON[game.kind] ?? Gamepad2;
  const verified = resolvedBadgeForId(game.badgeId)?.currentStatus === "verified";
  return (
    <div className="flex flex-col justify-between border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div>
        <div className="flex items-center justify-between">
          <Icon size={20} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
            {verified ? "verified" : "model-attested"}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{game.name}</h2>
        <p className="mt-1.5 text-sm leading-6 text-[#4A4A4A]">{game.tagline}</p>
        <p className="mt-3 break-words border-2 border-[#0B0B0B] bg-[#F5F5F5] p-2 font-mono text-[11px] leading-5">
          {game.construction}
        </p>
      </div>
      <Link
        href={`/pocgames/${game.id}`}
        className="mt-4 inline-flex items-center justify-center gap-1.5 border-2 border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[#FFFFFF] shadow-[4px_4px_0_#737373] transition hover:shadow-none"
      >
        Play <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function PlayPage() {
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
              Arcade · provably-fair NockApps
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Play</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            Connect a wallet and play the provably-fair games — every outcome is recomputable from
            public data by an in-browser verifier, so neither player nor house has to trust the other.
            Real-NOCK testnet settlement (on-chain stakes via the bridge) is the next phase and stays
            testnet-only until proven native + cross-chain.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <PlayerBar />

        <Link
          href="/play/flip"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0B] bg-[#0B0B0B] p-5 text-[#FFFFFF] shadow-[6px_6px_0_#737373] transition hover:shadow-none"
        >
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#A3A3A3]">
              On-chain · Base Sepolia · real testnet ETH
            </span>
            <p className="mt-1 text-2xl font-semibold">Forfeit Flip — settled on-chain</p>
            <p className="mt-1 text-sm text-[#D4D4D4]">
              Stake real testnet ETH against the deployed, audited settlement contract. Commit-reveal, even
              money, provably fair, timeout-protected.
            </p>
          </div>
          <ArrowUpRight size={28} aria-hidden="true" />
        </Link>

        <Link
          href="/play/nock"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 text-[#0B0B0B] shadow-[6px_6px_0_#0B0B0B] transition hover:shadow-none"
        >
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4A4A]">
              On-chain · Nockchain %fair · consensus-paid winner
            </span>
            <p className="mt-1 text-2xl font-semibold">Nock %fair — settled by consensus</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">
              The strongest settlement in the stack: a witness-checked <code>%fair</code> lock where the
              chain itself pays the provably-fair winner — no trusted house signature on the payout.
              Forfeit-safe via a timeout refund branch.
            </p>
          </div>
          <ArrowUpRight size={28} aria-hidden="true" />
        </Link>

        <h2 className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
          Provably-fair demos (in-browser, no stakes)
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {pocGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </main>
  );
}
