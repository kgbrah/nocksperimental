import { ArrowLeft, ArrowUpRight, Code2, GitBranch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { trustUpdateChainSummary, trustUpdateEntries } from "@/lib/trust-update-log";

export default function TrustUpdatesPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Signed append-only registry updates
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Update Log</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Chained update entries record how trust stores change from genesis registry
                snapshot through badge, revocation, and score-history updates.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{trustUpdateChainSummary.entryCount} entries</span>
                <span>{trustUpdateChainSummary.algorithm}</span>
                <span>{trustUpdateChainSummary.latestRoot}</span>
              </div>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/updates"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Append-only" value={trustUpdateChainSummary.isAppendOnly ? "valid" : "broken"} />
            <Metric label="Valid signatures" value={trustUpdateChainSummary.validSignatureCount.toString()} />
            <Metric label="Broken links" value={trustUpdateChainSummary.brokenLinkCount.toString()} />
            <Metric label="Targets" value={trustUpdateChainSummary.targets} />
          </div>
        </article>

        {trustUpdateEntries.map((entry) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={entry.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                  #{entry.sequence} / {entry.action}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{entry.target}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                  {entry.summary}
                </p>
              </div>
              <div className="grid size-12 place-items-center bg-[#171717] text-white">
                <GitBranch size={22} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Metric label="Target path" value={entry.targetPath} />
              <Metric label="Recorded" value={entry.recordedAt} />
              <Metric label="Previous root" value={entry.previousRoot} />
              <Metric label="Root hash" value={entry.rootHash} />
              <Metric label="Entry hash" value={entry.entryHash} />
              <Metric label="Signature" value={entry.signature.signature} />
            </div>

            <div className="mt-4">
              <Link
                className="inline-flex items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium"
                href={`/trust/updates/${entry.id}`}
              >
                Open Detail
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
