import {
  ArrowLeft,
  Code2,
  Database,
  GitPullRequest,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainRuntimeSafetyTrace } from "@/lib/nockchain-runtime-safety";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "nockstack-frame-bounds",
  "nockstack-frame-lifecycle",
  "interpreter-stack-frame-preserve",
  "cue-stack-deserialization",
  "rub-backref-bounds",
  "jam-traversal-bounds",
  "noun-space-provenance",
  "hamt-fixed-depth-preserve",
  "pma-direct-reader-bounds"
] as const;
const highlightedClassIds = [
  "stack-frame-pointer-outside-arena",
  "jam-cue-malformed-input",
  "p2p-jam-empty-buffer",
  "height-bound-worker-panic",
  "noun-space-stale-epoch"
] as const;
const highlightedSymbols = [
  "NockStack::is_in_frame",
  "NockStack::frame_push",
  "Context::with_stack_frame",
  "cue_bitslice_with_mode",
  "rub_backref",
  "NounSpace::with_brand",
  "PmaDirectReader::read_u64"
] as const;
const highlightedReceiptFields = [
  "runtimeSafetyIssue",
  "stackFrameCheck",
  "cueValidationError",
  "pmaOffsetBoundsCheck",
  "supportBundleTraceId"
] as const;
const highlightedForbiddenFields = ["rawJamPayload", "rawPmaSlab", "rawStackMemory"] as const;
const highlightedVerificationCommands = ["cargo check -p nockvm"] as const;

export default function NockchainRuntimeSafetyPage() {
  const trace = createNockchainRuntimeSafetyTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const orderedClasses = highlightedClassIds
    .map((id) => trace.runtimeSafetyClasses.find((safetyClass) => safetyClass.id === id))
    .filter((safetyClass): safetyClass is NonNullable<typeof safetyClass> => Boolean(safetyClass));

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
                NockVM source safety
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Runtime Safety Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Source anchors for NockStack frame bounds, jam/cue decode behavior, noun-space
                provenance, HAMT traversal limits, and PMA direct-reader offset checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/runtime-safety"
              >
                <Code2 size={16} aria-hidden="true" />
                Runtime API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/rust/source"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Rust Source
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pma"
              >
                <Database size={16} aria-hidden="true" />
                PMA Trace
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/pr-radar"
              >
                <GitPullRequest size={16} aria-hidden="true" />
                PR Radar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Classes" value={trace.runtimeSafetyClasses.length.toString()} />
        <Metric label="Crate" value={trace.upstream.crateSurfaces.join(", ")} />
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
                <Callout label="file" value={anchor.file} />
                <Callout label="symbols" value={anchor.symbols.join(", ")} />
                <Callout label="lineRange" value={anchor.lineRange} />
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.evidence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Runtime Safety Classes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedClasses.map((safetyClass) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={safetyClass.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {safetyClass.id}
                </p>
                <h3 className="mt-1 font-semibold">{safetyClass.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{safetyClass.symptom}</p>
                <Callout label="sourceAnchorIds" value={safetyClass.sourceAnchorIds.join(", ")} />
                <Callout label="receiptFields" value={safetyClass.receiptFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.receiptContract.requiredFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={field}>
                {field}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {highlightedReceiptFields.map((field) => (
              <Callout key={field} label="highlightedField" value={field} />
            ))}
            {trace.receiptContract.reviewRules.map((rule) => (
              <Callout key={rule} label="reviewRule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Triage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.operatorTriage.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={item.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {item.id}
                </p>
                <h3 className="mt-1 font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{item.action}</p>
                <Callout label="checks" value={item.checks.join(", ")} />
                <Callout label="classIds" value={item.classIds.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Local Verification</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="status" value={trace.localVerification.status} />
            <Callout label="inspectedSourceCommit" value={trace.localVerification.inspectedSourceCommit} />
            {highlightedVerificationCommands.map((command) => (
              <Callout key={command} label="highlightedCommand" value={command} />
            ))}
            {trace.localVerification.recommendedCommands.map((command) => (
              <Callout key={command} label="command" value={command} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Forbidden Evidence</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.receiptContract.forbiddenFields.map((field) => (
              <Callout key={field} label="forbiddenField" value={field} />
            ))}
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label="highlightedForbidden" value={field} />
            ))}
            {highlightedSymbols.map((symbol) => (
              <Callout key={symbol} label="symbol" value={symbol} />
            ))}
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
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
