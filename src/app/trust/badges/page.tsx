import { ArrowLeft, ArrowUpRight, BadgeCheck, Code2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { badgeEmbedForId, resolvedBadges } from "@/lib/trust-signals";

export default function BadgesPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Verified report badges
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Badges</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Badge records bind a report, snapshot root, invariant packs, and registry
                signature into a shareable trust signal.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/badges" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {resolvedBadges.map((badge) => {
          const embed = badgeEmbedForId(badge.id);

          return (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              id={badge.id}
              key={badge.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-2 py-1 font-mono text-xs uppercase">
                      {badge.currentStatus}
                    </span>
                    <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                      {badge.kind}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{badge.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {badge.reportSlug} / {badge.fixtureId}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="grid size-12 place-items-center bg-[#0B0B0B] text-white">
                    <BadgeCheck size={22} aria-hidden="true" />
                  </div>
                  <Link
                    className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-3 py-2 text-sm font-medium text-[#0B0B0B]"
                    href={`/trust/badges/${badge.id}`}
                  >
                    Open Detail
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Callout label="Report hash" value={badge.evidence.reportHash} />
                <Callout label="Snapshot root" value={badge.evidence.snapshotRoot} />
                <Callout label="Signature" value={badge.evidence.signature} />
              </div>

              {badge.issuance ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <Callout label="Issuance digest" value={badge.issuance.payloadDigest} />
                  <Callout label="Issuer key" value={badge.issuance.issuerKeyId} />
                  <Callout
                    label="Issuance verification"
                    value={`${badge.issuance.verification.status} / ${badge.issuance.verification.algorithm}`}
                  />
                  <Callout label="Issuance signature" value={badge.issuance.signature} />
                </div>
              ) : null}

              {badge.revocation ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <Callout label="Revoked at" value={badge.revocation.revokedAt} />
                  <Callout label="Revocation reason" value={badge.revocation.reason} />
                  <Callout
                    label="Replacement badge"
                    value={badge.revocation.replacementBadgeId ?? "none"}
                  />
                  <Callout label="Revocation signature" value={badge.revocation.evidence.signature} />
                </div>
              ) : null}

              {embed ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <Callout label="Verification URL" value={embed.verificationUrl} />
                  <Callout label="Badge API" value={embed.apiUrl} />
                  <Callout label="HTML Embed" value={embed.htmlSnippet} />
                  <Callout label="Markdown Embed" value={embed.markdownSnippet} />
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
