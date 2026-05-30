import { ArrowLeft, BadgeCheck, Code2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { verifiedBadges } from "@/lib/trust-signals";

export default function BadgesPage() {
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
                Verified report badges
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Badges</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Badge records bind a report, snapshot root, invariant packs, and registry
                signature into a shareable trust signal.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/badges"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {verifiedBadges.map((badge) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={badge.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-[#242424] bg-[#e8ead7] px-2 py-1 font-mono text-xs uppercase">
                    {badge.status}
                  </span>
                  <span className="border border-[#242424] bg-white px-2 py-1 font-mono text-xs uppercase">
                    {badge.kind}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold">{badge.label}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                  {badge.reportSlug} · {badge.fixtureId}
                </p>
              </div>
              <div className="grid size-12 place-items-center bg-[#171717] text-white">
                <BadgeCheck size={22} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Callout label="Report hash" value={badge.evidence.reportHash} />
              <Callout label="Snapshot root" value={badge.evidence.snapshotRoot} />
              <Callout label="Signature" value={badge.evidence.signature} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-words font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
