import { ArrowLeft, ArrowUpRight, Code2, GitBranch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { trustUpdateChainSummary, trustUpdateEntries } from "@/lib/trust-update-log";

export default function TrustUpdatesPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Signed append-only registry updates
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Update Log</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Chained update entries record how trust stores change from genesis registry
                snapshot through badge, revocation, and score-history updates.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{trustUpdateChainSummary.entryCount} entries</span>
                <span>{trustUpdateChainSummary.algorithm}</span>
                <span>{trustUpdateChainSummary.latestRoot}</span>
              </div>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/updates" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Append-only" value={trustUpdateChainSummary.isAppendOnly ? "valid" : "broken"} />
            <Metric label="Valid signatures" value={trustUpdateChainSummary.validSignatureCount.toString()} />
            <Metric label="Broken links" value={trustUpdateChainSummary.brokenLinkCount.toString()} />
            <Metric label="Targets" value={trustUpdateChainSummary.targets} />
          </div>
        </article>

        {trustUpdateEntries.map((entry) => (
          <article
            className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
            key={entry.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  #{entry.sequence} / {entry.action}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{entry.target}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                  {entry.summary}
                </p>
              </div>
              <div className="grid size-12 place-items-center bg-[#0B0B0B] text-white">
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
                className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
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
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
