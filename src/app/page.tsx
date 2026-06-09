import {
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  CheckCircle2,
  Code2,
  FileCheck2,
  FlaskConical,
  Gamepad2,
  GitBranch,
  KeyRound,
  Network,
  Radar,
  ScrollText,
  ShieldCheck,
  Terminal,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { ModuleExplorer } from "@/components/module-explorer";
import { sampleLabReport } from "@/lib/lab-report";
import { privateWorkspaces, reportHistory } from "@/lib/report-history";
import { labModules, parallelTracks, strategyPhases } from "@/lib/strategy";
import { trustConsumers, verifiedBadges } from "@/lib/trust-signals";

// What the lab CAN do — each grounded in a real route/CLI surface.
const CAPABILITIES = [
  {
    title: "Run fixture-driven NockApp tests",
    body: "Script poke / peek / fakenet / invariant / bridge steps as JSON fixtures, get a typed run report with per-step state diffs + snapshots.",
    where: "nocklab CLI · /lab/run"
  },
  {
    title: "Check state against an invariant catalog",
    body: "12 invariant kinds — numeric floors/ranges, supply conservation, authorized-actor, temporal ordering, monotonic counters — plus allowlisted custom checks (e.g. replay-safety).",
    where: "/verify · packs/"
  },
  {
    title: "Diagnose a local fakenet",
    body: "Command-backed health, balance, chain metadata, diagnostics, support bundles, and evidence capsules against your own node.",
    where: "/fakenet"
  },
  {
    title: "Read live cross-chain bridge state",
    body: "Read-only view of the Basescan-verified Nockchain↔Base 3-of-5 bridge on Base Sepolia, with quorum/replay/finality invariants over real mints.",
    where: "/bridge"
  },
  {
    title: "Generate CI evidence artifacts",
    body: "One command produces JSON + Markdown report artifacts your repo can publish from CI.",
    where: "npm run lab:ci"
  },
  {
    title: "Publish & independently verify evidence",
    body: "Signed badges, generated-report evidence, fakenet receipts, and registry roots each have a re-derivable verifier — trust nothing, check everything.",
    where: "/verify · /trust"
  }
];

// What it CANNOT do — the honest limits (grounded in AGENTS.md anti-overclaim rules).
const LIMITS = [
  {
    title: "Mock runs are not live-chain truth",
    body: "A mock-fakenet report models state transitions; it does not prove your deployed kernel behaves the same way."
  },
  {
    title: "A passing fixture is model-attested, not an “app works” cert",
    body: "Model-attested and exploit-prevention (expectRejected) results are never presented as proof the deployed app works."
  },
  {
    title: "A verified cert is earned, never assumed",
    body: "Certs must be signed by an active non-dev key, bound to a real report hash + snapshot root, and re-derived from steps — we never trust a report’s self-declared status."
  },
  {
    title: "Live cross-chain reads are testnet-first",
    body: "live-base reads Base Sepolia read-only; the Nockchain leg stays modeled, and empty windows pass vacuously — not as proof."
  },
  {
    title: "It holds no keys and takes no custody",
    body: "Reads are getBlockNumber / readContract / getLogs only. The product never stores keys, seeds, wallet exports, or raw payment material."
  },
  {
    title: "Not a security guarantee",
    body: "Passing invariants reduce risk; they don’t replace an audit. The watch board is monitoring, not protocol authority."
  }
];

const TEST_LAUNCHERS = [
  { href: "/lab/run", label: "Browse test apps", icon: FlaskConical, blurb: "Every fixture the lab runs — apps, cross-chain, attack controls — with re-derived reports." },
  { href: "/reports/sample", label: "See a sample report", icon: FileCheck2, blurb: "What a passing run looks like: steps, invariants, state diffs, snapshots (+ raw JSON)." },
  { href: "/verify", label: "Verify evidence yourself", icon: ShieldCheck, blurb: "Independently re-check any badge, report, or fakenet receipt the lab emits." },
  { href: "/pocgames/forfeit-flip", label: "Play & verify in-browser", icon: Gamepad2, blurb: "Hands-on commit-reveal: recompute a provably-fair outcome live, no value at risk." },
  { href: "/fakenet", label: "Connect your fakenet", icon: Terminal, blurb: "Bring your own nockchain --fakenet: copy-paste command kit + downloadable runbook." },
  { href: "/bridge", label: "Watch the live bridge", icon: Network, blurb: "Real Nockchain↔Base 3-of-5 bridge state on Base Sepolia — the cross-chain invariants, live." }
];

const AUDIENCES = [
  { who: "NockApp developers", icon: Code2, line: "Script peek/poke fixtures and run deterministic local checks before wallets, explorers, and users depend on your app." },
  { who: "Auditors & integrators", icon: ShieldCheck, line: "Get re-derivable, signed evidence you can verify independently — instead of trusting a self-declared status." },
  { who: "Operators", icon: Radar, line: "Watch bridge/settlement state on Base Sepolia and Nockchain upstream drift with alert-ready timelines." }
];

export default function Home() {
  return (
    <main className="bg-[#FFFFFF] text-[#0B0B0B]">
      {/* HERO — say what it is in one breath. */}
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="mb-5 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]">
            <ShieldCheck size={14} aria-hidden="true" />
            NockApp testing &amp; evidence lab
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Test your NockApp, prove it, and share the evidence.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#4A4A4A] sm:text-lg">
            Nocksperimental is a testing, simulation, and monitoring lab for Nockchain apps. Script how your
            app behaves, check it against invariants, and turn each run into an auditable report you can hand
            to a teammate, an auditor, or CI &mdash; <strong>before real value moves through it.</strong>
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0B] bg-[#0B0B0B] px-5 py-2.5 text-sm font-medium text-white shadow-[4px_4px_0_#0B0B0B] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              href="#run-tests"
            >
              <Terminal size={16} aria-hidden="true" />
              Run interactive tests
            </Link>
            <Link
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-5 py-2.5 text-sm font-medium shadow-[4px_4px_0_#0B0B0B] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              href="/reports/sample"
            >
              <FileCheck2 size={16} aria-hidden="true" />
              See a sample report
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {["Testnet-first", "No key custody", "Re-verifiable evidence", "Open CLI (nocklab)"].map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]"
              >
                <CheckCircle2 size={12} aria-hidden="true" /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IT CAN / CANNOT DO — the honest two-column. */}
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
                <CheckCircle2 size={22} aria-hidden="true" /> What it can do
              </h2>
              <div className="mt-5 space-y-3">
                {CAPABILITIES.map((c) => (
                  <article key={c.title} className="border border-[#0B0B0B] bg-[#FFFFFF] p-4 shadow-[4px_4px_0_#0B0B0B]">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4A4A4A]">{c.body}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#0B0B0B]">{c.where}</p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
                <XCircle size={22} aria-hidden="true" /> What it can&apos;t do
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                Honest limits, on purpose. Nocksperimental refuses to overclaim &mdash; here is what a green run does
                <em> not</em> mean.
              </p>
              <div className="mt-5 space-y-3">
                {LIMITS.map((l) => (
                  <article key={l.title} className="border border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-4">
                    <h3 className="font-semibold">{l.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4A4A4A]">{l.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RUN INTERACTIVE TESTS — zero to running in 3 steps. */}
      <section id="run-tests" className="scroll-mt-20 border-b border-[#0B0B0B] bg-[#0B0B0B] text-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#A3A3A3]">For developers</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Run interactive tests</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D4D4D4]">
            Browse what the lab tests, run a fixture, and verify the evidence yourself &mdash; zero trust required.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <Step n="1" title="Install & boot">
              <Cmd>npm install &amp;&amp; npm run dev</Cmd>
              <p className="mt-2 text-xs text-[#A3A3A3]">Open http://localhost:3000</p>
            </Step>
            <Step n="2" title="Run your first fixture">
              <Cmd>npm run lab:sample</Cmd>
              <p className="mt-2 text-xs text-[#A3A3A3]">Writes a report to .nocklab/ — then open the sample viewer.</p>
            </Step>
            <Step n="3" title="Verify the evidence">
              <Cmd>npm run verify:portable</Cmd>
              <p className="mt-2 text-xs text-[#A3A3A3]">Exit 0 = verified, offline, without trusting this host. Or paste a receipt into /verify.</p>
            </Step>
          </div>

          <div className="mt-4 border border-[#404040] bg-[#171717] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3]">Point it at your own NockApp</p>
            <div className="mt-2 font-mono text-xs text-[#FFFFFF]">npx nocklab run --config nocklab.config.json --ci --strict</div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEST_LAUNCHERS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="group flex flex-col gap-2 border-2 border-[#FFFFFF] bg-[#0B0B0B] p-4 transition hover:bg-[#FFFFFF] hover:text-[#0B0B0B]"
                >
                  <div className="flex items-center justify-between">
                    <Icon size={20} aria-hidden="true" />
                    <ArrowUpRight size={16} aria-hidden="true" className="opacity-50 transition group-hover:opacity-100" />
                  </div>
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-xs leading-5 text-[#A3A3A3] group-hover:text-[#4A4A4A]">{t.blurb}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <h2 className="text-2xl font-semibold">Who it&apos;s for</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <article key={a.who} className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
                  <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{a.who}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{a.line}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROOF: the first working artifact (a real lab report). */}
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">First working artifact</p>
              <h2 className="mt-2 text-2xl font-semibold">A fixture-driven lab report</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white" href="/reports/sample">
                <FileCheck2 size={16} aria-hidden="true" /> Open report <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium" href="/reports/generated">
                <ScrollText size={16} aria-hidden="true" /> Generated
              </Link>
              <Link className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium" href="/trust">
                <BadgeCheck size={16} aria-hidden="true" /> Trust
              </Link>
              <Link className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#FFFFFF] px-4 py-2 text-sm font-medium" href="/nockchain">
                <GitBranch size={16} aria-hidden="true" /> Nockchain
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{sampleLabReport.fixtureId}</p>
                  <h3 className="mt-1 text-2xl font-semibold">{sampleLabReport.app.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                    Mock-backed report for a NockApp fakenet run &mdash; model-attested, not an app cert. The local
                    adapter replaces this mock execution with commands against your own fakenet node.
                  </p>
                </div>
                <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-2 font-mono text-xs uppercase">
                  {sampleLabReport.summary.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="Steps" value={`${sampleLabReport.summary.stepsPassed}/${sampleLabReport.steps.length}`} />
                <Metric label="Invariants" value={`${sampleLabReport.summary.invariantsPassed}/${sampleLabReport.invariants.length}`} />
                <Metric label="Snapshots" value={sampleLabReport.summary.snapshotsCaptured.toString()} />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Callout label="Hosted reports" value={reportHistory.length.toString()} />
                <Callout label="Private workspaces" value={privateWorkspaces.length.toString()} />
                <Callout label="Verified badges" value={verifiedBadges.length.toString()} />
                <Callout label="Trust consumers" value={trustConsumers.length.toString()} />
              </div>

              <div className="mt-5 border border-[#0B0B0B] bg-[#0B0B0B] p-3 font-mono text-xs text-[#FFFFFF]">
                <div className="flex items-center gap-2">
                  <Terminal size={14} aria-hidden="true" /> npm run lab:ci
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
                        <span className="font-mono text-xs uppercase text-[#0B0B0B]">{step.status}</span>
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
                        <span className="font-mono text-xs uppercase text-[#0B0B0B]">{invariant.status}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{invariant.observed}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* BUILD PLAN (existing module explorer) */}
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">Build plan</p>
              <h2 className="mt-2 text-2xl font-semibold">Core product plus parallel options</h2>
            </div>
            <a className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white" href="/api/lab">
              <Code2 size={16} aria-hidden="true" /> Lab JSON <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <ModuleExplorer modules={labModules} />
        </div>
      </section>

      {/* ROADMAP */}
      <section className="border-b border-[#0B0B0B] bg-[#F5F5F5]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
              <GitBranch size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">Execution roadmap</p>
              <h2 className="text-2xl font-semibold">How this compounds</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {strategyPhases.map((phase) => (
              <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]" key={phase.timeframe}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{phase.timeframe}</p>
                <h3 className="mt-2 text-lg font-semibold">{phase.objective}</h3>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4A4A4A]">
                  {phase.ship.map((item) => (
                    <li className="flex gap-2" key={item}>
                      <FileCheck2 className="mt-1 size-4 shrink-0 text-[#0B0B0B]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-[#0B0B0B] pt-4 text-sm font-medium text-[#0B0B0B]">{phase.proofOfValue}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PARALLEL TRACKS */}
      <section className="bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
              <Blocks size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">Parallel tracks</p>
              <h2 className="text-2xl font-semibold">Build beside the core, not instead of it</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {parallelTracks.map((track) => (
              <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]" key={track.name}>
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center bg-[#0B0B0B] text-white">
                    <KeyRound size={17} aria-hidden="true" />
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

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#404040] bg-[#171717] p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center bg-[#FFFFFF] font-mono text-xs font-semibold text-[#0B0B0B]">{n}</span>
        <p className="font-semibold">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Cmd({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto border border-[#404040] bg-[#0B0B0B] p-2.5 font-mono text-xs text-[#FFFFFF]">{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
