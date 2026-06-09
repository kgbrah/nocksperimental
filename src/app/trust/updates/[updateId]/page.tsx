import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  trustUpdateEntries,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";

export const dynamic = "force-dynamic";

type TrustUpdateDetailPageProps = {
  params: Promise<{
    updateId: string;
  }>;
};

export default async function TrustUpdateDetailPage({
  params
}: TrustUpdateDetailPageProps) {
  const { updateId } = await params;
  const index = trustUpdateEntries.findIndex((candidate) => candidate.id === updateId);
  const entry = trustUpdateEntries[index];

  if (!entry) {
    notFound();
  }

  const validation = validateTrustUpdateChain();
  const previousEntry = trustUpdateEntries[index - 1];
  const nextEntry = trustUpdateEntries[index + 1];
  const verificationHref =
    `/api/trust/updates/verify?updateId=${encodeURIComponent(entry.id)}` +
    `&entryHash=${encodeURIComponent(entry.entryHash)}` +
    `&rootHash=${encodeURIComponent(entry.rootHash)}` +
    `&signature=${encodeURIComponent(entry.signature.signature)}` +
    `&issuerKeyId=${encodeURIComponent(entry.signature.issuerKeyId)}`;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust/updates">
            <ArrowLeft size={16} aria-hidden="true" />
            Update log
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Update Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{entry.target}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {entry.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>#{entry.sequence}</span>
                <span>{entry.action}</span>
                <span>{entry.signature.verificationStatus}</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#0B0B0B] text-white">
              <GitBranch size={28} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={verificationHref}
            >
              Verify Entry
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/updates/${entry.id}`} target="_blank" rel="noreferrer"
            >
              Entry API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/api/trust/updates" target="_blank" rel="noreferrer"
            >
              Chain API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={trustUpdateTargetApiPath(entry)}
            >
              Target API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/openapi.json" target="_blank" rel="noreferrer"
            >
              OpenAPI
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Entry id" value={entry.id} />
            <Callout label="Target path" value={entry.targetPath} />
            <Callout label="Entry hash" value={entry.entryHash} />
            <Callout label="Signature" value={entry.signature.signature} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-10 md:grid-cols-2 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-semibold">Chain Position</h2>
          <div className="mt-4 grid gap-3">
            <Callout label="Previous root" value={entry.previousRoot} />
            <Callout label="Root hash" value={entry.rootHash} />
            <Callout label="Previous update" value={previousEntry?.id ?? "genesis"} />
            <Callout label="Next update" value={nextEntry?.id ?? "latest"} />
          </div>
        </article>
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-semibold">Validation</h2>
          <div className="mt-4 grid gap-3">
            <Callout label="Append-only" value={validation.isAppendOnly ? "valid" : "broken"} />
            <Callout label="Signed entries" value={validation.signedEntryCount.toString()} />
            <Callout label="Valid signatures" value={validation.validSignatureCount.toString()} />
            <Callout label="Broken links" value={validation.brokenLinkCount.toString()} />
          </div>
        </article>
      </section>
    </main>
  );
}

function trustUpdateTargetApiPath(entry: TrustUpdateEntry) {
  if (entry.target === "score-history") {
    return "/api/trust/score-history";
  }

  if (entry.target === "badge-issuance" || entry.target === "badge-revocation") {
    return "/api/trust/badges";
  }

  return "/api/trust";
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
