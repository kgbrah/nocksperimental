import {
  ArrowUpRight,
  BadgeCheck,
  Beaker,
  Blocks,
  Bot,
  Code2,
  FileCheck2,
  GitBranch,
  Radar,
  Scale,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { ModuleExplorer } from "@/components/module-explorer";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";

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
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]">
                <ShieldCheck size={14} aria-hidden="true" />
                NockApp testing lab
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Nocksperimental
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#3d3d35] sm:text-lg">
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
                  className="border border-[#242424] bg-[#fdfbf4] p-4 shadow-[5px_5px_0_#242424]"
                  key={module.name}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center bg-[#171717] text-[#fdfbf4]">
                      <Icon size={19} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                        Rank {module.rank} · {module.capitalIntensity} capital
                      </div>
                      <h2 className="mt-1 text-xl font-semibold">{module.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#4a4a42]">
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

      <section className="border-b border-[#242424] bg-[#fdfbf4]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#6c3324]">
                Build plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Core product plus parallel options</h2>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
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

      <section className="border-b border-[#242424] bg-[#e8ead7]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#171717] text-white">
              <GitBranch size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#536023]">
                Execution roadmap
              </p>
              <h2 className="text-2xl font-semibold">How this compounds</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {strategyPhases.map((phase) => (
              <article
                className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
                key={phase.timeframe}
              >
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                  {phase.timeframe}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{phase.objective}</h3>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[#44443d]">
                  {phase.ship.map((item) => (
                    <li className="flex gap-2" key={item}>
                      <FileCheck2 className="mt-1 size-4 shrink-0 text-[#536023]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-[#8b8b7a] pt-4 text-sm font-medium text-[#6c3324]">
                  {phase.proofOfValue}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#171717] text-white">
              <Blocks size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Parallel tracks
              </p>
              <h2 className="text-2xl font-semibold">Build beside the core, not instead of it</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {parallelTracks.map((track) => (
              <article
                className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
                key={track.name}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center bg-[#171717] text-white">
                    <Scale size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{track.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#44443d]">{track.whyItMatters}</p>
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
    <div className="border border-[#242424] bg-[#fdfbf4] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
