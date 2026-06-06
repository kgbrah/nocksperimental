import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Database,
  FileWarning,
  GitBranch,
  ListChecks,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainPmaSourceTrace } from "@/lib/nockchain-pma-source-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "pma-metadata-trailer",
  "pma-open-growth-recovery",
  "snapshot-verify-ready",
  "snapshot-create-ready",
  "event-log-replay-boundary",
  "kernel-event-log-restore"
] as const;
const highlightedSymbols = [
  "Pma::read_file_metadata",
  "Pma::open_with_min",
  "verify_snapshot",
  "create_ready_snapshot",
  "EventLog::replay_events_after",
  "snapshot_source_pma_fdatasync"
] as const;
const highlightedReceiptFields = [
  "pmaMetadataVersion",
  "snapshotUsedBlake3",
  "eventLogMaxEventNum"
] as const;
const highlightedForbiddenFields = ["rawPmaSlab", "rawEventLogSqlite"] as const;

export default function NockchainPmaSourcePage() {
  const trace = createNockchainPmaSourceTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor))
    .concat(trace.sourceAnchors.filter((anchor) => !priorityAnchorIds.includes(anchor.id)));

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
                Source-level PMA durability
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain PMA Source Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Rust source anchors for PMA metadata trailers, dynamic growth recovery,
                verified snapshots, SQLite event-log replay, and the receipt-safe
                fields Nocksperimental can publish without redistributing raw state.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/pma"
              >
                <Code2 size={16} aria-hidden="true" />
                PMA API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/state-jams"
              >
                <Database size={16} aria-hidden="true" />
                State Jams
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/rust/source"
              >
                <GitBranch size={16} aria-hidden="true" />
                Rust Source
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/runtime-safety"
              >
                <ShieldAlert size={16} aria-hidden="true" />
                Runtime Safety
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/nockapp/source"
              >
                <FileWarning size={16} aria-hidden="true" />
                NockApp Source
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Flow Steps" value={trace.durabilityFlow.length.toString()} />
        <Metric label="Crates" value={trace.upstream.crateSurfaces.join(", ")} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Durability Flow</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.durabilityFlow.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {step.id}
                </p>
                <h3 className="mt-1 font-semibold">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.evidence}</p>
                <Callout label="sourceAnchorIds" value={step.sourceAnchorIds.join(", ")} />
                <Callout label="receiptFields" value={step.receiptFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Snapshot Verification</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {trace.snapshotVerification.interpretation}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.snapshotVerification.requiredChecks.map((check) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={check}>
                {check}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {highlightedSymbols.map((symbol) => (
              <Callout key={symbol} label="symbol" value={symbol} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
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

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Event Log Contract</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
            {trace.eventLogContract.interpretation}
          </p>
          <div className="mt-4 grid gap-3">
            {trace.eventLogContract.sqliteFiles.map((file) => (
              <Callout key={file} label="sqliteFile" value={file} />
            ))}
            {trace.eventLogContract.replayGuards.map((guard) => (
              <Callout key={guard} label="replayGuard" value={guard} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
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
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Guards</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.operatorGuards.map((guard) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={guard}>
                {guard}
              </div>
            ))}
            {trace.receiptContract.forbiddenFields.map((field) => (
              <Callout key={field} label="forbiddenField" value={field} />
            ))}
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label="highlightedForbidden" value={field} />
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
