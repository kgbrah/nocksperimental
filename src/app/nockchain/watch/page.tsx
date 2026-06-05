import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Code2,
  GitBranch,
  ListChecks,
  RadioTower,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainWatchBoard } from "@/lib/nockchain-watch";

export const dynamic = "force-dynamic";

const priorityWatchIds = [
  "libp2p-behind-tip-gossip",
  "state-jam-drive-inventory",
  "zorp-nockapp-archived-update"
] as const;

export default function NockchainWatchPage() {
  const board = createNockchainWatchBoard();
  const priorityItems = priorityWatchIds
    .map((id) => board.watchQueue.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const remainingItems = board.watchQueue.filter(
    (item) => !priorityWatchIds.includes(item.id as (typeof priorityWatchIds)[number])
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
                Upstream monitor
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Watch</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A change-review board for canonical Nockchain commits and releases,
                Zorp lineage repos, state-jam provenance, wallet/API drift, fakenet
                mining symptoms, and Rust workspace ownership.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/watch"
              >
                <Code2 size={16} aria-hidden="true" />
                Watch API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/zorp"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Status" value={board.status} />
        <Metric label="Commit" value={board.observed.nockchain.commit.shortSha} />
        <Metric label="Watch Items" value={board.watchQueue.length.toString()} />
        <Metric label="Cadence" value={board.monitor.interval.replace("FREQ=", "")} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Review Queue</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityItems.map((item) => (
              <WatchCard item={item} key={item.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Pinned vs Observed</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="pinnedCommit" value={board.pinned.nockchain.commit.sha} />
            <Callout label="observedCommit" value={board.observed.nockchain.commit.sha} />
            <Callout label="release" value={board.observed.nockchain.release.tag} />
            <Callout
              label="drift"
              value={`commit=${String(board.drift.commitMatchesPinned)} release=${String(
                board.drift.releaseMatchesPinned
              )} stateJam=${String(board.drift.zorpStateJamFolderClassified)}`}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <BellRing size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Watch Items</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingItems.map((item) => (
              <WatchCard item={item} key={item.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Checklist</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {board.operatorChecklist.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={item}>
                <p className="text-sm leading-6 text-[#4A4A4A]">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Watched Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {board.sources.map((source) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={source.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {source.id}
                </p>
                <Callout label="kind" value={source.kind} />
                <Callout label="url" value={source.url} />
                <Callout label="use" value={source.use} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Zorp Snapshot</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="organization" value={board.observed.zorp.organization} />
            <Callout label="latestOrgUpdateAt" value={board.observed.zorp.latestOrgUpdateAt ?? "unknown"} />
            <Callout label="nockapp" value={JSON.stringify(board.observed.zorp.nockapp)} />
            <Callout label="jock" value={JSON.stringify(board.observed.zorp.jock)} />
            <Callout label="stateJamDrive" value={board.observed.stateJams.driveUrl} />
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

function WatchCard({
  item
}: {
  item: ReturnType<typeof createNockchainWatchBoard>["watchQueue"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{item.id}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="border border-[#0B0B0B] px-2 py-1 font-mono uppercase">{item.domain}</span>
        <span className="border border-[#0B0B0B] bg-[#FFF7D6] px-2 py-1 font-mono uppercase">
          {item.severity}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{item.whyItMatters}</p>
      <Callout label="latestSignal" value={item.latestSignal} />
      <Callout label="reviewTrigger" value={item.reviewTrigger} />
      <Callout label="nocksperimentalAction" value={item.nocksperimentalAction} />
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
