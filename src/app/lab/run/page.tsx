import { ArrowLeft, ArrowUpRight, FlaskConical, ShieldAlert, GitBranch, Boxes } from "lucide-react";
import Link from "next/link";
import { labFixtures, fixtureKind, type LabFixtureEntry } from "@/lib/lab-fixtures";

export const dynamic = "force-dynamic";

const KIND_META = {
  "cross-chain": { label: "Cross-chain", icon: GitBranch },
  attack: { label: "Attack / negative control", icon: ShieldAlert },
  app: { label: "App fixture", icon: Boxes }
} as const;

function FixtureCard({ fixture }: { fixture: LabFixtureEntry }) {
  const kind = fixtureKind(fixture.slug);
  const Icon = KIND_META[kind].icon;
  return (
    <div className="flex flex-col justify-between border-2 border-[#0B0B0B] bg-[#FFFFFF] p-4 shadow-[4px_4px_0_#0B0B0B]">
      <div>
        <div className="flex items-center gap-1.5">
          <Icon size={14} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
            {KIND_META[kind].label}
          </span>
        </div>
        <p className="mt-1.5 text-base font-semibold">{fixture.name}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-[#4A4A4A]">{fixture.path}</p>
      </div>
      <Link
        href={`/reports/generated/${fixture.slug}`}
        className="mt-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
      >
        View report <ArrowUpRight size={12} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function LabRunPage() {
  const groups: Array<{ kind: keyof typeof KIND_META; items: LabFixtureEntry[] }> = (
    ["app", "cross-chain", "attack"] as const
  ).map((kind) => ({ kind, items: labFixtures.filter((f) => fixtureKind(f.slug) === kind) }));

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-5 flex items-center gap-2">
            <FlaskConical size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Interactive lab · {labFixtures.length} fixtures
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Test apps</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            Every NockApp scenario the lab runs — single-chain apps, the cross-chain Nockchain&lt;-&gt;Base
            tester, and the attack catalog (negative controls that must be caught). Each fixture drives
            the verification chain (fixture → invariants → generated report → evidence). Browse a
            fixture&apos;s generated report to see its re-derived status, invariants, and evidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/reports/generated"
              className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF]"
            >
              All generated reports <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF]"
            >
              Invariant catalog <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {groups.map(({ kind, items }) =>
        items.length === 0 ? null : (
          <section key={kind} className="mx-auto max-w-6xl px-5 py-7 lg:px-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              {KIND_META[kind].label} · {items.length}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((f) => (
                <FixtureCard key={f.slug} fixture={f} />
              ))}
            </div>
          </section>
        )
      )}

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
          Runs are executed by the nocklab CLI (npm run lab:ci); this browser surfaces the catalog +
          pre-generated reports. Live in-browser runs are out of scope (the Worker cannot spawn the CLI).
        </p>
      </section>
    </main>
  );
}
