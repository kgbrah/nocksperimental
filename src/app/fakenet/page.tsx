import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  FileClock,
  Fingerprint,
  ListChecks,
  RadioTower,
  Terminal,
  TriangleAlert,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { createLocalFakenetCommandKit } from "@/lib/local-fakenet-commands";
import { createLocalFakenetDiagnostics } from "@/lib/local-fakenet-diagnostics";
import { createLocalFakenetEvidenceCapsule } from "@/lib/local-fakenet-evidence";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";
import {
  createLocalFakenetSupportBundle,
  createLocalFakenetSupportBundleMarkdown
} from "@/lib/local-fakenet-support-bundle";

export const dynamic = "force-dynamic";

export default function FakenetReadinessPage() {
  const readiness = createLocalFakenetReadiness();
  const commandKit = createLocalFakenetCommandKit();
  const diagnostics = createLocalFakenetDiagnostics();
  const evidenceCapsule = createLocalFakenetEvidenceCapsule();
  const supportBundle = createLocalFakenetSupportBundle();
  const supportBundleMarkdown = createLocalFakenetSupportBundleMarkdown();

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Local adapter readiness
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Local Fakenet</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Current local fakenet evidence from {readiness.reportCount} generated report
                artifact{readiness.reportCount === 1 ? "" : "s"} in {readiness.reportDir}.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/fakenet"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
              href="/api/fakenet/evidence"
            >
              <Fingerprint size={16} aria-hidden="true" />
              Evidence
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
              href="/api/fakenet/commands"
            >
              <Terminal size={16} aria-hidden="true" />
              Commands
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
              href="/api/fakenet/diagnostics"
            >
              <ListChecks size={16} aria-hidden="true" />
              Diagnostics
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
              href="/api/fakenet/support-bundle"
            >
              <Code2 size={16} aria-hidden="true" />
              Bundle
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
              href="/api/fakenet/runbook.sh"
            >
              <FileClock size={16} aria-hidden="true" />
              Runbook
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Status" value={readiness.status} />
        <Metric label="Reports" value={readiness.reportCount.toString()} />
        <Metric label="Endpoint" value={readiness.endpoint ?? "none"} />
        <Metric label="Generated" value={readiness.generatedAt} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Readiness Checks</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CheckTile label="Health" value={readiness.checks.health} />
            <CheckTile label="Balance" value={readiness.checks.balance} />
            <CheckTile label="Chain" value={readiness.checks.chain} />
          </div>
          {readiness.failures.length === 0 ? (
            <p className="mt-4 border border-[#8b8b7a] bg-white p-3 text-sm leading-6 text-[#44443d]">
              No readiness failures are present in the latest local fakenet reports.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {readiness.failures.map((failure) => (
                <div className="border border-[#8b8b7a] bg-white p-3" key={failure}>
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-1 size-4 shrink-0 text-[#6c3324]" aria-hidden="true" />
                    <p className="text-sm leading-6 text-[#44443d]">{failure}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <WalletCards size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Wallet And Chain</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Wallet" value={readiness.wallet.address ?? "none"} />
            <Callout
              label="Balance"
              value={
                readiness.wallet.amount === null
                  ? readiness.wallet.error ?? "missing"
                  : `${readiness.wallet.amount} ${readiness.wallet.unit}`
              }
            />
            <Callout
              label="Height"
              value={readiness.chain.height === null ? "missing" : readiness.chain.height.toString()}
            />
            <Callout
              label="Peers"
              value={
                readiness.chain.peerCount === null ? "missing" : readiness.chain.peerCount.toString()
              }
            />
            <Callout label="Block" value={readiness.chain.blockId ?? "missing"} />
            <Callout label="Commitment" value={readiness.chain.blockCommitment ?? "missing"} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="mb-5 border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Diagnostics</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {diagnostics.diagnostics.map((diagnostic) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={diagnostic.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                    {diagnostic.severity}
                  </span>
                  <h3 className="text-base font-semibold">{diagnostic.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#44443d]">{diagnostic.evidence}</p>
                <p className="mt-2 text-sm leading-6 text-[#171717]">{diagnostic.action}</p>
                <p className="mt-2 break-words font-mono text-sm text-[#6c3324]">
                  {diagnostic.command}
                </p>
              </div>
            ))}
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/diagnostics"
          >
            Diagnostics JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Capsule</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout label="Evidence" value={evidenceCapsule.evidenceId} />
            <Callout
              label="Verifier"
              value={evidenceCapsule.verifier.ready ? "ready" : "blocked"}
            />
            <Callout label="Artifacts" value={evidenceCapsule.summary.artifactCount.toString()} />
          </div>
          <div className="mt-4 border border-[#8b8b7a] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
              Verifier Inputs
            </div>
            <div className="mt-2 grid gap-2">
              {evidenceCapsule.verifier.inputs.reportIds.map((reportId) => (
                <p className="break-all font-mono text-sm text-[#6c3324]" key={reportId}>
                  {reportId}
                </p>
              ))}
            </div>
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/evidence"
          >
            Evidence JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Support Bundle</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout label="Bundle" value={supportBundle.bundleId} />
            <Callout label="Artifacts" value={supportBundle.artifacts.reports.length.toString()} />
            <Callout label="Diagnostics" value={supportBundle.summary.activeDiagnostics.toString()} />
          </div>
          <div className="mt-4 border border-[#8b8b7a] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
              Next Commands
            </div>
            <div className="mt-2 grid gap-2">
              {supportBundle.nextCommands.map((command) => (
                <p className="break-words font-mono text-sm text-[#6c3324]" key={command}>
                  {command}
                </p>
              ))}
            </div>
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/support-bundle"
          >
            Support bundle JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a
            className="ml-3 mt-4 inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
            data-markdown-bytes={supportBundleMarkdown.length}
            href="/api/fakenet/support-bundle.md"
          >
            Markdown
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#242424] bg-[#dce8ee] p-5">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Command Kit</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {commandKit.commands.map((command) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={command.id}>
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                  {command.label}
                </div>
                <p className="mt-2 break-words font-mono text-sm text-[#171717]">{command.command}</p>
                <p className="mt-2 text-sm leading-6 text-[#44443d]">{command.purpose}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border border-[#8b8b7a] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
              Refresh Sequence
            </div>
            <p className="mt-2 break-words font-mono text-sm text-[#171717]">
              {commandKit.refreshSequence.join(" && ")}
            </p>
          </div>
          <div className="mt-4 border border-[#8b8b7a] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
              Shell Runbook
            </div>
            <p className="mt-2 break-all font-mono text-sm text-[#171717]">
              {commandKit.runbookUrl}
            </p>
            <a
              className="mt-3 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/fakenet/runbook.sh"
            >
              Download runbook
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </article>
        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <FileClock size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Reports</h2>
          </div>
          {readiness.reports.length === 0 ? (
            <p className="mt-4 border border-[#8b8b7a] bg-white p-3 text-sm leading-6 text-[#44443d]">
              No local fakenet report artifacts were found.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#171717] text-white">
                  <tr>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Report
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Fixture
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Status
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Generated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {readiness.reports.map((report) => (
                    <tr className="border-t border-[#242424] bg-white" key={report.reportId}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{report.appSlug}</span>
                        <span className="mt-1 block break-all font-mono text-xs text-[#6c3324]">
                          {report.path}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{report.fixtureId}</td>
                      <td className="px-4 py-3 font-mono text-xs uppercase">{report.status}</td>
                      <td className="px-4 py-3 font-mono text-xs">{report.generatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <a
            className="mt-5 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet"
          >
            Raw readiness JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <RadioTower size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold capitalize">{value}</div>
    </div>
  );
}

function CheckTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <p className="mt-2 font-mono text-sm uppercase text-[#3f3f38]">{value}</p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <Terminal size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
