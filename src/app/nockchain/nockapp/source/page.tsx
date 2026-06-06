import {
  ArrowLeft,
  Code2,
  Database,
  ExternalLink,
  Fingerprint,
  GitPullRequest,
  ListChecks,
  Network,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainNockAppSourceTrace } from "@/lib/nockchain-nockapp-source-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "nockapp-runtime",
  "driver-io-action",
  "poke-effect-broadcast",
  "peek-result-boundary",
  "private-grpc-boundary",
  "public-grpc-boundary",
  "event-log-sqlite",
  "pma-regression-suite"
] as const;
const priorityWatchLabel = "PR #119";
const highlightedForbiddenFields = ["rawPmaSlab", "rawEventLog"] as const;
const highlightedForbiddenFieldSet = new Set<string>(highlightedForbiddenFields);

export default function NockchainNockAppSourcePage() {
  const trace = createNockchainNockAppSourceTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor))
    .concat(
      trace.sourceAnchors.filter(
        (anchor) => !priorityAnchorIds.includes(anchor.id as (typeof priorityAnchorIds)[number])
      )
    );
  const orderedForbiddenFields: readonly string[] = [
    ...highlightedForbiddenFields.filter((field) =>
      trace.sourceTraceContract.forbiddenFields.includes(field)
    ),
    ...trace.sourceTraceContract.forbiddenFields.filter(
      (field) => !highlightedForbiddenFieldSet.has(field)
    )
  ];
  const exportStateWatch = trace.pendingWatchItems.find((item) => item.prNumber === 119);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain/nockapp">
            <ArrowLeft size={16} aria-hidden="true" />
            NockApp atlas
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Source-level runtime trace
              </p>
              <h1 className="mt-2 text-4xl font-semibold">NockApp Source Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Exact upstream anchors for NockApp poke, peek, wire, export,
                checkpoint, event-log, gRPC, and PMA regression behavior. It
                treats Zorp repos and the state-jam Drive folder as monitored
                lineage and provenance while current runtime claims stay tied to
                nockchain/nockchain.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/nockapp-source"
              >
                <Code2 size={16} aria-hidden="true" />
                Source API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/nockapp"
              >
                <Network size={16} aria-hidden="true" />
                Runtime Atlas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Source Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Runtime Flow" value={trace.runtimeFlow.length.toString()} />
        <Metric label="Watch Items" value={trace.pendingWatchItems.length.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Anchors</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {anchor.id}
                </p>
                <h3 className="mt-1 font-semibold">{anchor.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {anchor.evidenceBoundary}
                </p>
                <Callout label="file" value={anchor.upstreamFile} />
                <Callout label="symbols" value={anchor.upstreamSymbols.join(", ")} />
                <Callout label="lineRange" value={anchor.lineRange} />
                <Callout label="receiptFields" value={anchor.receiptFields.join(", ")} />
                <a
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                  href={anchor.upstreamUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Upstream source
                </a>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Runtime Flow</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.runtimeFlow.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {step.id}
                </p>
                <h3 className="mt-1 font-semibold">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.interpretation}</p>
                <Callout label="sourceAnchorId" value={step.sourceAnchorId} />
                <Callout label="receiptImplication" value={step.receiptImplication} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Trace Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout
              label="required"
              value={trace.sourceTraceContract.requiredFields.join(", ")}
            />
            <Callout label="forbidden" value={orderedForbiddenFields.join(", ")} />
            {trace.sourceTraceContract.interpretationRules.map((rule) => (
              <Callout key={rule} label="rule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">State And Zorp Context</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {trace.zorpMonitorContext.currentInterpretation}
          </p>
          <div className="mt-4 grid gap-3">
            <Callout
              label="stateJamDrive"
              value={trace.zorpMonitorContext.stateJamDrive.sourceUrl}
            />
            <Callout
              label="artifactPolicy"
              value={trace.zorpMonitorContext.stateJamDrive.artifactPolicy}
            />
            {trace.zorpMonitorContext.monitoredRepositories.map((repo) => (
              <Callout key={repo.fullName} label={repo.fullName} value={`${repo.signal}: ${repo.use}`} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Watch Items</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {exportStateWatch ? (
              <div className="border border-[#0B0B0B] bg-white p-3">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {priorityWatchLabel}
                </p>
                <h3 className="mt-1 font-semibold">{exportStateWatch.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {exportStateWatch.relevance}
                </p>
                <Callout
                  label="targetSurfaces"
                  value={exportStateWatch.targetSurfaces.join(", ")}
                />
              </div>
            ) : null}
            {trace.pendingWatchItems
              .filter((item) => item.prNumber !== 119)
              .map((item) => (
                <Callout
                  key={item.prNumber}
                  label={`PR #${item.prNumber}`}
                  value={`${item.title}: ${item.relevance}`}
                />
              ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Links</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="nockAppAtlas" value={trace.links.nockAppAtlas} />
            <Callout label="rustAtlas" value={trace.links.rustAtlas} />
            <Callout label="zorp" value={trace.links.zorp} />
            <Callout label="stateJams" value={trace.links.stateJams} />
            <Callout label="exportStatePr" value={trace.links.exportStatePr} />
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

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
