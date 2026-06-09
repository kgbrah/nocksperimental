import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, GitCommit, Rocket } from "lucide-react";
import Link from "next/link";
import { createTrustFreshnessRollup } from "@/lib/trust-freshness";

export const dynamic = "force-dynamic";

const OVERALL_LABEL: Record<string, string> = {
  anchored: "All evidence anchored to the current build",
  "stale-evidence": "Some evidence is anchored to an older build",
  "drift-detected": "Upstream drift detected — re-anchor before trusting"
};

export default function TrustFreshnessPage() {
  const rollup = createTrustFreshnessRollup();

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]"
            href="/trust"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Trust
          </Link>
          <h1 className="mt-2 text-4xl font-semibold">Trust Evidence Freshness</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#3d3d35]">
            Whether all published trust evidence is anchored to the exact Nockchain build
            Nocksperimental currently tracks. Verified badges, launch-evidence cases, and the
            aggregate upstream drift check are rolled up against the pinned commit; evidence pinned to
            an older build is reported as stale.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Overall" value={rollup.overall} />
            <Metric label="Pinned commit" value={rollup.currentUpstream.commit.slice(0, 12)} />
            <Metric label="Drift status" value={rollup.currentUpstream.driftStatus} />
          </div>
          <p className="mt-3 text-sm font-medium text-[#25465d]">
            {OVERALL_LABEL[rollup.overall] ?? rollup.overall}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <h2 className="text-2xl font-semibold">Freshness by evidence type</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FreshnessCard
            icon={<BadgeCheck size={18} aria-hidden="true" />}
            title="Verified badges"
            total={rollup.badges.total}
            freshness={rollup.badges.freshness}
          />
          <FreshnessCard
            icon={<Rocket size={18} aria-hidden="true" />}
            title="Launch evidence"
            total={rollup.launchEvidence.total}
            freshness={rollup.launchEvidence.freshness}
          />
          <article className="border border-[#242424] bg-[#fdfbf4] p-4 shadow-[4px_4px_0_#242424]">
            <div className="flex items-center gap-2">
              {rollup.driftStatus.status === "in-sync" ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <AlertTriangle size={18} aria-hidden="true" />
              )}
              <h3 className="text-lg font-semibold">Upstream drift</h3>
            </div>
            <p className="mt-2 text-sm text-[#44443d]">
              {rollup.driftStatus.summary.inSyncChecks}/{rollup.driftStatus.summary.totalChecks} checks
              in sync · {rollup.driftStatus.status}
            </p>
            <Link className="mt-3 inline-block font-mono text-xs text-[#25465d]" href="/nockchain/drift-status">
              View drift status →
            </Link>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <GitCommit size={16} aria-hidden="true" />
            <h2 className="text-xl font-semibold">How freshness is computed</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#44443d]">
            Each badge and launch-evidence case records the Nockchain <code>commit</code>/<code>build</code>
            it was verified against. A piece of evidence is <strong>fresh</strong> when that commit equals
            the pinned upstream commit (<code>{rollup.currentUpstream.commit.slice(0, 12)}</code>),
            <strong> stale</strong> when it differs, and <strong>unknown</strong> when unanchored. The
            <code> overall</code> verdict is <code>drift-detected</code> if the aggregate drift check is not
            in-sync, else <code>stale-evidence</code> if any evidence is stale, else <code>anchored</code>.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
            href="/api/trust/freshness" target="_blank" rel="noreferrer"
          >
            View JSON
          </Link>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] px-4 py-3 shadow-[4px_4px_0_#242424]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6b6b60]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FreshnessCard({
  icon,
  title,
  total,
  freshness
}: {
  icon: React.ReactNode;
  title: string;
  total: number;
  freshness: { fresh: number; stale: number; unknown: number };
}) {
  return (
    <article className="border border-[#242424] bg-[#fdfbf4] p-4 shadow-[4px_4px_0_#242424]">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-[#44443d]">{total} total</p>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
        <span className="rounded-full bg-[#1f3d2b] px-3 py-1 text-[#e7f5ec]">fresh {freshness.fresh}</span>
        <span className="rounded-full bg-[#5c4a16] px-3 py-1 text-[#fbf3d8]">stale {freshness.stale}</span>
        <span className="rounded-full bg-[#3a3a3a] px-3 py-1 text-[#ece9e0]">unknown {freshness.unknown}</span>
      </div>
    </article>
  );
}
