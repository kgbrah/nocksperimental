import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainDriftStatus } from "@/lib/nockchain-drift-status";

export const dynamic = "force-dynamic";

const aggregateCommand = "npm run check:nockchain-upstream-drift -- --json";
const refreshCommand = "npm run refresh:nockchain-drift-status";

export default function NockchainDriftStatusPage() {
  const driftStatus = createNockchainDriftStatus();
  const freshnessLabel = driftStatus.freshness.stale ? "stale" : "fresh";
  const ageLabel =
    driftStatus.freshness.ageHours === null
      ? "unknown"
      : `${driftStatus.freshness.ageHours}h ago`;

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]"
            href="/nockchain"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Nockchain
          </Link>
          <h1 className="mt-2 text-4xl font-semibold">Nockchain Upstream Watch — Drift Status</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#3d3d35]">
            Public snapshot of the aggregate Nockchain/Zorp upstream drift check. It proves
            Nocksperimental is still pinned to the exact Nockchain build it tests against. This is a
            watch board, not authority: re-run <code>{aggregateCommand}</code> and refresh the
            snapshot before treating it as current.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Metric label="Status" value={driftStatus.status} />
            <Metric
              label="Checks in sync"
              value={`${driftStatus.summary.inSyncChecks}/${driftStatus.summary.totalChecks}`}
            />
            <Metric label="Last observed" value={ageLabel} />
            <Metric label="Freshness" value={freshnessLabel} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex items-center gap-2">
          {driftStatus.status === "in-sync" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertTriangle size={18} aria-hidden="true" />
          )}
          <h2 className="text-2xl font-semibold">Drift Checks</h2>
        </div>
        <p className="mt-1 text-sm text-[#44443d]">
          Observed {driftStatus.observedAt} · generated {driftStatus.generatedAt}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {driftStatus.checks.map((check) => (
            <article
              className="flex items-start justify-between gap-3 border border-[#242424] bg-[#fdfbf4] p-4 shadow-[4px_4px_0_#242424]"
              key={check.id}
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                  {check.domain}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{check.label}</h3>
                <p className="mt-1 font-mono text-xs text-[#6b6b60]">{check.id}</p>
              </div>
              <StatusPill status={check.status} />
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} aria-hidden="true" />
            <h2 className="text-xl font-semibold">How this refreshes</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#44443d]">
            <li className="flex items-start gap-2">
              <Clock size={14} aria-hidden="true" className="mt-1" />
              The scheduled <code>nockchain-drift-monitor</code> GitHub Action runs the aggregate
              check daily, regenerates this snapshot with <code>{refreshCommand}</code>, and opens a
              pull request when drift is detected.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} aria-hidden="true" className="mt-1" />
              The snapshot is committed at <code>src/data/nockchain-drift-status.json</code> and read
              with no live fetch, so this surface is deterministic and never publishes raw chain state
              or secrets.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
              href="/api/nockchain/drift-status"
            >
              View JSON
            </Link>
            <Link
              className="inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
              href="/nockchain/watch"
            >
              Watch board
            </Link>
          </div>
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "in-sync"
      ? "bg-[#1f3d2b] text-[#e7f5ec]"
      : status === "review-needed"
        ? "bg-[#5c4a16] text-[#fbf3d8]"
        : "bg-[#5a1d1d] text-[#f8e3e3]";

  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 font-mono text-xs ${tone}`}>
      {status}
    </span>
  );
}
