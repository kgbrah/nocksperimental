import {
  ArrowLeft,
  BellRing,
  Code2,
  GitPullRequest,
  Layers3,
  ListChecks,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { createNockchainImpactQueue } from "@/lib/nockchain-impact-queue";

export const dynamic = "force-dynamic";

const priorityImpactIds = [
  "bridge-withdrawal-release",
  "pma-state-jam-provenance",
  "nockup-template-manifests",
  "wallet-blob-memo",
  "nockapp-export-state",
  "fakenet-sync-gossip",
  "nockchain-benchmarking",
  "zorp-jock-authoring"
] as const;
const highlightedForbiddenFields = ["rawPmaSlab", "rawStateJam", "walletSeedPhrase", "privateSpendKey"] as const;
const highlightedBenchmarkSourceIds = ["repo:zorp-corp/knock", "repo:zorp-corp/sppark"] as const;
const highlightedBenchmarkSourceUrls = [
  "https://github.com/zorp-corp/knock/blob/master/README.md",
  "https://github.com/zorp-corp/sppark/blob/main/README.md"
] as const;

export default function NockchainImpactPage() {
  const queue = createNockchainImpactQueue();
  const priorityItems = priorityImpactIds
    .map((id) => queue.impactItems.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const remainingItems = queue.impactItems.filter(
    (item) => !priorityImpactIds.includes(item.id as (typeof priorityImpactIds)[number])
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
                Upstream action intake
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Impact Queue</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Current Nockchain releases, open PRs, Zorp lineage, and state-jam
                provenance translated into the next Nocksperimental receipt, test,
                and operator-runbook changes to review.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/impact" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Impact API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/watch"
              >
                <BellRing size={16} aria-hidden="true" />
                Watch
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
        <Metric label="Impact Items" value={queue.snapshot.totalItems.toString()} />
        <Metric label="Immediate" value={queue.snapshot.immediateCount.toString()} />
        <Metric label="High" value={queue.snapshot.highCount.toString()} />
        <Metric label="Watch" value={queue.snapshot.watchStatus} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Layers3 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Action Lanes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {queue.actionLanes.map((lane) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={lane.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.12em]">{lane.id}</p>
                  <span className="border border-[#0B0B0B] bg-[#DDF4FF] px-2 py-1 font-mono text-xs uppercase">
                    {lane.escalation}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold">{lane.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{lane.impactItemIds.join(" / ")}</p>
                <Callout label="verificationGates" value={lane.verificationGates.join(" && ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-white p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Queue Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="required" value={queue.queueContract.requiredFields.join(", ")} />
            <Callout label="forbidden" value={queue.queueContract.forbiddenFields.join(", ")} />
            <Callout label="benchmarkSourceIds" value={highlightedBenchmarkSourceIds.join(", ")} />
            <Callout label="benchmarkSourceUrls" value={highlightedBenchmarkSourceUrls.join(", ")} />
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label={field} value="Forbidden in public receipts and registries." />
            ))}
            {queue.queueContract.reviewRules.map((rule) => (
              <Callout key={rule} label="rule" value={rule} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-8 lg:px-8">
        <div className="flex items-center gap-2">
          <ListChecks size={18} aria-hidden="true" />
          <h2 className="text-xl font-semibold">Impact Items</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...priorityItems, ...remainingItems].map((item) => (
            <ImpactCard item={item} key={item.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ImpactCard({
  item
}: {
  item: ReturnType<typeof createNockchainImpactQueue>["impactItems"][number];
}) {
  return (
    <article className="border border-[#0B0B0B] bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <span className="border border-[#0B0B0B] bg-[#F4F4F4] px-2 py-1 font-mono text-xs uppercase">
          {item.id}
        </span>
        <span className="border border-[#0B0B0B] bg-[#FFF7D6] px-2 py-1 font-mono text-xs uppercase">
          {item.priority}
        </span>
        <span className="border border-[#0B0B0B] bg-[#DDF4FF] px-2 py-1 font-mono text-xs uppercase">
          {item.sourceType}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{item.label}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{item.whyItMatters}</p>
      <Callout label="sourceIds" value={item.sourceIds.join(", ")} />
      <Callout label="sourceUrls" value={item.sourceUrls.join(", ")} />
      <Callout label="upstreamSignal" value={item.upstreamSignal} />
      <Callout label="nocksperimentalAction" value={item.nocksperimentalAction} />
      <Callout label="receiptFields" value={item.receiptFields.join(", ")} />
      <Callout label="targetSurfaces" value={item.targetSurfaces.join(", ")} />
      <Callout label="verificationGates" value={item.verificationGates.join(" && ")} />
      <Callout label="forbiddenFields" value={item.forbiddenFields.join(", ")} />
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-4 shadow-[3px_3px_0_#0B0B0B]">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border-l-2 border-[#0B0B0B] pl-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#0B0B0B]">{value}</p>
    </div>
  );
}
