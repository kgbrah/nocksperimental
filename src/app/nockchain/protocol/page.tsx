import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Code2,
  GitBranch,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainProtocolTrace } from "@/lib/nockchain-protocol-trace";

export const dynamic = "force-dynamic";

const prioritySourceIds = ["protocol-index", "aletheia-014", "status-drift-014"] as const;

export default function NockchainProtocolPage() {
  const trace = createNockchainProtocolTrace();
  const prioritySources = trace.authoritySources.filter((source) =>
    prioritySourceIds.includes(source.id as (typeof prioritySourceIds)[number])
  );
  const remainingSources = trace.authoritySources.filter(
    (source) => !prioritySourceIds.includes(source.id as (typeof prioritySourceIds)[number])
  );

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain">
            <ArrowLeft size={16} aria-hidden="true" />
            Nockchain evidence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Protocol authority
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Protocol</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A protocol-source trace for activation state, consensus-critical
                rules, release-track lineage, and the 014 Aletheia status drift
                that receipts must preserve instead of flattening.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/protocol" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Protocol API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/docs-atlas" target="_blank" rel="noreferrer"
              >
                <BookOpenText size={16} aria-hidden="true" />
                Docs Atlas
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/zorp" target="_blank" rel="noreferrer"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Sources" value={trace.authoritySources.length.toString()} />
        <Metric label="Next" value={trace.releaseTrack.nextScheduled.codename} />
        <Metric label="Consensus" value={trace.releaseTrack.latestConsensusCritical.codename} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Authority Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {prioritySources.map((source) => (
              <SourceCard source={source} key={source.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Release Track</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout
              label="nextScheduled"
              value={`${trace.releaseTrack.nextScheduled.sequence} ${trace.releaseTrack.nextScheduled.codename} ${trace.releaseTrack.nextScheduled.status}`}
            />
            <Callout
              label="latestConsensusCritical"
              value={`${trace.releaseTrack.latestConsensusCritical.sequence} ${trace.releaseTrack.latestConsensusCritical.codename} index=${trace.releaseTrack.latestConsensusCritical.protocolIndexStatus} spec=${trace.releaseTrack.latestConsensusCritical.specFrontmatterStatus}`}
            />
            <Callout
              label="statusDrift"
              value={String(trace.releaseTrack.latestConsensusCritical.statusDrift)}
            />
            <Callout
              label="activationHeight"
              value={trace.releaseTrack.latestConsensusCritical.activationHeight.toString()}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Lifecycle Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="statuses" value={trace.lifecycleContract.statuses.join(", ")} />
            <Callout
              label="activationHeightZero"
              value={trace.lifecycleContract.activationHeightZeroMeaning}
            />
            <Callout label="maintenanceRule" value={trace.lifecycleContract.maintenanceRule} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {trace.lifecycleContract.requiredSections.map((section) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-sm" key={section}>
                {section}
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Fields</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.receiptFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-sm" key={field}>
                {field}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingSources.map((source) => (
              <SourceCard source={source} key={source.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Checklist</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.operatorChecklist.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <Callout label="docsAtlas" value={trace.links.docsAtlas} />
            <Callout label="syncGossipTrace" value={trace.links.syncGossipTrace} />
            <Callout label="zorpMap" value={trace.links.zorpMap} />
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SourceCard({
  source
}: {
  source: ReturnType<typeof createNockchainProtocolTrace>["authoritySources"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{source.id}</p>
      <Callout label="path" value={source.path} />
      <Callout label="authority" value={source.authority} />
      <Callout label="role" value={source.role} />
      <Callout label="evidence" value={source.evidence} />
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
