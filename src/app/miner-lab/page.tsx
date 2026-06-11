import { ArrowLeft, Cpu } from "lucide-react";
import Link from "next/link";
import { MinerLab } from "@/components/miner-lab";

export const dynamic = "force-dynamic";

export default function MinerLabPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>

          <div className="mt-5 flex items-center gap-2">
            <Cpu size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Miner performance lab · zkPoW &amp; matmul PoUW
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Miner Performance Lab</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            Try GPU + miner settings and see predicted proof-rate and profitability without renting or
            running a thing. The <strong>current zkPoW</strong> regime is calibrated on real goldenminer
            measurements we collected; the <strong>Fork A &ldquo;matmul PoUW&rdquo;</strong> regime models the
            upcoming change where mining becomes matrix-multiply AI work — so you can see how your
            hardware&apos;s value shifts <em>before</em> it lands, and whether tensor-heavy cards (or
            datacenters merge-mining AI) are about to out-earn you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <MinerLab />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="border-2 border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.12em]">Honest limits</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            Current-regime predictions are a least-squares fit over a handful of real single-card runs —
            good for ranking and rough sizing, not a guarantee for your exact host. Fork A is a{" "}
            <strong>modeled estimate</strong>: the matmul PoUW protocol change isn&apos;t live, so those
            numbers track spec-sheet tensor throughput and a placeholder dilution/emission snapshot you can
            override. Real matmul-PoUW calibration data gets folded in as the change ships.
          </p>
        </div>
      </section>
    </main>
  );
}
