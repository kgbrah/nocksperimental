import {
  ArrowUpRight,
  BadgeCheck,
  Beaker,
  Blocks,
  Bot,
  Code2,
  FileCheck2,
  GitBranch,
  History,
  LockKeyhole,
  Radar,
  Scale,
  ShieldCheck,
  Terminal,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { ModuleExplorer } from "@/components/module-explorer";
import { sampleLabReport } from "@/lib/lab-report";
import { privateWorkspaces, reportHistory } from "@/lib/report-history";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";
import { trustConsumers, verifiedBadges } from "@/lib/trust-signals";

const iconByCategory = {
  "Core testing": Beaker,
  "Security analysis": ShieldCheck,
  "Solver tooling": Workflow,
  Operations: Radar,
  "Standards readiness": BadgeCheck,
  "Compute markets": Bot
};

export default function Home() {
  const immediateModules = labModules.filter((module) => module.horizon === "Now");

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]">
                <ShieldCheck size={14} aria-hidden="true" />
                NockApp testing lab
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Nocksperimental
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#4A4A4A] sm:text-lg">
                Testing, simulation, and monitoring infrastructure for NockApps
                before serious value moves through them.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Primary wedge" value="Test lab" />
              <Metric label="Parallel tracks" value={parallelTracks.length.toString()} />
              <Metric label="First artifact" value="Run report" />
            </div>
          </div>

          <div className="grid content-start gap-3">
            {immediateModules.map((module) => {
              const Icon = iconByCategory[module.category as keyof typeof iconByCategory];

              return (
                <article
                  className="border border-[#0B0B0B] bg-[#FFFFFF] p-4 shadow-[5px_5px_0_#0B0B0B]"
                  key={module.name}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center bg-[#0B0B0B] text-[#FFFFFF]">
                      <Icon size={19} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                        Rank {module.rank} · {module.capitalIntensity} capital
                      </div>
                      <h2 className="mt-1 text-xl font-semibold">{module.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                        {module.firstMilestone}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                First working artifact
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Fixture-driven lab report</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/reports/sample"
              >
                <FileCheck2 size={16} aria-hidden="true" />
                Open Report
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/reports/generated"
              >
                <FileCheck2 size={16} aria-hidden="true" />
                Generated
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/reports/history"
              >
                <History size={16} aria-hidden="true" />
                History
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/workspaces"
              >
                <LockKeyhole size={16} aria-hidden="true" />
                Workspaces
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/trust"
              >
                <BadgeCheck size={16} aria-hidden="true" />
                Trust
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/registry"
              >
                <Blocks size={16} aria-hidden="true" />
                Registry
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/nockchain"
              >
                <GitBranch size={16} aria-hidden="true" />
                Nockchain
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/verify"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Verify
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium"
                href="/fakenet"
              >
                <Terminal size={16} aria-hidden="true" />
                Fakenet
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {sampleLabReport.fixtureId}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">{sampleLabReport.app.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                    Mock-backed report for a NockApp fakenet run. The next adapter replaces this
                    mock execution with gRPC calls against a local fakenet node.
                  </p>
                </div>
                <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-2 font-mono text-xs uppercase">
                  {sampleLabReport.summary.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Steps"
                  value={`${sampleLabReport.summary.stepsPassed}/${sampleLabReport.steps.length}`}
                />
                <Metric
                  label="Invariants"
                  value={`${sampleLabReport.summary.invariantsPassed}/${sampleLabReport.invariants.length}`}
                />
                <Metric
                  label="Snapshots"
                  value={sampleLabReport.summary.snapshotsCaptured.toString()}
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Callout label="Hosted reports" value={reportHistory.length.toString()} />
                <Callout label="Private workspaces" value={privateWorkspaces.length.toString()} />
                <Callout label="Verified badges" value={verifiedBadges.length.toString()} />
                <Callout label="Trust consumers" value={trustConsumers.length.toString()} />
              </div>

              <div className="mt-5 border border-[#0B0B0B] bg-[#0B0B0B] p-3 font-mono text-xs text-[#FFFFFF]">
                <div className="flex items-center gap-2">
                  <Terminal size={14} aria-hidden="true" />
                  npm run lab:ci
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
                <h3 className="text-lg font-semibold">Scripted run</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {sampleLabReport.steps.map((step) => (
                    <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{step.title}</p>
                        <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                          {step.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.observed}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
                <h3 className="text-lg font-semibold">Invariant checks</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {sampleLabReport.invariants.map((invariant) => (
                    <div className="border border-[#0B0B0B] bg-white p-3" key={invariant.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{invariant.title}</p>
                        <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                          {invariant.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                        {invariant.observed}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Build plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Core product plus parallel options</h2>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/lab"
            >
              <Code2 size={16} aria-hidden="true" />
              Lab JSON
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <ModuleExplorer modules={labModules} />
        </div>
      </section>

      <section className="border-b border-[#0B0B0B] bg-[#F5F5F5]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
              <GitBranch size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Execution roadmap
              </p>
              <h2 className="text-2xl font-semibold">How this compounds</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {strategyPhases.map((phase) => (
              <article
                className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
                key={phase.timeframe}
              >
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {phase.timeframe}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{phase.objective}</h3>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4A4A4A]">
                  {phase.ship.map((item) => (
                    <li className="flex gap-2" key={item}>
                      <FileCheck2
                        className="mt-1 size-4 shrink-0 text-[#0B0B0B]"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-[#0B0B0B] pt-4 text-sm font-medium text-[#0B0B0B]">
                  {phase.proofOfValue}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
              <Blocks size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Parallel tracks
              </p>
              <h2 className="text-2xl font-semibold">Build beside the core, not instead of it</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {parallelTracks.map((track) => (
              <article
                className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
                key={track.name}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center bg-[#0B0B0B] text-white">
                    <Scale size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{track.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{track.whyItMatters}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Callout label="Shared core" value={track.sharedCore} />
                  <Callout label="First artifact" value={track.firstArtifact} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
