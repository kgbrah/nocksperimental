import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  FileCheck2,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createVerificationIndex } from "@/lib/verification-index";

export const dynamic = "force-dynamic";

export default function VerifyPage() {
  const verification = createVerificationIndex();
  const badgeSample = verification.samples.badgeIssuance;
  const reportSample = verification.samples.generatedReport;
  const fakenetSample = verification.samples.localFakenetEvidence;
  const workspaceSample = verification.samples.workspaceEvidence;
  const uploadTokenSample = verification.samples.workspaceUploadToken;
  const updateSample = verification.samples.trustUpdate;
  const checkpointSample = verification.samples.registryCheckpoint;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Public evidence checks
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Verification</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {verification.verifierCount} verifier endpoints for badge issuance, generated
                report evidence, local fakenet evidence, workspace evidence, signed workspace
                upload tokens, signed trust updates, and registry checkpoint roots.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/verify" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Verifiers" value={verification.verifierCount.toString()} />
        <Metric label="Badges" value={verification.counts.badges.toString()} />
        <Metric label="Reports" value={verification.counts.generatedReports.toString()} />
        <Metric label="Updates" value={verification.counts.trustUpdates.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-8 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {verification.verifiers.map((verifier) => (
          <a
            className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
            href={verifier.path}
            key={verifier.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-9 place-items-center bg-[#0B0B0B] text-white">
                <ShieldCheck size={17} aria-hidden="true" />
              </div>
              <ArrowUpRight size={16} aria-hidden="true" />
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
              {verifier.id}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{verifier.description}</h2>
            <p className="mt-3 break-all font-mono text-xs leading-5 text-[#4A4A4A]">
              {verifier.path}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {verifier.queryParameters.length === 0 ? (
                <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-2 py-1 font-mono text-xs uppercase">
                  no query
                </span>
              ) : (
                verifier.queryParameters.map((parameter) => (
                  <span
                    className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs"
                    key={`${verifier.id}-${parameter}`}
                  >
                    {parameter}
                  </span>
                ))
              )}
            </div>
          </a>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SamplePanel
            icon="badge"
            label="Badge issuance"
            title={badgeSample?.badgeId ?? "No public badge sample"}
            url={badgeSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="report"
            label="Generated report"
            title={reportSample?.appSlug ?? "No generated report sample"}
            url={reportSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="fakenet"
            label="Local fakenet"
            title={fakenetSample?.status ?? "No fakenet evidence sample"}
            url={fakenetSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="workspace"
            label="Workspace evidence"
            title={workspaceSample?.workspaceSlug ?? "No workspace evidence sample"}
            url={workspaceSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="token"
            label="Upload token"
            title={uploadTokenSample?.workspaceSlug ?? "No upload token sample"}
            url={uploadTokenSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="update"
            label="Trust update"
            title={updateSample?.updateId ?? "No trust update sample"}
            url={updateSample?.url ?? verification.links.registry}
          />
          <SamplePanel
            icon="checkpoint"
            label="Registry checkpoint"
            title={`${checkpointSample.counts.trustUpdates} signed updates`}
            url={checkpointSample.url}
          />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <Fingerprint size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SamplePanel({
  icon,
  label,
  title,
  url
}: {
  icon: "badge" | "report" | "fakenet" | "workspace" | "token" | "update" | "checkpoint";
  label: string;
  title: string;
  url: string;
}) {
  const Icon =
    icon === "badge"
      ? BadgeCheck
      : icon === "report"
        ? FileCheck2
        : icon === "fakenet"
        ? Fingerprint
        : icon === "workspace"
          ? LockKeyhole
          : icon === "token"
            ? KeyRound
            : icon === "update"
              ? GitBranch
              : ShieldCheck;

  return (
    <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center gap-2">
        <Icon size={18} aria-hidden="true" />
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
          {label}
        </p>
      </div>
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      <p className="mt-3 break-all border border-[#0B0B0B] bg-white p-3 font-mono text-xs leading-5 text-[#4A4A4A]">
        {url}
      </p>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
        href={toSameOriginHref(url)}
      >
        Open
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    </article>
  );
}

function toSameOriginHref(url: string) {
  try {
    const parsed = new URL(url);

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
