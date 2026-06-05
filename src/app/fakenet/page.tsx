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
import { createFakenetConnectionProfile } from "@/lib/fakenet-connection-profile";
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
  const connectionTemplate = createFakenetConnectionProfile();

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Local adapter readiness
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Local Fakenet</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Current local fakenet evidence from {readiness.reportCount} generated report
                artifact{readiness.reportCount === 1 ? "" : "s"} in {readiness.reportDir}.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/fakenet"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
              href="/api/fakenet/evidence"
            >
              <Fingerprint size={16} aria-hidden="true" />
              Evidence
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
              href="/api/fakenet/commands"
            >
              <Terminal size={16} aria-hidden="true" />
              Commands
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
              href="/api/fakenet/diagnostics"
            >
              <ListChecks size={16} aria-hidden="true" />
              Diagnostics
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
              href="/api/fakenet/support-bundle"
            >
              <Code2 size={16} aria-hidden="true" />
              Bundle
            </a>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
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

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Bring Your Own Fakenet</h2>
          </div>
          <form
            action="/api/fakenet/connect"
            className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.3fr_1fr_auto]"
            method="get"
          >
            <label className="grid gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Endpoint
              </span>
              <input
                className="min-h-11 border border-[#0B0B0B] bg-white px-3 font-mono text-sm text-[#0B0B0B]"
                defaultValue={connectionTemplate.connection.endpoint.testEndpoint}
                name="endpoint"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Wallet
              </span>
              <input
                className="min-h-11 border border-[#0B0B0B] bg-white px-3 font-mono text-sm text-[#0B0B0B]"
                defaultValue={connectionTemplate.connection.walletAddress}
                name="walletAddress"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                Network
              </span>
              <input
                className="min-h-11 border border-[#0B0B0B] bg-white px-3 font-mono text-sm text-[#0B0B0B]"
                defaultValue={connectionTemplate.connection.networkId}
                name="networkId"
              />
            </label>
            <button
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 text-sm font-medium text-white lg:mt-auto"
              type="submit"
            >
              <Code2 size={16} aria-hidden="true" />
              Profile JSON
            </button>
          </form>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {connectionTemplate.testFunctions.map((testFunction) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={testFunction.id}>
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {testFunction.label}
                </div>
                <p className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">
                  {testFunction.command}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {testFunction.purpose}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 border border-[#0B0B0B] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Submit Evidence
            </div>
            <p className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">
              {connectionTemplate.commands.submitEvidence}
            </p>
            <a
              className="mt-3 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/fakenet/evidence/submit"
            >
              Submit API
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <Link
              className="mt-3 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
              href="/api/fakenet/evidence/receipts"
            >
              Receipts
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
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
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No readiness failures are present in the latest local fakenet reports.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {readiness.failures.map((failure) => (
                <div className="border border-[#0B0B0B] bg-white p-3" key={failure}>
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-1 size-4 shrink-0 text-[#0B0B0B]" aria-hidden="true" />
                    <p className="text-sm leading-6 text-[#4A4A4A]">{failure}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
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
        <article className="mb-5 border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Diagnostics</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {diagnostics.diagnostics.map((diagnostic) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={diagnostic.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {diagnostic.severity}
                  </span>
                  <h3 className="text-base font-semibold">{diagnostic.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{diagnostic.evidence}</p>
                <p className="mt-2 text-sm leading-6 text-[#0B0B0B]">{diagnostic.action}</p>
                <p className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">
                  {diagnostic.command}
                </p>
              </div>
            ))}
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/diagnostics"
          >
            Diagnostics JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#0B0B0B] bg-[#FFFFFF] p-5">
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
          <div className="mt-4 border border-[#0B0B0B] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Verifier Inputs
            </div>
            <div className="mt-2 grid gap-2">
              {evidenceCapsule.verifier.inputs.reportIds.map((reportId) => (
                <p className="break-all font-mono text-sm text-[#0B0B0B]" key={reportId}>
                  {reportId}
                </p>
              ))}
            </div>
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/evidence"
          >
            Evidence JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Support Bundle</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout label="Bundle" value={supportBundle.bundleId} />
            <Callout label="Artifacts" value={supportBundle.artifacts.reports.length.toString()} />
            <Callout label="Diagnostics" value={supportBundle.summary.activeDiagnostics.toString()} />
          </div>
          <div className="mt-4 border border-[#0B0B0B] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Next Commands
            </div>
            <div className="mt-2 grid gap-2">
              {supportBundle.nextCommands.map((command) => (
                <p className="break-words font-mono text-sm text-[#0B0B0B]" key={command}>
                  {command}
                </p>
              ))}
            </div>
          </div>
          <a
            className="mt-4 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
            href="/api/fakenet/support-bundle"
          >
            Support bundle JSON
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a
            className="ml-3 mt-4 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
            data-markdown-bytes={supportBundleMarkdown.length}
            href="/api/fakenet/support-bundle.md"
          >
            Markdown
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="mb-5 border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Command Kit</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {commandKit.commands.map((command) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={command.id}>
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {command.label}
                </div>
                <p className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">{command.command}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{command.purpose}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border border-[#0B0B0B] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Refresh Sequence
            </div>
            <p className="mt-2 break-words font-mono text-sm text-[#0B0B0B]">
              {commandKit.refreshSequence.join(" && ")}
            </p>
          </div>
          <div className="mt-4 border border-[#0B0B0B] bg-white p-3">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              Shell Runbook
            </div>
            <p className="mt-2 break-all font-mono text-sm text-[#0B0B0B]">
              {commandKit.runbookUrl}
            </p>
            <a
              className="mt-3 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/fakenet/runbook.sh"
            >
              Download runbook
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </article>
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <FileClock size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Reports</h2>
          </div>
          {readiness.reports.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No local fakenet report artifacts were found.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#0B0B0B] text-white">
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
                    <tr className="border-t border-[#0B0B0B] bg-white" key={report.reportId}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{report.appSlug}</span>
                        <span className="mt-1 block break-all font-mono text-xs text-[#0B0B0B]">
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
            className="mt-5 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
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
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <RadioTower size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold capitalize">{value}</div>
    </div>
  );
}

function CheckTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <p className="mt-2 font-mono text-sm uppercase text-[#4A4A4A]">{value}</p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <Terminal size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
