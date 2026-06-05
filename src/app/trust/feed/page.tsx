import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  Fingerprint,
  GitBranch,
  RadioTower,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createTrustEventFeed } from "@/lib/trust-event-feed";

export const dynamic = "force-dynamic";

export default function TrustFeedPage() {
  const feed = createTrustEventFeed();

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Chronological public evidence
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Trust Feed</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {feed.eventCount} registry, badge, revocation, and local fakenet evidence events
                from {feed.source}. The feed keeps current local fakenet evidence alongside the
                signed trust registry history.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{feed.counts.registryUpdates} registry updates</span>
                <span>{feed.counts.badgeIssuances} badge issuances</span>
                <span>{feed.counts.localFakenetEvidence} Local fakenet evidence</span>
              </div>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/feed"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Events" value={feed.eventCount.toString()} />
        <Metric label="Append-only" value={feed.chain.isAppendOnly ? "valid" : "broken"} />
        <Metric label="Badge events" value={(feed.counts.badgeIssuances + feed.counts.badgeRevocations).toString()} />
        <Metric label="Fakenet evidence" value={feed.counts.localFakenetEvidence.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-10 lg:px-8">
        {feed.events.map((event) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={event.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                    {formatEventType(event.type)}
                  </span>
                  <span className="border border-[#242424] bg-white px-2 py-1 font-mono text-xs uppercase">
                    {event.recordedAt}
                  </span>
                </div>
                <h2 className="mt-2 break-all text-2xl font-semibold">{event.subjectId}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">{event.summary}</p>
              </div>
              <div className="grid size-12 shrink-0 place-items-center bg-[#171717] text-white">
                <EventIcon type={event.type} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <EvidenceMetric label="Event id" value={event.id} />
              <EvidenceMetric label="Source URL" value={event.url} href={toSameOriginHref(event.url)} />
              <EvidenceMetric label="Root hash" value={event.evidence.rootHash} />
              <EvidenceMetric label="Entry hash" value={event.evidence.entryHash} />
              <EvidenceMetric label="Payload digest" value={event.evidence.payloadDigest} />
              <EvidenceMetric label="Signature" value={event.evidence.signature} />
              <EvidenceMetric label="Report hash" value={event.evidence.reportHash} />
              <EvidenceMetric label="Snapshot root" value={event.evidence.snapshotRoot} />
              <EvidenceMetric label="Verification" value={event.evidence.verificationStatus} />
              <EvidenceMetric
                label="Reports"
                value={
                  typeof event.evidence.reportCount === "number"
                    ? event.evidence.reportCount.toString()
                    : undefined
                }
              />
              <EvidenceMetric label="Endpoint" value={event.evidence.endpoint ?? undefined} />
              <EvidenceMetric label="Wallet" value={event.evidence.walletAddress ?? undefined} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <Fingerprint size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EvidenceMetric({ label, value, href }: { label: string; value?: string; href?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      {href ? (
        <a
          className="mt-2 inline-flex max-w-full items-center gap-2 break-all font-mono text-xs leading-6 text-[#3f3f38] underline decoration-[#8b8b7a] underline-offset-4"
          href={href}
        >
          {value}
          <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ) : (
        <p className="mt-2 break-all font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
      )}
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === "badge-issuance" || type === "badge-revocation") {
    return <BadgeCheck size={22} aria-hidden="true" />;
  }

  if (type === "local-fakenet-evidence") {
    return <RadioTower size={22} aria-hidden="true" />;
  }

  return <GitBranch size={22} aria-hidden="true" />;
}

function formatEventType(type: string) {
  if (type === "local-fakenet-evidence") {
    return "Local fakenet evidence";
  }

  return type.replaceAll("-", " ");
}

function toSameOriginHref(url: string) {
  try {
    const parsed = new URL(url);

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
