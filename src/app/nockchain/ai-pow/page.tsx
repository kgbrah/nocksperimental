import {
  ArrowLeft,
  BrainCircuit,
  Cpu,
  ExternalLink,
  GaugeCircle,
  GitPullRequest,
  Layers3,
  ListChecks,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { createNockchainAiPowIntelligence } from "@/lib/nockchain-ai-pow";

export const dynamic = "force-dynamic";

export default function NockchainAiPowPage() {
  const ai = createNockchainAiPowIntelligence();

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain">
            <ArrowLeft size={16} aria-hidden="true" />
            Nockchain evidence
          </Link>

          <div className="mt-5 flex items-center gap-2">
            <BrainCircuit size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              AI-PoW · matmul Proof-of-Useful-Work · monitoring, not protocol authority
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">AI Proof-of-Useful-Work readiness</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">{ai.summary}</p>

          {/* Status guard — the single most important caveat. */}
          <div className="mt-5 flex items-start gap-3 border-2 border-[#0B0B0B] bg-[#FFF8E6] px-4 py-3">
            <ShieldAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="text-sm leading-6">
              <p className="font-semibold">Preview — this is an open PR, not merged protocol.</p>
              <p className="mt-1 text-[#4A4A4A]">
                {ai.realWatchSignal} Merge state: <strong>{ai.mergeState}</strong>; review:{" "}
                <strong>{ai.reviewState}</strong>. No AI-PoW certificate is an &ldquo;app works on
                Nockchain&rdquo; claim.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <a
              href={ai.prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
            >
              <GitPullRequest size={13} aria-hidden="true" /> PR #{ai.prNumber} · {ai.author} ·{" "}
              +{ai.loc.additions.toLocaleString()}/−{ai.loc.deletions.toLocaleString()}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
            <Link
              href="/nockchain/pr-radar"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
            >
              <ListChecks size={13} aria-hidden="true" /> PR radar · {ai.watchFront}
            </Link>
          </div>
        </div>
      </section>

      {/* Crates */}
      <section className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <div className="flex items-center gap-2">
          <Cpu size={16} aria-hidden="true" />
          <h2 className="font-mono text-sm uppercase tracking-[0.12em]">New crates</h2>
        </div>
        <div className="mt-4 grid gap-px bg-[#0B0B0B] md:grid-cols-2">
          {ai.crates.map((c) => (
            <div key={c.crate} className="bg-[#FFFFFF] p-4">
              <code className="font-mono text-sm font-semibold">{c.crate}</code>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{c.role}</p>
              <ul className="mt-2 space-y-0.5">
                {c.keyFiles.map((f) => (
                  <li key={f} className="font-mono text-[11px] text-[#4A4A4A]">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Compact recursive certificate */}
      <section className="mx-auto max-w-5xl px-5 pb-8 lg:px-8">
        <div className="flex items-center gap-2">
          <Layers3 size={16} aria-hidden="true" />
          <h2 className="font-mono text-sm uppercase tracking-[0.12em]">Compact recursive certificate</h2>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
          The wire artifact is the {ai.certificate.artifact}. Three layers, then compacted:
        </p>
        <div className="mt-4 overflow-x-auto border border-[#0B0B0B]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#0B0B0B] text-[#FFFFFF]">
              <tr>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em]">Layer</th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em]">Role</th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em]">Hash</th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em]">FRI shape</th>
              </tr>
            </thead>
            <tbody>
              {ai.certificate.layers.map((l) => (
                <tr key={l.layer} className="border-t border-[#E5E5E5] align-top">
                  <td className="px-3 py-2 font-mono">
                    L{l.layer}
                    <div className="text-[11px] text-[#4A4A4A]">{l.name}</div>
                  </td>
                  <td className="px-3 py-2 text-[#4A4A4A]">{l.role}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{l.hash}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{l.friShape}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ai.measurements.map((m) => (
            <div key={m.metric} className="border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">{m.metric}</div>
              <div className="mt-0.5 font-mono text-lg font-semibold">{m.value}</div>
              <div className="text-[11px] text-[#4A4A4A]">{m.note}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-[#4A4A4A]">
          Production API (callers should use the compact bridge path):
        </p>
        <ul className="mt-1 space-y-0.5">
          {ai.certificate.productionApi.map((fn) => (
            <li key={fn} className="font-mono text-[11px] text-[#4A4A4A] break-all">
              {fn}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[11px] text-[#4A4A4A]">
          Authoritative doc: <code>{ai.certificate.authoritativeDoc}</code>
        </p>
      </section>

      {/* Proving-demand evidence — measured locally (preview) */}
      <section className="mx-auto max-w-5xl px-5 pb-8 lg:px-8">
        <div className="flex items-center gap-2">
          <GaugeCircle size={16} aria-hidden="true" />
          <h2 className="font-mono text-sm uppercase tracking-[0.12em]">
            Proving-demand evidence — measured locally (preview)
          </h2>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
          We reproduced the compact-certificate prove→verify→tamper-reject test in an isolated worktree
          against the unmerged PR head ({ai.provingBenchmark.branchHead}), {ai.provingBenchmark.profile} on{" "}
          {ai.provingBenchmark.host}. This is <strong>attested compute cost, not a live runtime claim</strong>{" "}
          and is not minted as a trust cert — it promotes into the compute-benchmark system only on merge.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">Compact cert bytes</div>
            <div className="mt-0.5 font-mono text-lg font-semibold">
              {ai.provingBenchmark.compactCertificateBytes.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#4A4A4A]">
              PR-reported {ai.provingBenchmark.prReportedCertBytes.toLocaleString()} (exact match)
            </div>
          </div>
          <div className="border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">Prove wall</div>
            <div className="mt-0.5 font-mono text-lg font-semibold">
              {(ai.provingBenchmark.proveWallMs / 1000).toFixed(2)} s
            </div>
            <div className="text-[11px] text-[#4A4A4A]">
              L1 {ai.provingBenchmark.l1OuterMs} ms · L2 {ai.provingBenchmark.l2ProveMs} ms
            </div>
          </div>
          <div className="border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">Compact verify</div>
            <div className="mt-0.5 font-mono text-lg font-semibold">{ai.provingBenchmark.compactVerifyMs} ms</div>
            <div className="text-[11px] text-[#4A4A4A]">cheap to verify</div>
          </div>
          <div className="border border-[#0B0B0B] bg-[#F6F6F6] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">Soundness</div>
            <div className="mt-0.5 font-mono text-lg font-semibold">{ai.provingBenchmark.tamperCasesRejected.length}/3 rejected</div>
            <div className="text-[11px] text-[#4A4A4A]">tamper cases all rejected</div>
          </div>
        </div>
        <p className="mt-3 font-mono text-[11px] text-[#4A4A4A] break-all">$ {ai.provingBenchmark.command}</p>
      </section>

      {/* Consensus tie-in */}
      <section className="mx-auto max-w-5xl px-5 pb-8 lg:px-8">
        <h2 className="font-mono text-sm uppercase tracking-[0.12em]">Why we care (consensus tie-in)</h2>
        <ul className="mt-3 space-y-2">
          {ai.consensusTieIn.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-6 text-[#4A4A4A]">
              <span aria-hidden="true">→</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Readiness plan */}
      <section className="mx-auto max-w-5xl px-5 pb-12 lg:px-8">
        <h2 className="font-mono text-sm uppercase tracking-[0.12em]">
          nocksperimental readiness plan (scaffold now, flip on merge)
        </h2>
        <div className="mt-4 grid gap-px bg-[#0B0B0B] md:grid-cols-2">
          {ai.readiness.map((r) => (
            <div key={r.id} className="bg-[#FFFFFF] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{r.title}</span>
                <span
                  className={`shrink-0 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
                    r.dependsOnMerge ? "border-[#0B0B0B] bg-[#FFF8E6]" : "border-[#0B0B0B] bg-[#0B0B0B] text-[#FFFFFF]"
                  }`}
                >
                  {r.dependsOnMerge ? "awaits merge" : "ships now"}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A4A]">{r.surface}</p>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{r.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 border border-[#0B0B0B] bg-[#F6F6F6] px-4 py-3 text-sm leading-6 text-[#4A4A4A]">
          <p>
            <strong className="text-[#0B0B0B]">Evidence-field discipline.</strong> When this merges, mirror{" "}
            {ai.evidenceFields.map((f) => (
              <code key={f.field} className="mx-0.5">
                {f.field}
              </code>
            ))}
            as attested compute cost only. Never ingest{" "}
            {ai.forbiddenFields.map((f, i) => (
              <span key={f}>
                <code>{f}</code>
                {i < ai.forbiddenFields.length - 1 ? ", " : ""}
              </span>
            ))}
            .
          </p>
        </div>
      </section>
    </main>
  );
}
