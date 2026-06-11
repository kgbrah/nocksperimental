import { ArrowLeft, Coins, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { NockFairGame } from "@/components/nock-fair-game";

export const dynamic = "force-dynamic";

// Real on-chain Nock %fair settlement, driven by the cross-chain orchestrator.
// Unlike the in-browser demo, value actually moves on the Nock chain and the
// provably-fair winner is paid by consensus (not by a trusted house signature).
export default function NockFairPlayPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/play">
            <ArrowLeft size={16} aria-hidden="true" />
            Arcade
          </Link>
          <div className="mt-5 flex items-center gap-2">
            <Coins size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Nock %fair · on-chain · Nockchain (fakenet)
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Nock %fair (on-chain)</h1>
          <p className="mt-3 text-base leading-7 text-[#4A4A4A]">
            The strongest settlement in the stack: a witness-checked <code>%fair</code> consensus lock
            where the <em>winning branch is enforced by consensus</em>, not a trusted house signature.
            The house commits a seed before the round, the pot is locked in a 3-branch escrow on the
            Nock chain, both seeds are revealed, and only the matching winner&apos;s claim is accepted
            by consensus. In this demo the orchestrator supplies both seeds, so fairness is evidenced
            by the signed receipt chain rather than by an adversarial player. A stalled pot is
            recoverable via a timelocked refund branch; on-chain that leaf is outcome-blind, and it is
            house auto-recovery policy that never sweeps a pot the player won.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-1.5">
            <ShieldCheck size={15} aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">
              consensus-enforced payout · forfeit-safe · signed receipts
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
        <NockFairGame />
        <p className="mt-4 font-mono text-[11px] leading-5 text-[#9A9A9A]">
          Funding + claim are real on-chain txs (each takes ~1–2 min to mine on fakenet). The orchestrator
          builds the claim with the wasm wallet and submits it via the node&apos;s private gRPC; every step
          is recorded into a signed, independently-verifiable receipt chain.
        </p>
      </section>
    </main>
  );
}
