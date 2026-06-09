import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  FileCheck2,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createBadgeEmbedBundle } from "@/lib/trust-badge-embed";
import { createBadgeVerificationBundle } from "@/lib/trust-badge-verification";

export const dynamic = "force-dynamic";

type BadgeDetailPageProps = {
  params: Promise<{
    badgeId: string;
  }>;
};

export default async function BadgeDetailPage({ params }: BadgeDetailPageProps) {
  const { badgeId } = await params;
  const bundle = createBadgeVerificationBundle(badgeId);

  if (!bundle) {
    notFound();
  }

  const embedResult = createBadgeEmbedBundle(badgeId);
  const embedBundle = embedResult.status === "embeddable" ? embedResult.bundle : null;
  const verificationHref = bundle.issuance
    ? `/api/trust/badges/verify?badgeId=${encodeURIComponent(bundle.badgeId)}&payloadDigest=${encodeURIComponent(bundle.issuance.payloadDigest)}&signature=${encodeURIComponent(bundle.issuance.signature)}&issuerKeyId=${encodeURIComponent(bundle.issuance.issuerKeyId)}`
    : `/api/trust/badges/verify?badgeId=${encodeURIComponent(bundle.badgeId)}`;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust/badges">
            <ArrowLeft size={16} aria-hidden="true" />
            Badges
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Badge Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{bundle.badge.label}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {bundle.badge.reportSlug} / {bundle.badge.fixtureId} is currently{" "}
                {bundle.currentStatus}. The public verification bundle binds the report hash,
                snapshot root, issuance receipt, and registry signature for this badge.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{bundle.badge.kind}</span>
                <span>{bundle.currentStatus}</span>
                <span>{bundle.issuance?.verification.status ?? "unchecked"} issuance</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href={`/api/trust/badges/${badgeId}`} target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                JSON
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href={`/api/trust/badges/${badgeId}/verification`} target="_blank" rel="noreferrer"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Verification
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href={`/api/trust/badges/${badgeId}/embed`} target="_blank" rel="noreferrer"
              >
                <BadgeCheck size={16} aria-hidden="true" />
                Embed
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Status" value={bundle.currentStatus} />
        <Metric label="Revoked" value={bundle.isRevoked ? "yes" : "no"} />
        <Metric label="Issuance" value={bundle.issuance?.verification.status ?? "missing"} />
        <Metric label="Embeddable" value={embedBundle ? "yes" : "no"} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/badges/${badgeId}`} target="_blank" rel="noreferrer"
            >
              Badge API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/badges/${badgeId}/verification`} target="_blank" rel="noreferrer"
            >
              Verification Bundle
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/badges/${badgeId}/embed`} target="_blank" rel="noreferrer"
            >
              Embed Bundle
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={verificationHref} target="_blank" rel="noreferrer"
            >
              Verify Issuance
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Report hash" value={bundle.evidence.reportHash} />
            <Callout label="Snapshot root" value={bundle.evidence.snapshotRoot} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Badge id" value={bundle.badgeId} />
            <Callout label="Issuer" value={bundle.badge.issuer} />
            <Callout label="Issued at" value={bundle.badge.issuedAt} />
            <Callout label="Expires at" value={bundle.badge.expiresAt} />
            <Callout label="Signature" value={bundle.evidence.signature} />
            <Callout label="Invariant packs" value={bundle.evidence.invariantPacks.join(", ")} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Issuance Receipt</h2>
          </div>
          {bundle.issuance ? (
            <div className="mt-4 grid gap-3">
              <Callout label="Payload digest" value={bundle.issuance.payloadDigest} />
              <Callout label="Issuer key" value={bundle.issuance.issuerKeyId} />
              <Callout label="Verification" value={bundle.issuance.verification.status} />
              <Callout label="Algorithm" value={bundle.issuance.verification.algorithm} />
              <Callout label="Signature" value={bundle.issuance.signature} />
            </div>
          ) : (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No issuance receipt is available for this badge.
            </p>
          )}
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Embed Bundle</h2>
          </div>
          {embedBundle ? (
            <div className="mt-4 grid gap-3">
              <Callout label="HTML Embed" value={embedBundle?.embed.htmlSnippet ?? "none"} />
              <Callout label="Markdown Embed" value={embedBundle?.embed.markdownSnippet ?? "none"} />
              <Callout label="Report provenance" value={embedBundle.links.reportProvenance} />
            </div>
          ) : (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              This badge is not publicly embeddable in its current status.
            </p>
          )}
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Revocation State</h2>
          </div>
          {bundle.revocation ? (
            <div className="mt-4 grid gap-3">
              <Callout label="Revoked at" value={bundle.revocation.revokedAt} />
              <Callout label="Revoked by" value={bundle.revocation.revokedBy} />
              <Callout label="Reason" value={bundle.revocation.reason} />
              <Callout
                label="Replacement"
                value={bundle.replacement?.badgeId ?? bundle.revocation.replacementBadgeId ?? "none"}
              />
            </div>
          ) : (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No revocation record is present for this badge.
            </p>
          )}
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
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
